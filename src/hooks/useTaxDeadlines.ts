import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxDeadlinesService } from '@/services/taxDeadlines';
import type { DeadlineCompletionInput, TaxDeadlineRule } from '@/types/taxDeadline';

export function useTaxDeadlineRules() {
  return useQuery({
    queryKey: ['tax-deadlines', 'rules'],
    queryFn: () => taxDeadlinesService.listRules(),
  });
}

export function useUpcomingDeadlines(daysAhead = 60, daysBehind = 14) {
  return useQuery({
    queryKey: ['tax-deadlines', 'upcoming', daysAhead, daysBehind],
    queryFn: () => taxDeadlinesService.getUpcoming(daysAhead, daysBehind),
    staleTime: 60_000,
  });
}

export function useDeadlineOccurrences(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['tax-deadlines', 'occurrences', startDate, endDate],
    queryFn: () => taxDeadlinesService.getOccurrences(startDate, endDate),
  });
}

export function useMarkDeadlineComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DeadlineCompletionInput) => taxDeadlinesService.markComplete(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-deadlines'] });
    },
  });
}

export function useUnmarkDeadlineComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { deadlineId: string; occurrenceDate: string }) =>
      taxDeadlinesService.unmarkComplete(params.deadlineId, params.occurrenceDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-deadlines'] });
    },
  });
}

export function useSeedDefaultDeadlines() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => taxDeadlinesService.seedDefaults(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-deadlines'] });
    },
  });
}

export function useToggleDeadlineActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; isActive: boolean }) =>
      taxDeadlinesService.toggleActive(params.id, params.isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-deadlines'] });
    },
  });
}

export function useCreateDeadlineRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<TaxDeadlineRule>) => taxDeadlinesService.createRule(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-deadlines'] });
    },
  });
}

export function useDeleteDeadlineRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taxDeadlinesService.deleteRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-deadlines'] });
    },
  });
}
