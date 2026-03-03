import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPendingReturns, getPendingReturnsCount, markProcedureCompleted } from '@/services/pendingReturns';
import { useClinic } from '@/contexts/ClinicContext';

export function usePendingReturnsList() {
    const { clinicId } = useClinic();
    return useQuery({
        queryKey: ['procedures', 'pending-returns', clinicId],
        queryFn: () => getPendingReturns(clinicId || undefined),
        enabled: !!clinicId,
    });
}

export function usePendingReturnsProceduresCount() {
    const { clinicId } = useClinic();
    return useQuery({
        queryKey: ['procedures', 'pending-returns', 'count', clinicId],
        queryFn: () => getPendingReturnsCount(clinicId || undefined),
        enabled: !!clinicId,
    });
}

export function useMarkProcedureCompleted() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (procedureId: string) => markProcedureCompleted(procedureId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['procedures', 'pending-returns'] });
        },
    });
}
