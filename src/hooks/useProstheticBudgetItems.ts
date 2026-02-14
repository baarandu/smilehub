import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { budgetsService } from '@/services/budgets';
import { prosthesisService } from '@/services/prosthesis';
import { getToothDisplayName, formatMoney, formatDisplayDate, type ToothEntry } from '@/utils/budgetUtils';
import { isProstheticTreatment, getProsthesisTypeFromTreatments, hasLabTreatment } from '@/utils/prosthesis';
import type { ProsthesisStatus } from '@/types/prosthesis';

export interface ProstheticBudgetItem {
  budgetId: string;
  budgetDate: string;
  toothIndex: number;
  tooth: ToothEntry;
  prosthesisType: string;
  material: string | null;
  value: number;
  label: string;
  key: string;
  existingOrderId: string | null;
  existingOrderStatus: ProsthesisStatus | null;
}

function getItemValue(tooth: ToothEntry): number {
  return Object.values(tooth.values).reduce(
    (sum, val) => sum + (parseInt(val as string) || 0) / 100,
    0
  );
}

export function useProstheticBudgetItems(patientId: string | undefined) {
  const budgetsQuery = useQuery({
    queryKey: ['budgets', patientId],
    queryFn: () => budgetsService.getByPatient(patientId!),
    enabled: !!patientId,
  });

  const ordersQuery = useQuery({
    queryKey: ['prosthesis-orders', 'patient', patientId],
    queryFn: () => prosthesisService.getOrdersByPatient(patientId!),
    enabled: !!patientId,
  });

  const result = useMemo(() => {
    if (!budgetsQuery.data) return { items: [], itemsWithOrder: [], itemsWithoutOrder: [] };

    // Build lookup: "budgetId:toothIndex" -> order
    const orderLookup = new Map<string, { id: string; status: ProsthesisStatus }>();
    if (ordersQuery.data) {
      for (const order of ordersQuery.data) {
        if (order.budget_id && order.budget_tooth_index != null) {
          orderLookup.set(`${order.budget_id}:${order.budget_tooth_index}`, {
            id: order.id,
            status: order.status,
          });
        }
      }
    }

    const items: ProstheticBudgetItem[] = [];

    for (const budget of budgetsQuery.data) {
      if (!budget.notes) continue;
      try {
        const parsed = JSON.parse(budget.notes);
        const teeth = parsed.teeth as ToothEntry[];
        if (!teeth) continue;

        teeth.forEach((tooth, index) => {
          // Only paid items that have prosthetic treatments marked for lab
          if (tooth.status !== 'paid' && tooth.status !== 'completed') return;
          if (!isProstheticTreatment(tooth.treatments)) return;
          if (!hasLabTreatment(tooth)) return;

          const prosthesisType = getProsthesisTypeFromTreatments(tooth.treatments) || 'outro';
          const value = getItemValue(tooth);
          const toothName = getToothDisplayName(tooth.tooth, false);
          const treatments = tooth.treatments.join(', ');

          // Get material from tooth.materials for the prosthetic treatment
          let material: string | null = null;
          if (tooth.materials) {
            for (const t of tooth.treatments) {
              if (tooth.materials[t]) {
                material = tooth.materials[t];
                break;
              }
            }
          }

          const key = `${budget.id}:${index}`;
          const existing = orderLookup.get(key);

          items.push({
            budgetId: budget.id,
            budgetDate: budget.date,
            toothIndex: index,
            tooth,
            prosthesisType,
            material,
            value,
            label: `${toothName} - ${treatments} (R$ ${formatMoney(value)}) [${formatDisplayDate(budget.date)}]`,
            key,
            existingOrderId: existing?.id || null,
            existingOrderStatus: existing?.status || null,
          });
        });
      } catch {
        // skip invalid JSON
      }
    }

    return {
      items,
      itemsWithOrder: items.filter(i => i.existingOrderId !== null),
      itemsWithoutOrder: items.filter(i => i.existingOrderId === null),
    };
  }, [budgetsQuery.data, ordersQuery.data]);

  return {
    ...result,
    isLoading: budgetsQuery.isLoading || ordersQuery.isLoading,
  };
}
