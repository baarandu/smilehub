import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { receivablesService } from '@/services/receivables';
import { useClinic } from '@/contexts/ClinicContext';
import type { ReceivableFilters } from '@/types/receivables';

export function usePatientReceivables(patientId: string | undefined) {
  return useQuery({
    queryKey: ['receivables', 'patient', patientId],
    queryFn: () => receivablesService.getPatientReceivables(patientId!),
    enabled: !!patientId,
  });
}

export function useClinicReceivables(filters?: ReceivableFilters) {
  return useQuery({
    queryKey: ['receivables', 'clinic', filters],
    queryFn: () => receivablesService.getClinicReceivables(filters),
  });
}

export function useOverdueSummary() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['receivables', 'overdue-summary', clinicId],
    queryFn: () => receivablesService.getOverdueSummary(),
    enabled: !!clinicId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

export function useReceivablesDueToday() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['receivables', 'due-today', clinicId],
    queryFn: () => receivablesService.getReceivablesDueToday(),
    enabled: !!clinicId,
  });
}

export function useConfirmReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ receivableId, confirmationDate, budgetLocation }: {
      receivableId: string;
      confirmationDate?: string;
      budgetLocation?: string | null;
    }) => receivablesService.confirmReceivable(receivableId, confirmationDate, budgetLocation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['financial'] });
    },
  });
}

export function useCancelReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (receivableId: string) => receivablesService.cancelReceivable(receivableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivables'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}
