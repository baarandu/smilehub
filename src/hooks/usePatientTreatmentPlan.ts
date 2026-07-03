import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { patientTreatmentPlansService, type PatientTreatmentPlan } from '@/services/patientTreatmentPlans';
import { treatmentPlansService, type TreatmentPlan } from '@/services/treatmentPlans';
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

interface ToothLike {
  treatments?: string[];
  values?: Record<string, string>;
  /** Treatment names on this tooth that are covered (R$0) by the plan. */
  planCovered?: string[];
  /** Percentage-rule discount (in R$) the plan applies to this tooth. */
  planDiscount?: number;
}

export interface UsageItem {
  budgetId: string;
  date: string;
  tooth: ToothLike;
}

function itemValue(values: Record<string, string> | undefined, treatment: string): number {
  return (parseInt((values || {})[treatment] || '0') || 0) / 100;
}

/**
 * Computes plan usage from the patient's budget lines within the subscription
 * period:
 * - each line marked "covered by the plan" consumes one included consultation;
 * - discount-rule usage is counted from non-covered lines that match a rule.
 * `excludeBudgetId` lets the budget being edited be left out of the prior tally.
 */
export function computeUsage(
  subscription: PatientTreatmentPlan | null,
  items: UsageItem[],
  excludeBudgetId?: string
): TreatmentPlanUsage {
  if (!subscription) return EMPTY_USAGE;
  const snap = subscription.plan_snapshot;
  const ruleUses: Record<string, number> = {};
  let consultationsUsed = 0;

  for (const item of items) {
    if (item.budgetId === excludeBudgetId) continue;
    if (item.date < subscription.start_date || item.date > subscription.end_date) continue;

    const covered = item.tooth.planCovered || [];
    consultationsUsed += covered.length;

    for (const treatment of item.tooth.treatments || []) {
      if (covered.includes(treatment)) continue;
      const rule = snap.discount_rules.find(r => r.treatments.includes(treatment));
      if (rule) ruleUses[rule.id] = (ruleUses[rule.id] || 0) + 1;
    }
  }

  return {
    consultationsIncluded: snap.included_consultations,
    consultationsUsed,
    consultationsRemaining: Math.max(snap.included_consultations - consultationsUsed, 0),
    ruleUses,
  };
}

export interface PlanBudgetResult<T> {
  /** Teeth with covered treatments zeroed and tagged in `planCovered`. */
  teeth: T[];
  subtotal: number;
  coveredAmount: number;
  discountAmount: number;
  finalTotal: number;
  coveredCount: number;
  planName: string | null;
}

/**
 * Applies an active plan to a budget's teeth:
 * - included-consultation treatments become R$0 ("Coberto pelo plano") up to the
 *   remaining consultation balance;
 * - other treatments matching a discount rule get the percentage off (honoring
 *   per-rule max_uses against prior usage).
 * `prior` is the usage already consumed by the patient's OTHER budgets.
 */
export function computePlanBudget<T extends ToothLike>(
  teeth: T[],
  subscription: PatientTreatmentPlan | null,
  prior: TreatmentPlanUsage
): PlanBudgetResult<T> {
  let subtotal = 0;
  for (const tooth of teeth) {
    for (const treatment of tooth.treatments || []) subtotal += itemValue(tooth.values, treatment);
  }

  if (!subscription) {
    return { teeth, subtotal, coveredAmount: 0, discountAmount: 0, finalTotal: subtotal, coveredCount: 0, planName: null };
  }

  const snap = subscription.plan_snapshot;
  const includedTypes = new Set(snap.included_consultation_treatments);
  let remainingSlots = Math.max(snap.included_consultations - prior.consultationsUsed, 0);
  const ruleRemaining: Record<string, number> = {};
  for (const r of snap.discount_rules) {
    ruleRemaining[r.id] = r.max_uses == null ? Infinity : Math.max(r.max_uses - (prior.ruleUses[r.id] || 0), 0);
  }

  let coveredAmount = 0;
  let discountAmount = 0;
  let coveredCount = 0;

  const newTeeth = teeth.map(tooth => {
    const treatments = tooth.treatments || [];
    const planCovered: string[] = [];
    const values = { ...(tooth.values || {}) };
    // Percentage-rule discount for this tooth. Kept OUT of `values` (which stay
    // gross) so re-running on an already-processed budget stays idempotent.
    let toothDiscount = 0;

    for (const treatment of treatments) {
      const val = itemValue(tooth.values, treatment);
      if (includedTypes.has(treatment) && remainingSlots > 0) {
        // Covered by the plan → R$0
        coveredAmount += val;
        coveredCount += 1;
        remainingSlots -= 1;
        planCovered.push(treatment);
        values[treatment] = '0';
        continue;
      }
      const rule = snap.discount_rules.find(r => r.treatments.includes(treatment));
      if (rule && ruleRemaining[rule.id] > 0 && val > 0) {
        const d = (val * rule.percent) / 100;
        discountAmount += d;
        toothDiscount += d;
        ruleRemaining[rule.id] -= 1;
      }
    }

    const roundedDiscount = Math.round(toothDiscount * 100) / 100;
    // Return a fresh object when anything changed OR when stale plan annotations
    // must be cleared (e.g. usage limits now consumed by prior budgets).
    if (planCovered.length === 0 && roundedDiscount === 0 && tooth.planCovered == null && tooth.planDiscount == null) {
      return tooth;
    }
    const next: any = { ...tooth, values };
    if (planCovered.length > 0) next.planCovered = planCovered; else delete next.planCovered;
    if (roundedDiscount > 0) next.planDiscount = roundedDiscount; else delete next.planDiscount;
    return next as T;
  });

  return {
    teeth: newTeeth,
    subtotal,
    coveredAmount,
    discountAmount,
    finalTotal: Math.max(subtotal - coveredAmount - discountAmount, 0),
    coveredCount,
    planName: snap.name,
  };
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

  const { planItems } = useBudgetPlanItems(patientId);

  const usageItems = useMemo<UsageItem[]>(
    () => planItems.map(i => ({ budgetId: i.budgetId, date: i.budgetDate, tooth: i.tooth as ToothLike })),
    [planItems]
  );

  const usage = useMemo(
    () => computeUsage(subscriptionQuery.data ?? null, usageItems),
    [subscriptionQuery.data, usageItems]
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['patient-treatment-plan', patientId] });
    // The membership fee creates a budget on enrollment.
    qc.invalidateQueries({ queryKey: ['budgets', patientId] });
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
    usageItems,
    isLoading: subscriptionQuery.isLoading,
    enroll: enrollMutation.mutate,
    enrolling: enrollMutation.isPending,
    cancel: cancelMutation.mutate,
    cancelling: cancelMutation.isPending,
  };
}
