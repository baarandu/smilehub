import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { proceduresService, type BudgetLink } from '@/services/procedures';
import type { ProcedureInsert } from '@/types/database';
import { toast } from 'sonner';

type ProcedureCreateData = ProcedureInsert & { budget_links?: BudgetLink[] | null };
type ProcedureUpdateData = Partial<ProcedureInsert> & { budget_links?: BudgetLink[] | null };

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
    mutationFn: (procedure: ProcedureCreateData) => proceduresService.create(procedure),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procedures', variables.patient_id] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar procedimento. Tente novamente.');
      console.error(error);
    },
  });
}

export function useUpdateProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProcedureUpdateData }) =>
      proceduresService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar procedimento. Tente novamente.');
      console.error(error);
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
    onError: (error) => {
      toast.error('Erro ao excluir procedimento. Tente novamente.');
      console.error(error);
    },
  });
}






