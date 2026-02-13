import { supabase } from '@/lib/supabase';
import type {
  DigitalSignature,
  CreateSignatureRequest,
  CreateSignatureResponse,
  SignatureStatusResponse,
  SigningUrlResponse,
} from '@/types/digitalSignature';

async function callEdgeFunction<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  console.log('[digitalSignatures] Calling edge function:', action);

  const { data, error } = await supabase.functions.invoke('supersign-envelope', {
    body: { action, ...payload },
  });

  if (error) {
    console.error('[digitalSignatures] Error:', error);
    // Try to extract the actual error message from the response
    let message = error.message || 'Erro na operação de assinatura digital';
    if (error.context && typeof error.context.json === 'function') {
      try {
        const body = await error.context.json();
        console.error('[digitalSignatures] Server error body:', body);
        message = body.error || message;
      } catch { /* ignore parse errors */ }
    }
    throw new Error(message);
  }

  return data as T;
}

export const digitalSignaturesService = {
  async createEnvelope(req: CreateSignatureRequest): Promise<CreateSignatureResponse> {
    return callEdgeFunction<CreateSignatureResponse>('create', req as unknown as Record<string, unknown>);
  },

  async getSigningUrl(signatureId: string): Promise<SigningUrlResponse> {
    return callEdgeFunction<SigningUrlResponse>('signing-url', { signature_id: signatureId });
  },

  async refreshStatus(signatureId: string): Promise<SignatureStatusResponse> {
    return callEdgeFunction<SignatureStatusResponse>('status', { signature_id: signatureId });
  },

  async getByPatient(patientId: string): Promise<DigitalSignature[]> {
    const { data, error } = await (supabase
      .from('digital_signatures') as any)
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
