import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prolaboreService } from '@/services/prolabore';
import type { ProlaboreInput, ProlaboreStatus } from '@/types/prolabore';

export function useProlaboreList(filters?: { year?: number; status?: ProlaboreStatus }) {
  return useQuery({
    queryKey: ['prolabore', 'list', filters],
    queryFn: () => prolaboreService.list(filters),
  });
}

export function useProlaboreByMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['prolabore', 'month', year, month],
    queryFn: () => prolaboreService.listByMonth(year, month),
  });
}

export function useProlaboreMonthlySummary(year: number) {
  return useQuery({
    queryKey: ['prolabore', 'summary', year],
    queryFn: () => prolaboreService.getMonthlySummary(year),
  });
}

export function useFatorR(year: number, month: number) {
  return useQuery({
    queryKey: ['fator-r', year, month],
    queryFn: () => prolaboreService.getFatorR(year, month),
    staleTime: 60_000,
  });
}

export function useFatorRThreshold() {
  return useQuery({
    queryKey: ['fator-r', 'threshold'],
    queryFn: () => prolaboreService.getThreshold(),
  });
}

export function useCreateProlabore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProlaboreInput) => prolaboreService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prolabore'] });
      qc.invalidateQueries({ queryKey: ['fator-r'] });
    },
  });
}

export function useUpdateProlabore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; patch: Partial<ProlaboreInput> }) =>
      prolaboreService.update(params.id, params.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prolabore'] });
      qc.invalidateQueries({ queryKey: ['fator-r'] });
    },
  });
}

export function useMarkProlaborePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; paymentDate: string; createExpense?: boolean }) =>
      prolaboreService.markPaid(params.id, params.paymentDate, params.createExpense ?? true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prolabore'] });
      qc.invalidateQueries({ queryKey: ['fator-r'] });
      qc.invalidateQueries({ queryKey: ['financial-transactions'] });
    },
  });
}

export function useDeleteProlabore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => prolaboreService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prolabore'] });
      qc.invalidateQueries({ queryKey: ['fator-r'] });
      qc.invalidateQueries({ queryKey: ['financial-transactions'] });
    },
  });
}

export function useSetFatorRThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pct: number) => prolaboreService.setThreshold(pct),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fator-r'] });
    },
  });
}
