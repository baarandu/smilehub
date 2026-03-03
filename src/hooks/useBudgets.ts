import { useQuery } from '@tanstack/react-query';
import { budgetsService } from '@/services/budgets';
import { useClinic } from '@/contexts/ClinicContext';

export function usePendingBudgetsCount() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['pending-budgets-count', clinicId],
    queryFn: () => budgetsService.getPendingPatientsCount(clinicId || undefined),
    enabled: !!clinicId,
  });
}
