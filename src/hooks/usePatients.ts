import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  getPatients,
  getPatientById,
  createPatientFromForm,
  updatePatientFromForm,
  deletePatient,
  searchPatients,
} from '@/services/patients';
import type { PatientFormData, Patient } from '@/types/database';

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: () => getPatients(),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => getPatientById(id),
    enabled: !!id,
  });
}

export function usePatientSearch(query: string) {
  return useQuery({
    queryKey: ['patients', 'search', query],
    queryFn: () => searchPatients(query),
    enabled: query.length >= 2,
  });
}

export function useInfinitePatients() {
  return useInfiniteQuery({
    queryKey: ['patients', 'infinite'],
    queryFn: ({ pageParam }) => getPatients(pageParam as number, 20),
    initialPageParam: 0,
    getNextPageParam: (lastPage: Patient[], allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    },
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: PatientFormData) => createPatientFromForm(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: PatientFormData }) =>
      updatePatientFromForm(id, formData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients', variables.id] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function usePatientsCount() {
  const { data: patients, isLoading } = usePatients();
  return {
    data: patients?.length || 0,
    isLoading,
  };
}
