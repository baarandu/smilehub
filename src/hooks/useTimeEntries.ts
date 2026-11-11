import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { toast } from 'sonner';
import { useClinic } from '@/contexts/ClinicContext';
import { timeEntriesService } from '@/services/timeEntries';

// Todas as chaves começam com ['time-entries', clinicId] para trocar de clínica sem vazar dados.
const keys = {
  all: (clinicId: string | null) => ['time-entries', clinicId] as const,
  week: (clinicId: string | null, userId: string | null, weekStart: Date) =>
    ['time-entries', clinicId, 'week', userId, weekStart.toISOString()] as const,
  open: (clinicId: string | null, userId: string | null) =>
    ['time-entries', clinicId, 'open', userId] as const,
  limit: (clinicId: string | null) => ['weekly-hours-limit', clinicId] as const,
};

function onError(error: unknown) {
  toast.error(error instanceof Error ? error.message : 'Erro ao salvar ponto. Tente novamente.');
  console.error(error);
}

export function useWeekEntries(userId: string | null, weekStart: Date) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: keys.week(clinicId, userId, weekStart),
    queryFn: () => timeEntriesService.listRange(clinicId!, userId!, weekStart, addDays(weekStart, 7)),
    enabled: !!clinicId && !!userId,
  });
}

export function useOpenEntry(userId: string | null) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: keys.open(clinicId, userId),
    queryFn: () => timeEntriesService.getOpen(clinicId!, userId!),
    enabled: !!clinicId && !!userId,
  });
}

export function useWeeklyLimit() {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: keys.limit(clinicId),
    queryFn: () => timeEntriesService.getWeeklyLimit(clinicId!),
    enabled: !!clinicId,
  });
}

function useTimeEntryMutation<TVars, TResult>(fn: (clinicId: string, vars: TVars) => Promise<TResult>) {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => {
      if (!clinicId) throw new Error('Nenhuma clínica selecionada');
      return fn(clinicId, vars);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all(clinicId) }),
    // Em erro também recarrega: o estado do servidor pode ter mudado (ex.: ponto já aberto).
    onError: (error) => {
      onError(error);
      queryClient.invalidateQueries({ queryKey: keys.all(clinicId) });
    },
  });
}

export function useClockIn() {
  return useTimeEntryMutation<void, unknown>((clinicId) => timeEntriesService.clockIn(clinicId));
}

export function useClockOut() {
  return useTimeEntryMutation<void, unknown>((clinicId) => timeEntriesService.clockOut(clinicId));
}

export function useCreateTimeEntry() {
  return useTimeEntryMutation(
    (clinicId, vars: { user_id: string; clock_in: string; clock_out: string | null }) =>
      timeEntriesService.create({ ...vars, clinic_id: clinicId }),
  );
}

export function useUpdateTimeEntry() {
  return useTimeEntryMutation(
    (_clinicId, vars: { id: string; clock_in: string; clock_out: string | null }) =>
      timeEntriesService.update(vars.id, { clock_in: vars.clock_in, clock_out: vars.clock_out }),
  );
}

export function useDeleteTimeEntry() {
  return useTimeEntryMutation((_clinicId, id: string) => timeEntriesService.remove(id));
}

export function useSetWeeklyLimit() {
  const { clinicId } = useClinic();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hours: number) => {
      if (!clinicId) throw new Error('Nenhuma clínica selecionada');
      return timeEntriesService.setWeeklyLimit(clinicId, hours);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.limit(clinicId) });
      toast.success('Jornada atualizada');
    },
    onError,
  });
}
