import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nfseDocumentsService } from '@/services/nfseDocuments';
import type { NfseUploadInput, NfseStatus, MarkExternalNfseInput } from '@/types/nfseDocument';

export function useNfseByPatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ['nfse', 'patient', patientId],
    queryFn: () => nfseDocumentsService.listByPatient(patientId!),
    enabled: !!patientId,
  });
}

export function useNfseByMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['nfse', 'month', year, month],
    queryFn: () => nfseDocumentsService.listByMonth(year, month),
  });
}

export function usePaymentsWithoutNfse(year: number, month: number) {
  return useQuery({
    queryKey: ['nfse', 'payments-without', year, month],
    queryFn: () => nfseDocumentsService.getPaymentsWithoutNfse(year, month),
  });
}

export function useUnlinkedPaymentsByPatient(patientId: string | null | undefined) {
  return useQuery({
    queryKey: ['nfse', 'unlinked-by-patient', patientId],
    queryFn: () => nfseDocumentsService.getUnlinkedPaymentsByPatient(patientId!),
    enabled: !!patientId,
  });
}

export function useCreateNfse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NfseUploadInput) => nfseDocumentsService.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nfse'] });
    },
  });
}

export function useUpdateNfseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      status: NfseStatus;
      cancellation_reason?: string;
      substituted_by_id?: string;
    }) =>
      nfseDocumentsService.updateStatus(params.id, params.status, {
        cancellation_reason: params.cancellation_reason,
        substituted_by_id: params.substituted_by_id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nfse'] });
    },
  });
}

export function useDeleteNfse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nfseDocumentsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nfse'] });
    },
  });
}

export function useMarkExternalNfse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MarkExternalNfseInput) => nfseDocumentsService.markIssuedExternally(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nfse'] });
    },
  });
}

export function useUnmarkExternalNfse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { budgetId: string; toothIndex: number }) =>
      nfseDocumentsService.unmarkIssuedExternally(params.budgetId, params.toothIndex),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nfse'] });
    },
  });
}
