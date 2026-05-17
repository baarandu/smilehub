export type ChecklistItemStatus = 'complete' | 'incomplete' | 'empty' | 'not_applicable';

export type SubmissionStatus = 'draft' | 'sent';

export type SubmissionFileType =
  | 'bank_statement_pdf'
  | 'bank_statement_ofx'
  | 'card_machine_report'
  | 'expense_receipt'
  | 'other';

export interface AccountantSubmission {
  id: string;
  clinic_id: string;
  reference_month: string;
  status: SubmissionStatus;
  sent_at: string | null;
  sent_by: string | null;
  recipient_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionFile {
  id: string;
  clinic_id: string;
  reference_month: string;
  file_type: SubmissionFileType;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface ChecklistData {
  reference_month: string;
  submission: AccountantSubmission | { status: SubmissionStatus };
  items: {
    nfse: {
      count: number;
      payments_without_nfse: number;
      status: ChecklistItemStatus;
    };
    expenses: {
      count: number;
      total: number;
      status: ChecklistItemStatus;
    };
    income: {
      count: number;
      total: number;
      dentists_with_revenue: number;
      status: ChecklistItemStatus;
    };
    prolabore: {
      paid: number;
      planned: number;
      status: ChecklistItemStatus;
    };
    card_machine: {
      transactions: number;
      report_uploaded: number;
      status: ChecklistItemStatus;
    };
    bank_statement: {
      pdf_count: number;
      ofx_count: number;
      status: ChecklistItemStatus;
    };
  };
}
