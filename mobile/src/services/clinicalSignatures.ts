import { supabase } from '../lib/supabase';
import type {
  ClinicalRecordSignature,
  RecordType,
  SignerType,
  OtpSendResponse,
  OtpVerifyResponse,
  SignatureCreateResponse,
  BatchSignatureResponse,
  UnsignedRecord,
} from '../types/clinicalSignature';

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Não autenticado');
  return token;
}

function getBaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || '';
}

export const clinicalSignaturesService = {
  async getSignaturesForRecord(
    recordType: RecordType,
    recordId: string
  ): Promise<ClinicalRecordSignature[]> {
    const { data, error } = await (supabase.from('clinical_record_signatures') as any)
      .select('*')
      .eq('record_type', recordType)
      .eq('record_id', recordId)
      .order('signed_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getSignatureForRecord(
    recordType: RecordType,
    recordId: string,
    signerType: SignerType
  ): Promise<ClinicalRecordSignature | null> {
    const { data, error } = await (supabase.from('clinical_record_signatures') as any)
      .select('*')
      .eq('record_type', recordType)
      .eq('record_id', recordId)
      .eq('signer_type', signerType)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async sendOtp(
    clinicId: string,
    patientId: string,
    recordType: RecordType,
    recordId: string
  ): Promise<OtpSendResponse> {
    const token = await getAccessToken();
    const res = await fetch(`${getBaseUrl()}/functions/v1/signature-otp-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ clinic_id: clinicId, patient_id: patientId, record_type: recordType, record_id: recordId }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || 'Erro ao enviar OTP');
    }
    return res.json();
  },

  async verifyOtp(challengeId: string, otpCode: string): Promise<OtpVerifyResponse> {
    const token = await getAccessToken();
    const res = await fetch(`${getBaseUrl()}/functions/v1/signature-otp-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ challenge_id: challengeId, otp_code: otpCode }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || 'Erro ao verificar OTP');
    }
    return res.json();
  },

  async createSignature(params: {
    clinic_id: string;
    patient_id: string;
    record_type: RecordType;
    record_id: string;
    signer_type: SignerType;
    signer_name: string;
    content_hash: string;
    otp_verified_token?: string;
    otp_challenge_id?: string;
    signature_image?: string; // base64
  }): Promise<SignatureCreateResponse> {
    const token = await getAccessToken();
    const res = await fetch(`${getBaseUrl()}/functions/v1/clinical-signature-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || 'Erro ao criar assinatura');
    }
    return res.json();
  },

  async getUnsignedRecords(clinicId: string, patientId?: string): Promise<UnsignedRecord[]> {
    const { data, error } = await supabase.rpc('get_unsigned_clinical_records', {
      p_clinic_id: clinicId,
      p_patient_id: patientId || null,
    });

    if (error) throw error;
    return (data as UnsignedRecord[]) || [];
  },

  async createBatch(clinicId: string, records: { record_type: RecordType; record_id: string }[]): Promise<BatchSignatureResponse> {
    const token = await getAccessToken();
    const res = await fetch(`${getBaseUrl()}/functions/v1/batch-signature-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ clinic_id: clinicId, records }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || 'Erro ao criar lote');
    }
    return res.json();
  },
};
