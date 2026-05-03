import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cardMachinesService } from '@/services/cardMachines';
import type { CardMachineInsert, CardMachineUpdate } from '@/types/cardMachine';

const KEY = ['card-machines'];

export function useCardMachines(includeInactive = false) {
  return useQuery({
    queryKey: [...KEY, { includeInactive }],
    queryFn: () => cardMachinesService.list(includeInactive),
  });
}

export function useCreateCardMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CardMachineInsert, 'clinic_id'>) => cardMachinesService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCardMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CardMachineUpdate }) =>
      cardMachinesService.update(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCardMachine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cardMachinesService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
