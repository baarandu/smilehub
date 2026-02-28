import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orthodonticsService } from '@/services/orthodontics';
import { useClinic } from '@/contexts/ClinicContext';
import type {
  CaseInsert,
  OrthodonticCase,
  OrthodonticStatus,
  SessionInsert,
  OrthodonticSession,
  CaseFilters,
} from '@/types/orthodontics';

// ==================== Cases ====================

export function useOrthodonticCases(filters?: CaseFilters) {
  const { clinicId } = useClinic();
  return useQuery({
    queryKey: ['orthodontic-cases', clinicId, filters],
    queryFn: () => orthodonticsService.getCases(clinicId!, filters),
    enabled: !!clinicId,
  });
}

export function useOrthodonticCase(id: string | null) {
  return useQuery({
    queryKey: ['orthodontic-case', id],
    queryFn: () => orthodonticsService.getCaseById(id!),
    enabled: !!id,
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CaseInsert) => orthodonticsService.createCase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orthodontic-cases'] });
    },
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<OrthodonticCase> }) =>
      orthodonticsService.updateCase(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orthodontic-cases'] });
      queryClient.invalidateQueries({ queryKey: ['orthodontic-case'] });
    },
  });
}

export function useChangeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      caseId,
      newStatus,
      userId,
      notes,
    }: {
      caseId: string;
      newStatus: OrthodonticStatus;
      userId: string;
      notes?: string;
    }) => orthodonticsService.changeStatus(caseId, newStatus, userId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orthodontic-cases'] });
      queryClient.invalidateQueries({ queryKey: ['orthodontic-case'] });
      queryClient.invalidateQueries({ queryKey: ['orthodontic-history'] });
    },
  });
}

export function useBatchUpdatePositions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { id: string; position: number }[]) =>
      orthodonticsService.batchUpdatePositions(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orthodontic-cases'] });
    },
  });
}

export function useOrthodonticCasesByPatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ['orthodontic-cases', 'patient', patientId],
    queryFn: () => orthodonticsService.getCasesByPatient(patientId!),
    enabled: !!patientId,
  });
}

// ==================== Sessions ====================

export function useOrthodonticSessions(caseId: string | null) {
  return useQuery({
    queryKey: ['orthodontic-sessions', caseId],
    queryFn: () => orthodonticsService.getSessions(caseId!),
    enabled: !!caseId,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SessionInsert) => orthodonticsService.createSession(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orthodontic-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['orthodontic-cases'] });
      queryClient.invalidateQueries({ queryKey: ['orthodontic-case'] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<OrthodonticSession> }) =>
      orthodonticsService.updateSession(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orthodontic-sessions'] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orthodonticsService.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orthodontic-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['orthodontic-cases'] });
      queryClient.invalidateQueries({ queryKey: ['orthodontic-case'] });
    },
  });
}

// ==================== History ====================

export function useCaseHistory(caseId: string | null) {
  return useQuery({
    queryKey: ['orthodontic-history', caseId],
    queryFn: () => orthodonticsService.getCaseHistory(caseId!),
    enabled: !!caseId,
  });
}
