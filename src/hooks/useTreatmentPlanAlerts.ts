import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { patientTreatmentPlansService, type PatientTreatmentPlan } from '@/services/patientTreatmentPlans';
import { computeUsage, type TreatmentPlanUsage } from './usePatientTreatmentPlan';
import type { ToothEntry } from '@/utils/budgetUtils';

export interface TreatmentPlanAlert {
  subscription: PatientTreatmentPlan;
  patientName: string;
  phone: string | null;
  usage: TreatmentPlanUsage;
  daysToExpiry: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Active treatment-plan subscriptions across the clinic, enriched with patient
 * name and remaining-consultation balance, sorted by soonest expiry.
 */
export function useActiveTreatmentPlanAlerts() {
  return useQuery({
    queryKey: ['treatment-plan-alerts'],
    queryFn: async (): Promise<TreatmentPlanAlert[]> => {
      const subscriptions = await patientTreatmentPlansService.getActiveForClinic();
      if (subscriptions.length === 0) return [];

      const patientIds = [...new Set(subscriptions.map(s => s.patient_id))];

      const [{ data: patients }, { data: procedures }, { data: budgets }] = await Promise.all([
        supabase.from('patients').select('id, name, phone').in('id', patientIds),
        (supabase.from('procedures') as any)
          .select('patient_id, date, budget_links')
          .in('patient_id', patientIds)
          .is('deleted_at', null),
        supabase.from('budgets').select('id, patient_id, notes').in('patient_id', patientIds),
      ]);

      const patientMap = new Map((patients || []).map((p: any) => [p.id, p]));

      // Build a global budgetId:toothIndex -> treatments map.
      const itemTreatments = new Map<string, string[]>();
      for (const budget of budgets || []) {
        if (!budget.notes) continue;
        try {
          const teeth = JSON.parse(budget.notes).teeth as ToothEntry[];
          if (!Array.isArray(teeth)) continue;
          teeth.forEach((tooth, index) => {
            itemTreatments.set(
              `${budget.id}:${index}`,
              Array.isArray(tooth.treatments) ? tooth.treatments : []
            );
          });
        } catch {
          // skip invalid JSON
        }
      }

      const proceduresByPatient = new Map<string, any[]>();
      for (const proc of (procedures || []) as any[]) {
        const list = proceduresByPatient.get(proc.patient_id) || [];
        list.push(proc);
        proceduresByPatient.set(proc.patient_id, list);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return subscriptions.map(subscription => {
        const patient: any = patientMap.get(subscription.patient_id);
        const usage = computeUsage(
          subscription,
          proceduresByPatient.get(subscription.patient_id) || [],
          itemTreatments
        );
        const end = new Date(subscription.end_date + 'T00:00:00');
        const daysToExpiry = Math.ceil((end.getTime() - today.getTime()) / MS_PER_DAY);
        return {
          subscription,
          patientName: patient?.name || 'Paciente',
          phone: patient?.phone || null,
          usage,
          daysToExpiry,
        };
      });
    },
  });
}
