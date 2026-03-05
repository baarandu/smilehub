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
import { toast } from 'sonner';
import { useClinic } from '@/contexts/ClinicContext';

export function usePatients() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['patients', clinicId],
    queryFn: () => getPatients(undefined, undefined, clinicId || undefined),
    enabled: !!clinicId,
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
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['patients', 'search', query, clinicId],
    queryFn: () => searchPatients(query, clinicId || undefined),
    enabled: query.length >= 2 && !!clinicId,
  });
}

export function useInfinitePatients() {
  const { clinicId } = useClinic();
  return useInfiniteQuery({
    queryKey: ['patients', 'infinite', clinicId],
    queryFn: ({ pageParam }) => getPatients(pageParam as number, 20, clinicId || undefined),
    initialPageParam: 0,
    getNextPageParam: (lastPage: Patient[], allPages) => {
      return lastPage.length === 20 ? allPages.length : undefined;
    },
    enabled: !!clinicId,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: PatientFormData) => createPatientFromForm(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (error: any) => {
      const message = error?.message || 'Erro ao salvar. Tente novamente.';
      toast.error(message);
      console.error(error);
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
    onError: (error) => {
      toast.error('Erro ao salvar. Tente novamente.');
      console.error(error);
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
    onError: (error) => {
      toast.error('Erro ao excluir. Tente novamente.');
      console.error(error);
    },
  });
}

export function usePatientsCount() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['patients', 'count', clinicId],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { count } = await supabase
        .from('patients_secure')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId!);
      return count || 0;
    },
    enabled: !!clinicId,
  });
}
