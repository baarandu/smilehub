import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsService } from '@/services/appointments';
import type { AppointmentInsert, AppointmentUpdate, Appointment } from '@/types/database';
import { toast } from 'sonner';
import { useClinic } from '@/contexts/ClinicContext';

export function useAppointments() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['appointments', clinicId],
    queryFn: () => appointmentsService.getAll(clinicId || undefined),
    enabled: !!clinicId,
  });
}

export function useAppointmentsByDate(date: string) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['appointments', 'date', date, clinicId],
    queryFn: () => appointmentsService.getByDate(date, clinicId || undefined),
    enabled: !!date && !!clinicId,
  });
}

export function useTodayAppointments() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['appointments', 'today', clinicId],
    queryFn: () => appointmentsService.getToday(clinicId || undefined),
    enabled: !!clinicId,
  });
}

export function usePatientAppointments(patientId: string) {
  return useQuery({
    queryKey: ['appointments', 'patient', patientId],
    queryFn: () => appointmentsService.getByPatient(patientId),
    enabled: !!patientId,
  });
}

export function useTodayAppointmentsCount() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['appointments', 'today', 'count', clinicId],
    queryFn: () => appointmentsService.countToday(clinicId || undefined),
    enabled: !!clinicId,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appointment: AppointmentInsert) =>
      appointmentsService.create(appointment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar agendamento. Tente novamente.');
      console.error(error);
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AppointmentUpdate }) =>
      appointmentsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar agendamento. Tente novamente.');
      console.error(error);
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Appointment['status'] }) =>
      appointmentsService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      toast.error('Erro ao salvar agendamento. Tente novamente.');
      console.error(error);
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appointmentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      toast.error('Erro ao excluir agendamento. Tente novamente.');
      console.error(error);
    },
  });
}

export function useMonthDates(startDate: string, endDate: string) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['appointments', 'month-dates', startDate, endDate, clinicId],
    queryFn: () => appointmentsService.getDatesWithAppointments(startDate, endDate, clinicId || undefined),
    enabled: !!startDate && !!endDate && !!clinicId,
  });
}

export function useAppointmentSearch(query: string) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['appointments', 'search', query, clinicId],
    queryFn: () => appointmentsService.search(query, clinicId || undefined),
    enabled: query.length >= 2 && !!clinicId,
    staleTime: 30_000,
  });
}
