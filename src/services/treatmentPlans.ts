import { supabase } from '@/lib/supabase';
import { getClinicContext } from './clinicContext';

/**
 * A discount rule maps a set of treatment types to a percentage off, optionally
 * capped at a number of uses over the plan period (e.g. "50% off 1 urgência/year").
 */
export interface TreatmentPlanDiscountRule {
  id: string;
  label: string;
  treatments: string[];
  percent: number;
  max_uses: number | null;
}

export interface TreatmentPlan {
  id: string;
  clinic_id: string;
  name: string;
  subtitle: string | null;
  duration_months: number;
  /** Subscription price (membership fee). */
  price: number;
  /** Number of included consultations (consumable balance). */
  included_consultations: number;
  /** Treatment names that count against the included-consultations balance. */
  included_consultation_treatments: string[];
  discount_rules: TreatmentPlanDiscountRule[];
  perks: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type TreatmentPlanInput = {
  name: string;
  subtitle: string | null;
  duration_months: number;
  price: number;
  included_consultations: number;
  included_consultation_treatments: string[];
  discount_rules: TreatmentPlanDiscountRule[];
  perks: string[];
};

/** Normalize a raw DB row (jsonb columns come back as parsed values or null). */
function normalize(row: any): TreatmentPlan {
  return {
    id: row.id,
    clinic_id: row.clinic_id,
    name: row.name,
    subtitle: row.subtitle ?? null,
    duration_months: row.duration_months ?? 12,
    price: row.price ?? 0,
    included_consultations: row.included_consultations ?? 0,
    included_consultation_treatments: Array.isArray(row.included_consultation_treatments)
      ? row.included_consultation_treatments
      : [],
    discount_rules: Array.isArray(row.discount_rules) ? row.discount_rules : [],
    perks: Array.isArray(row.perks) ? row.perks : [],
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const treatmentPlansService = {
  async getAll(): Promise<TreatmentPlan[]> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await (supabase
      .from('clinic_treatment_plans') as any)
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(normalize);
  },

  async create(input: TreatmentPlanInput): Promise<TreatmentPlan> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await (supabase
      .from('clinic_treatment_plans') as any)
      .insert({ ...input, clinic_id: clinicId })
      .select()
      .single();

    if (error) throw error;
    return normalize(data);
  },

  async update(id: string, input: TreatmentPlanInput): Promise<TreatmentPlan> {
    const { clinicId } = await getClinicContext();
    const { data, error } = await (supabase
      .from('clinic_treatment_plans') as any)
      .update(input)
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select()
      .single();

    if (error) throw error;
    return normalize(data);
  },

  async delete(id: string): Promise<void> {
    const { clinicId } = await getClinicContext();
    const { error } = await (supabase
      .from('clinic_treatment_plans') as any)
      .update({ is_active: false })
      .eq('id', id)
      .eq('clinic_id', clinicId);

    if (error) throw error;
  },
};
