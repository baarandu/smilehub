import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patientTreatmentPlansService, type PatientTreatmentPlan } from '@/services/patientTreatmentPlans';
import { treatmentPlansService, type TreatmentPlan } from '@/services/treatmentPlans';
import { proceduresService } from '@/services/procedures';
import { useBudgetPlanItems } from './useBudgetProcedures';

export interface TreatmentPlanUsage {
  consultationsIncluded: number;
  consultationsUsed: number;
  consultationsRemaining: number;
  /** Discount-rule id -> number of times used within the subscription period. */
  ruleUses: Record<string, number>;
}

const EMPTY_USAGE: TreatmentPlanUsage = {
  consultationsIncluded: 0,
  consultationsUsed: 0,
  consultationsRemaining: 0,
  ruleUses: {},
};

/**
 * Computes plan usage within the subscription period:
 * - every procedure in the period consumes 1 included consultation;
 * - discount-rule usage is tracked per rule by matching the procedure's
 *   treatments (resolved from its budget links) against the rule's treatments.
 */
export function computeUsage(
  subscription: PatientTreatmentPlan | null,
  procedures: Array<{ date: string; budget_links?: Array<{ budgetId: string; toothIndex: number }> | null }>,
  itemTreatments: Map<string, string[]>
): TreatmentPlanUsage {
  if (!subscription) return EMPTY_USAGE;
  const snap = subscription.plan_snapshot;
  const ruleUses: Record<string, number> = {};

  let consultationsUsed = 0;
  for (const proc of procedures) {
    if (proc.date < subscription.start_date || proc.date > subscription.end_date) continue;

    // Any procedure registered during the plan period consumes one consultation.
    consultationsUsed++;

    // Discount-rule usage is still attributed by treatment type.
    const links = proc.budget_links || [];
    const treatments = new Set<string>();
    for (const link of links) {
      const t = itemTreatments.get(`${link.budgetId}:${link.toothIndex}`);
      if (t) t.forEach(name => treatments.add(name));
    }
    for (const rule of snap.discount_rules) {
      if (rule.treatments.some(t => treatments.has(t))) {
        ruleUses[rule.id] = (ruleUses[rule.id] || 0) + 1;
      }
    }
  }

  return {
    consultationsIncluded: snap.included_consultations,
    consultationsUsed,
    consultationsRemaining: Math.max(snap.included_consultations - consultationsUsed, 0),
    ruleUses,
  };
}

export interface BudgetPlanDiscount {
  discountAmount: number;
  planName: string | null;
}

/**
 * Computes the automatic discount an active subscription applies to a budget,
 * matching each treatment in each tooth against the plan's discount rules.
 * Limited-use rules (max_uses) are honored against uses already consumed.
 */
export function computeBudgetDiscount(
  teeth: Array<{ treatments?: string[]; values?: Record<string, string> }>,
  subscription: PatientTreatmentPlan | null,
  usage: TreatmentPlanUsage
): BudgetPlanDiscount {
  if (!subscription) return { discountAmount: 0, planName: null };
  const rules = subscription.plan_snapshot.discount_rules;

  // remaining uses per limited rule, starting from what's already consumed
  const remaining: Record<string, number> = {};
  for (const r of rules) {
    remaining[r.id] = r.max_uses == null ? Infinity : Math.max(r.max_uses - (usage.ruleUses[r.id] || 0), 0);
  }

  let discountAmount = 0;
  for (const tooth of teeth) {
    const values = tooth.values || {};
    for (const treatment of tooth.treatments || []) {
      const val = (parseInt(values[treatment] || '0') || 0) / 100;
      if (val <= 0) continue;
      const rule = rules.find(r => r.treatments.includes(treatment));
      if (!rule || remaining[rule.id] <= 0) continue;
      discountAmount += (val * rule.percent) / 100;
      remaining[rule.id] -= 1;
    }
  }

  return { discountAmount, planName: subscription.plan_snapshot.name };
}

export function usePatientTreatmentPlan(patientId: string) {
  const qc = useQueryClient();

  const subscriptionQuery = useQuery({
    queryKey: ['patient-treatment-plan', patientId],
    queryFn: () => patientTreatmentPlansService.getActive(patientId),
    enabled: !!patientId,
  });

  const plansQuery = useQuery({
    queryKey: ['treatment-plans'],
    queryFn: () => treatmentPlansService.getAll(),
  });

  const proceduresQuery = useQuery({
    queryKey: ['procedures', patientId],
    queryFn: () => proceduresService.getByPatient(patientId),
    enabled: !!patientId,
  });

  const { planItems } = useBudgetPlanItems(patientId);

  const usage = useMemo(() => {
    const itemTreatments = new Map<string, string[]>(
      planItems.map(i => [i.key, Array.isArray(i.tooth.treatments) ? i.tooth.treatments : []])
    );
    return computeUsage(
      subscriptionQuery.data ?? null,
      (proceduresQuery.data ?? []) as any[],
      itemTreatments
    );
  }, [subscriptionQuery.data, proceduresQuery.data, planItems]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['patient-treatment-plan', patientId] });
  };

  const enrollMutation = useMutation({
    mutationFn: (plan: TreatmentPlan) => patientTreatmentPlansService.enroll(patientId, plan),
    onSuccess: () => {
      invalidate();
      toast.success('Plano ativado para o paciente');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao ativar plano'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => patientTreatmentPlansService.cancel(id),
    onSuccess: () => {
      invalidate();
      toast.success('Plano cancelado');
    },
    onError: (e: any) => toast.error(e?.message || 'Erro ao cancelar plano'),
  });

  return {
    subscription: subscriptionQuery.data ?? null,
    plans: plansQuery.data ?? [],
    usage,
    isLoading: subscriptionQuery.isLoading,
    enroll: enrollMutation.mutate,
    enrolling: enrollMutation.isPending,
    cancel: cancelMutation.mutate,
    cancelling: cancelMutation.isPending,
  };
}
