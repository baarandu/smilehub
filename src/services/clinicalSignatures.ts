import { supabase } from '@/lib/supabase';
import type {
  ClinicalRecordSignature,
  OtpSendResponse,
  OtpVerifyResponse,
  SignatureCreateResponse,
  BatchSignatureResponse,
  UnsignedRecord,
  RecordType,
} from '@/types/clinicalSignature';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');
  return session.access_token;
}

export const clinicalSignaturesService = {
  // ── Signatures CRUD ──

  async getSignaturesForRecord(recordType: RecordType, recordId: string): Promise<ClinicalRecordSignature[]> {
    const { data, error } = await supabase
      .from('clinical_record_signatures')
      .select('*')
      .eq('record_type', recordType)
      .eq('record_id', recordId)
      .order('signed_at', { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as ClinicalRecordSignature[];
  },

  async getSignatureForRecord(recordType: RecordType, recordId: string, signerType: 'patient' | 'dentist'): Promise<ClinicalRecordSignature | null> {
    const { data, error } = await supabase
      .from('clinical_record_signatures')
      .select('*')
      .eq('record_type', recordType)
      .eq('record_id', recordId)
      .eq('signer_type', signerType)
      .maybeSingle();

    if (error) throw error;
    return data as unknown as ClinicalRecordSignature | null;
  },

  // ── OTP Flow ──

  async sendOtp(params: {
    clinic_id: string;
    patient_id: string;
    record_type: RecordType;
    record_id: string;
  }): Promise<OtpSendResponse> {
    const token = await getAccessToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/signature-otp-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok && !data.error?.includes('no_email')) {
      throw new Error(data.error || 'Erro ao enviar OTP');
    }
    return data;
  },

  async verifyOtp(challengeId: string, otpCode: string): Promise<OtpVerifyResponse> {
    const token = await getAccessToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/signature-otp-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        challenge_id: challengeId,
        otp_code: otpCode,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao verificar OTP');
    return data;
  },

  // ── Create Signature ──

  async createSignature(params: {
    clinic_id: string;
    patient_id: string;
    record_type: RecordType;
    record_id: string;
    signer_type: 'patient' | 'dentist';
    signer_name: string;
    content_hash: string;
    signature_image?: Blob;
    otp_verified_token?: string;
    otp_challenge_id?: string;
  }): Promise<SignatureCreateResponse> {
    const token = await getAccessToken();
    const formData = new FormData();

    formData.append('clinic_id', params.clinic_id);
    formData.append('patient_id', params.patient_id);
    formData.append('record_type', params.record_type);
    formData.append('record_id', params.record_id);
    formData.append('signer_type', params.signer_type);
    formData.append('signer_name', params.signer_name);
    formData.append('content_hash', params.content_hash);

    if (params.signature_image) {
      formData.append('signature_image', params.signature_image, 'signature.png');
    }
    if (params.otp_verified_token) {
      formData.append('otp_verified_token', params.otp_verified_token);
    }
    if (params.otp_challenge_id) {
      formData.append('otp_challenge_id', params.otp_challenge_id);
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/clinical-signature-create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar assinatura');
    return data;
  },

  // ── Batch Signatures ──

  async getUnsignedRecords(clinicId: string, patientId?: string): Promise<UnsignedRecord[]> {
    const { data, error } = await supabase.rpc('get_unsigned_clinical_records', {
      p_clinic_id: clinicId,
      p_patient_id: patientId || null,
    });

    if (error) throw error;
    return (data || []) as unknown as UnsignedRecord[];
  },

  async createBatch(params: {
    clinic_id: string;
    records: { record_type: string; record_id: string }[];
  }): Promise<BatchSignatureResponse> {
    const token = await getAccessToken();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/batch-signature-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao criar lote');
    return data;
  },
};
