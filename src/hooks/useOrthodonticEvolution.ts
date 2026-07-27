import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orthodonticEvolutionService } from '@/services/orthodonticEvolution';
import type { OrthodonticEvolutionInsert, OrthodonticEvolutionUpdate } from '@/types/orthodonticEvolution';
import { toast } from 'sonner';

export function useOrthodonticEvolution(patientId: string) {
  return useQuery({
    queryKey: ['orthodontic-evolution', patientId],
    queryFn: () => orthodonticEvolutionService.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useCreateOrthodonticEvolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entry: OrthodonticEvolutionInsert) => orthodonticEvolutionService.create(entry),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orthodontic-evolution', variables.patient_id] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar evolução. Tente novamente.');
      console.error(error);
    },
  });
}

export function useUpdateOrthodonticEvolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrthodonticEvolutionUpdate }) =>
      orthodonticEvolutionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orthodontic-evolution'] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar evolução. Tente novamente.');
      console.error(error);
    },
  });
}

export function useDeleteOrthodonticEvolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => orthodonticEvolutionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orthodontic-evolution'] });
    },
    onError: (error) => {
      toast.error('Erro ao excluir evolução. Tente novamente.');
      console.error(error);
    },
  });
}
