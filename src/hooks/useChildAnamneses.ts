import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { childAnamnesesService } from '@/services/childAnamneses';
import type { ChildAnamnesisInsert, ChildAnamnesisUpdate } from '@/types/childAnamnesis';

export function useChildAnamneses(patientId: string) {
  return useQuery({
    queryKey: ['child-anamneses', patientId],
    queryFn: () => childAnamnesesService.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useCreateChildAnamnesis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (anamnesis: ChildAnamnesisInsert) => childAnamnesesService.create(anamnesis),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['child-anamneses', variables.patient_id] });
    },
  });
}

export function useUpdateChildAnamnesis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChildAnamnesisUpdate }) =>
      childAnamnesesService.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['child-anamneses', result.patient_id] });
    },
  });
}

export function useDeleteChildAnamnesis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => childAnamnesesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child-anamneses'] });
    },
  });
}
