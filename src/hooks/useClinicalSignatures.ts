import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicalSignaturesService } from '@/services/clinicalSignatures';
import { useClinic } from '@/contexts/ClinicContext';
import type { RecordType } from '@/types/clinicalSignature';
import { toast } from 'sonner';

export function useRecordSignatures(recordType: RecordType, recordId: string | undefined) {
  return useQuery({
    queryKey: ['clinical-signatures', recordType, recordId],
    queryFn: () => clinicalSignaturesService.getSignaturesForRecord(recordType, recordId!),
    enabled: !!recordId,
  });
}

export function useRecordSignature(recordType: RecordType, recordId: string | undefined, signerType: 'patient' | 'dentist') {
  return useQuery({
    queryKey: ['clinical-signature', recordType, recordId, signerType],
    queryFn: () => clinicalSignaturesService.getSignatureForRecord(recordType, recordId!, signerType),
    enabled: !!recordId,
  });
}

export function useSendOtp() {
  return useMutation({
    mutationFn: clinicalSignaturesService.sendOtp,
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ challengeId, otpCode }: { challengeId: string; otpCode: string }) =>
      clinicalSignaturesService.verifyOtp(challengeId, otpCode),
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clinicalSignaturesService.createSignature,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['clinical-signatures', variables.record_type, variables.record_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['clinical-signature', variables.record_type, variables.record_id],
      });
      toast.success('Assinatura registrada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUnsignedRecords(patientId?: string) {
  const { clinicId } = useClinic();

  return useQuery({
    queryKey: ['unsigned-records', clinicId, patientId],
    queryFn: () => clinicalSignaturesService.getUnsignedRecords(clinicId!, patientId),
    enabled: !!clinicId,
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clinicalSignaturesService.createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unsigned-records'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-signatures'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
