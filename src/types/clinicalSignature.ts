export type RecordType = 'anamnesis' | 'procedure' | 'exam';
export type SignerType = 'patient' | 'dentist';
export type OtpStatus = 'sent' | 'verified' | 'expired' | 'locked';

export interface ClinicalRecordSignature {
  id: string;
  clinic_id: string;
  patient_id: string;
  record_type: RecordType;
  record_id: string;
  signer_type: SignerType;
  signer_name: string;
  signer_user_id: string | null;
  signature_image_url: string | null;
  content_hash: string;
  content_hash_verified: boolean;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string;
  created_at: string;
  batch_document_id: string | null;
  otp_method: string | null;
  otp_challenge_id: string | null;
  otp_email_masked: string | null;
}

export interface OtpSendResponse {
  challenge_id: string;
  expires_at: string;
  attempts_left: number;
  email_masked: string;
  is_minor: boolean;
  // When patient has no email
  error?: 'no_email';
  message?: string;
  patient_name?: string;
}

export interface OtpVerifyResponse {
  verified: boolean;
  otp_verified_token: string;
  challenge_id: string;
}

export interface SignatureCreateResponse {
  id: string;
  signed_at: string;
  content_hash: string;
  content_hash_verified: boolean;
}

export interface BatchSignatureResponse {
  batch_id: string;
  batch_number: string;
  batch_hash: string;
  record_count: number;
  signing_url: string | null;
  storage_path: string;
}

export interface UnsignedRecord {
  record_type: RecordType;
  record_id: string;
  patient_id: string;
  patient_name: string;
  record_date: string;
  record_description: string;
  has_patient_signature: boolean;
  has_dentist_signature: boolean;
}

export interface ClinicalRecordVersion {
  id: string;
  clinic_id: string;
  record_type: RecordType;
  record_id: string;
  version_number: number;
  content_snapshot: Record<string, unknown>;
  content_hash: string;
  edited_by: string | null;
  edited_at: string;
  reason: string | null;
}
