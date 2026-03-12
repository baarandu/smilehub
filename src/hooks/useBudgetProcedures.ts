import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { budgetsService } from '@/services/budgets';
import { getToothDisplayName, formatMoney, formatDisplayDate, type ToothEntry } from '@/utils/budgetUtils';
import type { BudgetLink } from '@/services/procedures';

export interface BudgetPlanItem {
  budgetId: string;
  budgetDate: string;
  toothIndex: number;
  tooth: ToothEntry;
  value: number;
  status: string;
  label: string;
  key: string; // unique key: "budgetId:toothIndex"
}

function getItemValue(tooth: ToothEntry): number {
  return Object.values(tooth.values).reduce(
    (sum, val) => sum + (parseInt(val as string) || 0) / 100,
    0
  );
}

export function useBudgetPlanItems(patientId: string) {
  const budgetsQuery = useQuery({
    queryKey: ['budgets', patientId],
    queryFn: () => budgetsService.getByPatient(patientId),
    enabled: !!patientId,
  });

  const planItems = useMemo<BudgetPlanItem[]>(() => {
    if (!budgetsQuery.data) return [];

    const result: BudgetPlanItem[] = [];

    for (const budget of budgetsQuery.data) {
      if (!budget.notes) continue;
      try {
        const parsed = JSON.parse(budget.notes);
        const teeth = parsed.teeth as ToothEntry[];
        if (!teeth) continue;

        teeth.forEach((tooth, index) => {
          const value = getItemValue(tooth);
          const toothName = getToothDisplayName(tooth.tooth, false);
          const treatments = tooth.treatments.join(', ');

          result.push({
            budgetId: budget.id,
            budgetDate: budget.date,
            toothIndex: index,
            tooth,
            value,
            status: tooth.status || 'pending',
            label: `${toothName} - ${treatments} (R$ ${formatMoney(value)}) [${formatDisplayDate(budget.date)}]`,
            key: `${budget.id}:${index}`,
          });
        });
      } catch {
        // skip invalid JSON
      }
    }

    return result;
  }, [budgetsQuery.data]);

  return {
    planItems,
    isLoading: budgetsQuery.isLoading,
  };
}

/** Convert selected keys back to BudgetLink[] for saving */
export function keysToBudgetLinks(keys: Set<string>): BudgetLink[] {
  return Array.from(keys).map((key) => {
    const [budgetId, toothIndex] = key.split(':');
    return { budgetId, toothIndex: parseInt(toothIndex, 10) };
  });
}

/** Convert BudgetLink[] to Set<string> keys */
export function budgetLinksToKeys(links: BudgetLink[] | null | undefined): Set<string> {
  if (!links) return new Set();
  return new Set(links.map((l) => `${l.budgetId}:${l.toothIndex}`));
}
