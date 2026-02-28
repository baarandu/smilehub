import { useQuery } from '@tanstack/react-query';
import { budgetsService } from '@/services/budgets';

export function usePendingBudgetsCount() {
  return useQuery({
    queryKey: ['pending-budgets-count'],
    queryFn: () => budgetsService.getPendingPatientsCount(),
  });
}
