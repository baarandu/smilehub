export type SignatureStatus =
  | 'PENDING_UPLOAD'
  | 'DRAFT'
  | 'PROCESSING'
  | 'SENT'
  | 'SEALING'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'VOIDED'
  | 'ERROR';

export type SignatoryStatus =
  | 'PENDING'
  | 'WAITING_TURN'
  | 'VIEWED'
  | 'SIGNED'
  | 'REJECTED';

export type DeliveryMethod = 'EMAIL' | 'WHATSAPP';

export interface DigitalSignature {
  id: string;
  clinic_id: string;
  patient_id: string;
  created_by: string;
  envelope_id: string | null;
  title: string;
  status: SignatureStatus;
  document_template_id: string | null;
  original_pdf_url: string | null;
  signed_pdf_url: string | null;
  exam_id: string | null;
  dentist_signatory_id: string | null;
  dentist_status: SignatoryStatus | null;
  dentist_signature_token: string | null;
  patient_signatory_id: string | null;
  patient_status: SignatoryStatus | null;
  patient_delivery_method: DeliveryMethod | null;
  deadline: string | null;
  error_message: string | null;
  supersign_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CreateSignatureRequest {
  patient_id: string;
  clinic_id: string;
  title: string;
  pdf_storage_path: string;
  needs_patient_signature: boolean;
  patient_delivery_method?: DeliveryMethod;
  document_template_id?: string;
}

export interface CreateSignatureResponse {
  signature_id: string;
  envelope_id: string;
  dentist_signing_url: string;
}

export interface SignatureStatusResponse {
  id: string;
  status: SignatureStatus;
  dentist_status: SignatoryStatus | null;
  patient_status: SignatoryStatus | null;
  signed_pdf_url: string | null;
  completed_at: string | null;
}

export interface SigningUrlResponse {
  signing_url: string;
}
