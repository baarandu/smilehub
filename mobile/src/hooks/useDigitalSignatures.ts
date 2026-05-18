import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { digitalSignaturesService } from '../services/digitalSignatures';
import type {
  DigitalSignature,
  CreateSignatureRequest,
  CreateSignatureResponse,
  SignatureStatusResponse,
  SigningUrlResponse,
} from '../types/digitalSignature';

const POLL_INTERVAL_MS = 30000;

export function usePatientSignatures(patientId: string | undefined) {
  const isMounted = useRef(true);
  const [data, setData] = useState<DigitalSignature[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await digitalSignaturesService.getByPatient(patientId);
      if (isMounted.current) setData(result);
    } catch (e) {
      if (isMounted.current) setError(e as Error);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useCreateSignature() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (req: CreateSignatureRequest): Promise<CreateSignatureResponse | null> => {
    setIsPending(true);
    try {
      const result = await digitalSignaturesService.createEnvelope(req);
      Alert.alert('Sucesso', 'Envelope de assinatura criado!');
      return result;
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao criar assinatura digital');
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync: mutate, isPending };
}

export function useRefreshSignatureStatus() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (signatureId: string): Promise<SignatureStatusResponse | null> => {
    setIsPending(true);
    try {
      return await digitalSignaturesService.refreshStatus(signatureId);
    } catch {
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync: mutate, isPending };
}

export function useSigningUrl() {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(async (signatureId: string): Promise<SigningUrlResponse | null> => {
    setIsPending(true);
    try {
      return await digitalSignaturesService.getSigningUrl(signatureId);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Erro ao obter URL de assinatura');
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync: mutate, isPending };
}
