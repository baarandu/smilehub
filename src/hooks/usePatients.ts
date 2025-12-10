import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsService } from '@/services/patients';
import type { PatientInsert, PatientUpdate } from '@/types/database';

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: () => patientsService.getAll(),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsService.getById(id),
    enabled: !!id,
  });
}

export function usePatientSearch(query: string) {
  return useQuery({
    queryKey: ['patients', 'search', query],
    queryFn: () => patientsService.search(query),
    enabled: query.length >= 2,
  });
}

export function usePatientsCount() {
  return useQuery({
    queryKey: ['patients', 'count'],
    queryFn: () => patientsService.count(),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (patient: PatientInsert) => patientsService.create(patient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PatientUpdate }) => 
      patientsService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients', variables.id] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => patientsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

