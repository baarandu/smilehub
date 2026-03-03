import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { consultationsService } from '@/services/consultations';
import type { ConsultationInsert, ConsultationUpdate } from '@/types/database';
import { useClinic } from '@/contexts/ClinicContext';

export function useConsultations() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['consultations', clinicId],
    queryFn: () => consultationsService.getAll(clinicId || undefined),
    enabled: !!clinicId,
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
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['consultations', 'return-alerts', clinicId],
    queryFn: () => consultationsService.getReturnAlerts(clinicId || undefined),
    enabled: !!clinicId,
  });
}

export function usePendingReturnsCount() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['consultations', 'pending-returns', 'count', clinicId],
    queryFn: () => consultationsService.countPendingReturns(clinicId || undefined),
    enabled: !!clinicId,
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






