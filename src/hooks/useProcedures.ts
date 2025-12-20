import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proceduresService } from '@/services/procedures';
import type { ProcedureInsert } from '@/types/database';

export function useProcedures(patientId: string) {
  return useQuery({
    queryKey: ['procedures', patientId],
    queryFn: () => proceduresService.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useCreateProcedure() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (procedure: ProcedureInsert) => proceduresService.create(procedure),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procedures', variables.patient_id] });
    },
  });
}

export function useUpdateProcedure() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProcedureInsert> }) =>
      proceduresService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
}

export function useDeleteProcedure() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => proceduresService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });
}




