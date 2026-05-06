import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clinicCustomTreatmentsService } from '@/services/clinicCustomTreatments';
import { useClinic } from '@/contexts/ClinicContext';

const QUERY_KEY = ['clinic-custom-treatments'];

export function useClinicCustomTreatments() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: [...QUERY_KEY, clinicId],
    queryFn: () => clinicCustomTreatmentsService.list(),
    enabled: !!clinicId,
  });
}

export function useCreateClinicCustomTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => clinicCustomTreatmentsService.create(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Tratamento adicionado');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao adicionar tratamento'),
  });
}

export function useUpdateClinicCustomTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      clinicCustomTreatmentsService.update(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Tratamento atualizado');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao atualizar tratamento'),
  });
}

export function useDeleteClinicCustomTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clinicCustomTreatmentsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Tratamento removido');
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao remover tratamento'),
  });
}
