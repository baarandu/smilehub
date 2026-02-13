import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { digitalSignaturesService } from '@/services/digitalSignatures';
import type { CreateSignatureRequest } from '@/types/digitalSignature';
import { toast } from 'sonner';

export function usePatientSignatures(patientId: string | undefined) {
  return useQuery({
    queryKey: ['digital-signatures', patientId],
    queryFn: () => digitalSignaturesService.getByPatient(patientId!),
    enabled: !!patientId,
    refetchInterval: 30000,
  });
}

export function useCreateSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: CreateSignatureRequest) => digitalSignaturesService.createEnvelope(req),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['digital-signatures', variables.patient_id] });
      toast.success('Envelope de assinatura criado!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao criar assinatura digital');
    },
  });
}

export function useRefreshSignatureStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (signatureId: string) => digitalSignaturesService.refreshStatus(signatureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-signatures'] });
    },
  });
}

export function useSigningUrl() {
  return useMutation({
    mutationFn: (signatureId: string) => digitalSignaturesService.getSigningUrl(signatureId),
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao obter URL de assinatura');
    },
  });
}
