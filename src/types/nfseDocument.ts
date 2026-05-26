export type NfseStatus = 'issued' | 'canceled' | 'substituted';

export interface NfseDocument {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  budget_id: string | null;
  financial_transaction_id: string | null;
  tooth_index: number | null;
  dentist_id: string | null;

  invoice_number: string;
  issue_date: string; // YYYY-MM-DD
  reference_month: string; // YYYY-MM-01
  service_value: number;
  tax_value: number;
  net_value: number | null;
  service_description: string | null;

  status: NfseStatus;
  substituted_by_id: string | null;
  cancellation_reason: string | null;
  canceled_at: string | null;

  xml_url: string | null;
  pdf_url: string | null;
  issued_externally: boolean;

  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NfseDocumentWithRelations extends NfseDocument {
  patient_name?: string | null;
  dentist_name?: string | null;
}

export interface NfseUploadInput {
  invoice_number: string;
  issue_date: string;
  service_value: number;
  tax_value?: number;
  net_value?: number;
  service_description?: string;
  patient_id?: string | null;
  budget_id?: string | null;
  financial_transaction_id?: string | null;
  tooth_index?: number | null;
  dentist_id?: string | null;
  notes?: string;
  xml_file?: File | null;
  pdf_file?: File | null;
}

export interface MarkExternalNfseInput {
  patient_id: string;
  budget_id: string;
  tooth_index: number;
  service_value: number;
  issue_date: string;
  service_description?: string;
}

export interface PaymentWithoutNfse {
  transaction_id: string;
  transaction_date: string;
  amount: number;
  patient_id: string | null;
  patient_name: string | null;
  dentist_id: string | null;
  description: string;
}
