import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountantChecklistService } from '@/services/accountantChecklist';
import type { SubmissionFileType } from '@/types/accountantChecklist';

export function useAccountantChecklist(year: number, month: number) {
  return useQuery({
    queryKey: ['accountant-checklist', year, month],
    queryFn: () => accountantChecklistService.getChecklist(year, month),
    staleTime: 30_000,
  });
}

export function useAccountantFiles(year: number, month: number) {
  return useQuery({
    queryKey: ['accountant-files', year, month],
    queryFn: () => accountantChecklistService.listFiles(year, month),
  });
}

export function useUploadAccountantFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      year: number;
      month: number;
      fileType: SubmissionFileType;
      file: File;
      notes?: string;
    }) =>
      accountantChecklistService.uploadFile(params.year, params.month, params.fileType, params.file, params.notes),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['accountant-checklist', vars.year, vars.month] });
      qc.invalidateQueries({ queryKey: ['accountant-files', vars.year, vars.month] });
    },
  });
}

export function useDeleteAccountantFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; year: number; month: number }) =>
      accountantChecklistService.deleteFile(params.id),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['accountant-checklist', vars.year, vars.month] });
      qc.invalidateQueries({ queryKey: ['accountant-files', vars.year, vars.month] });
    },
  });
}

export function useMarkSubmissionSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      year: number;
      month: number;
      recipient_email?: string;
      notes?: string;
    }) =>
      accountantChecklistService.markAsSent(params.year, params.month, {
        recipient_email: params.recipient_email,
        notes: params.notes,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['accountant-checklist', vars.year, vars.month] });
    },
  });
}

export function useRevertSubmissionToDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { year: number; month: number }) =>
      accountantChecklistService.revertToDraft(params.year, params.month),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['accountant-checklist', vars.year, vars.month] });
    },
  });
}
