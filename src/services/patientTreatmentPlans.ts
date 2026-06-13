import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';
import { budgetsService } from './budgets';
import { getShortToothId } from '@/utils/budgetUtils';
import type { TreatmentPlan, TreatmentPlanDiscountRule } from './treatmentPlans';

/** Pseudo-tooth label used for the membership-fee budget line. */
export const PLAN_FEE_TOOTH = 'Plano de Assinatura';

export type PatientTreatmentPlanStatus = 'active' | 'expired' | 'cancelled';

/** Frozen copy of the plan terms at enrollment time. */
export interface TreatmentPlanSnapshot {
  name: string;
  subtitle: string | null;
  duration_months: number;
  price: number;
  included_consultations: number;
  included_consultation_treatments: string[];
  discount_rules: TreatmentPlanDiscountRule[];
  perks: string[];
}

export interface PatientTreatmentPlan {
  id: string;
  clinic_id: string;
  patient_id: string;
  plan_id: string | null;
  plan_snapshot: TreatmentPlanSnapshot;
  start_date: string;
  end_date: string;
  status: PatientTreatmentPlanStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function snapshotFromPlan(plan: TreatmentPlan): TreatmentPlanSnapshot {
  return {
    name: plan.name,
    subtitle: plan.subtitle,
    duration_months: plan.duration_months,
    price: plan.price,
    included_consultations: plan.included_consultations,
    included_consultation_treatments: plan.included_consultation_treatments,
    discount_rules: plan.discount_rules,
    perks: plan.perks,
  };
}

/** Add `months` to an ISO date (YYYY-MM-DD), returning a new ISO date. */
function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCMonth(base.getUTCMonth() + months);
  return base.toISOString().slice(0, 10);
}

function normalize(row: any): PatientTreatmentPlan {
  const snap = row.plan_snapshot || {};
  return {
    id: row.id,
    clinic_id: row.clinic_id,
    patient_id: row.patient_id,
    plan_id: row.plan_id ?? null,
    plan_snapshot: {
      name: snap.name ?? '',
      subtitle: snap.subtitle ?? null,
      duration_months: snap.duration_months ?? 12,
      price: snap.price ?? 0,
      included_consultations: snap.included_consultations ?? 0,
      included_consultation_treatments: Array.isArray(snap.included_consultation_treatments)
        ? snap.included_consultation_treatments
        : [],
      discount_rules: Array.isArray(snap.discount_rules) ? snap.discount_rules : [],
      perks: Array.isArray(snap.perks) ? snap.perks : [],
    },
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    notes: row.notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Create a single-line budget representing the membership fee. */
async function generatePlanFeeBudget(
  patientId: string,
  subscription: PatientTreatmentPlan,
  price: number,
  startDate: string
): Promise<void> {
  const label = `Plano ${subscription.plan_snapshot.name}`;
  const priceCents = Math.round(price * 100);

  // Approved so it lands directly in the payments queue (revenue to receive),
  // where the dentist chooses the payment method.
  const tooth = {
    tooth: PLAN_FEE_TOOTH,
    faces: [] as string[],
    treatments: [label],
    values: { [label]: String(priceCents) },
    status: 'approved' as const,
  };

  const notes = JSON.stringify({
    teeth: [tooth],
    treatmentPlanFee: { subscriptionId: subscription.id, planName: subscription.plan_snapshot.name },
  });

  await budgetsService.create(
    {
      patient_id: patientId,
      date: startDate,
      treatment: label,
      value: price,
      notes,
      status: 'approved',
    } as any,
    [{ tooth: getShortToothId(PLAN_FEE_TOOTH), faces: [] }]
  );
}

export const patientTreatmentPlansService = {
  /** All subscriptions for a patient (most recent first). */
  async getByPatient(patientId: string): Promise<PatientTreatmentPlan[]> {
    const { data, error } = await (supabase
      .from('patient_treatment_plans') as any)
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(normalize);
  },

  /** The patient's current active subscription, or null. */
  async getActive(patientId: string): Promise<PatientTreatmentPlan | null> {
    const { data, error } = await (supabase
      .from('patient_treatment_plans') as any)
      .select('*')
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) throw error;
    return data ? normalize(data) : null;
  },

  /** All active subscriptions across the clinic (for the alerts page). */
  async getActiveForClinic(): Promise<PatientTreatmentPlan[]> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await (supabase
      .from('patient_treatment_plans') as any)
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'active')
      .order('end_date', { ascending: true });
    if (error) throw error;
    return (data || []).map(normalize);
  },

  /** Enroll a patient in a plan. Cancels any existing active subscription first. */
  async enroll(patientId: string, plan: TreatmentPlan, startDate?: string): Promise<PatientTreatmentPlan> {
    const { clinicId, userId } = await getClinicContext();

    // Enforce single active subscription: cancel the current one if present.
    await (supabase.from('patient_treatment_plans') as any)
      .update({ status: 'cancelled' })
      .eq('patient_id', patientId)
      .eq('status', 'active');

    const start = startDate || new Date().toISOString().slice(0, 10);
    const end = addMonths(start, plan.duration_months);

    const { data, error } = await (supabase.from('patient_treatment_plans') as any)
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        plan_id: plan.id,
        plan_snapshot: snapshotFromPlan(plan),
        start_date: start,
        end_date: end,
        status: 'active',
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    const subscription = normalize(data);

    // Generate a budget for the membership fee so it can be approved and paid.
    if (plan.price > 0) {
      try {
        await generatePlanFeeBudget(patientId, subscription, plan.price, start);
      } catch (e) {
        // Subscription is already created; surface the budget failure without rolling back.
        console.error('Failed to generate plan fee budget:', e);
      }
    }

    return subscription;
  },

  async cancel(id: string): Promise<void> {
    const { error } = await (supabase.from('patient_treatment_plans') as any)
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) throw error;
  },
};
