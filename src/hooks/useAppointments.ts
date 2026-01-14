import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsService } from '@/services/appointments';
import type { AppointmentInsert, AppointmentUpdate, Appointment } from '@/types/database';

export function useAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsService.getAll(),
  });
}

export function useAppointmentsByDate(date: string) {
  return useQuery({
    queryKey: ['appointments', 'date', date],
    queryFn: () => appointmentsService.getByDate(date),
    enabled: !!date,
  });
}

export function useTodayAppointments() {
  return useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: () => appointmentsService.getToday(),
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
  return useQuery({
    queryKey: ['appointments', 'today', 'count'],
    queryFn: () => appointmentsService.countToday(),
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
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => appointmentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}






