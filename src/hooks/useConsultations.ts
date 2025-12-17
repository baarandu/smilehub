import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationsService } from '@/services/consultations';
import type { ConsultationInsert, ConsultationUpdate } from '@/types/database';

export function useConsultations() {
  return useQuery({
    queryKey: ['consultations'],
    queryFn: () => consultationsService.getAll(),
  });
}

export function useConsultation(id: string) {
  return useQuery({
    queryKey: ['consultations', id],
    queryFn: () => consultationsService.getById(id),
    enabled: !!id,
  });
}

export function usePatientConsultations(patientId: string) {
  return useQuery({
    queryKey: ['consultations', 'patient', patientId],
    queryFn: () => consultationsService.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useReturnAlerts() {
  return useQuery({
    queryKey: ['consultations', 'return-alerts'],
    queryFn: () => consultationsService.getReturnAlerts(),
  });
}

export function usePendingReturnsCount() {
  return useQuery({
    queryKey: ['consultations', 'pending-returns', 'count'],
    queryFn: () => consultationsService.countPendingReturns(),
  });
}

export function useCreateConsultation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (consultation: ConsultationInsert) => 
      consultationsService.create(consultation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
    },
  });
}

export function useUpdateConsultation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConsultationUpdate }) => 
      consultationsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultations', variables.id] });
    },
  });
}

export function useDeleteConsultation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => consultationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
    },
  });
}



