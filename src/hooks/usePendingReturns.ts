import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPendingReturns, getPendingReturnsCount, markProcedureCompleted } from '@/services/pendingReturns';

export function usePendingReturnsList() {
    return useQuery({
        queryKey: ['procedures', 'pending-returns'],
        queryFn: () => getPendingReturns(),
    });
}

export function usePendingReturnsProceduresCount() {
    return useQuery({
        queryKey: ['procedures', 'pending-returns', 'count'],
        queryFn: () => getPendingReturnsCount(),
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
