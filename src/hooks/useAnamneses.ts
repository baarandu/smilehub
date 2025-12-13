import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { anamnesesService } from '@/services/anamneses';
import type { Anamnese, AnamneseInsert, AnamneseUpdate } from '@/types/database';

export function useAnamneses(patientId: string) {
  return useQuery({
    queryKey: ['anamneses', patientId],
    queryFn: () => anamnesesService.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useCreateAnamnese() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (anamnese: AnamneseInsert) => anamnesesService.create(anamnese),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['anamneses', variables.patient_id] });
    },
  });
}

export function useUpdateAnamnese() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AnamneseUpdate }) =>
      anamnesesService.update(id, data),
    onSuccess: (anamnese) => {
      queryClient.invalidateQueries({ queryKey: ['anamneses', anamnese.patient_id] });
    },
  });
}

export function useDeleteAnamnese() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => anamnesesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anamneses'] });
    },
  });
}

