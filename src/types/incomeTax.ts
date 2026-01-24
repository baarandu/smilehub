// Income Tax (Imposto de Renda) Types

export type PayerType = 'PF' | 'PJ';

export type TaxRegime = 'simples' | 'lucro_presumido' | 'lucro_real';

// Fiscal Profile - PF/PJ settings for IR
export interface FiscalProfile {
  id: string;
  clinic_id: string;

  // PF (Pessoa Física)
  pf_enabled: boolean;
  pf_cpf: string | null;
  pf_cro: string | null;
  pf_address: string | null;
  pf_city: string | null;
  pf_state: string | null;
  pf_zip_code: string | null;
  pf_uses_carne_leao: boolean;

  // PJ (Pessoa Jurídica)
  pj_enabled: boolean;
  pj_cnpj: string | null;
  pj_razao_social: string | null;
  pj_nome_fantasia: string | null;
  pj_regime_tributario: TaxRegime | null;
  pj_cnae: string | null;

  created_at: string;
  updated_at: string;
}

export interface FiscalProfileInsert {
  id?: string;
  clinic_id: string;
  pf_enabled?: boolean;
  pf_cpf?: string | null;
  pf_cro?: string | null;
  pf_address?: string | null;
  pf_city?: string | null;
  pf_state?: string | null;
  pf_zip_code?: string | null;
  pf_uses_carne_leao?: boolean;
  pj_enabled?: boolean;
  pj_cnpj?: string | null;
  pj_razao_social?: string | null;
  pj_nome_fantasia?: string | null;
  pj_regime_tributario?: TaxRegime | null;
  pj_cnae?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FiscalProfileUpdate {
  pf_enabled?: boolean;
  pf_cpf?: string | null;
  pf_cro?: string | null;
  pf_address?: string | null;
  pf_city?: string | null;
  pf_state?: string | null;
  pf_zip_code?: string | null;
  pf_uses_carne_leao?: boolean;
  pj_enabled?: boolean;
  pj_cnpj?: string | null;
  pj_razao_social?: string | null;
  pj_nome_fantasia?: string | null;
  pj_regime_tributario?: TaxRegime | null;
  pj_cnae?: string | null;
  updated_at?: string;
}

// PJ Source - Insurance/Company payer sources
export interface PJSource {
  id: string;
  clinic_id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PJSourceInsert {
  id?: string;
  clinic_id: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PJSourceUpdate {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string | null;
  is_active?: boolean;
  updated_at?: string;
}

// Extended transaction fields for IR
export interface IRTransactionFields {
  // Payer data (for income)
  payer_is_patient: boolean;
  payer_name: string | null;
  payer_cpf: string | null;
  payer_type: PayerType | null;
  pj_source_id: string | null;
  irrf_amount: number;

  // Supplier data (for expenses - Livro Caixa)
  supplier_name: string | null;
  supplier_cpf_cnpj: string | null;
  receipt_number: string | null;
  receipt_attachment_url: string | null;
  is_deductible: boolean;
}

// Extended transaction with IR fields
export interface TransactionWithIR {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  location: string | null;
  patient_id: string | null;
  clinic_id: string | null;
  payment_method: string | null;
  net_amount: number | null;

  // IR fields
  payer_is_patient: boolean;
  payer_name: string | null;
  payer_cpf: string | null;
  payer_type: PayerType | null;
  pj_source_id: string | null;
  irrf_amount: number;
  supplier_name: string | null;
  supplier_cpf_cnpj: string | null;
  receipt_number: string | null;
  receipt_attachment_url: string | null;
  is_deductible: boolean;

  // Relations
  patient?: {
    name: string;
    cpf: string | null;
  } | null;
  pj_source?: PJSource | null;

  created_at: string;
  updated_at: string;
}

// Monthly summary for IR report
export interface IRMonthlySummary {
  month: number;
  month_name: string;
  income_pf: number;
  income_pj: number;
  income_total: number;
  irrf_total: number;
  expenses_deductible: number;
}

// PF Payer summary for IR report
export interface IRPayerPFSummary {
  cpf: string;
  name: string;
  total_amount: number;
  transaction_count: number;
}

// PJ Source summary for IR report
export interface IRPayerPJSummary {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  total_amount: number;
  irrf_total: number;
  transaction_count: number;
}

// Expense category summary for IR report
export interface IRExpenseCategorySummary {
  category: string;
  total_amount: number;
  transaction_count: number;
}

// Annual IR Summary
export interface IRSummary {
  year: number;

  // Totals
  total_income_pf: number;
  total_income_pj: number;
  total_income: number;
  total_irrf: number;
  total_expenses_deductible: number;
  net_result: number;

  // Monthly breakdown
  monthly: IRMonthlySummary[];

  // Payers breakdown
  payers_pf: IRPayerPFSummary[];
  payers_pj: IRPayerPJSummary[];

  // Expenses breakdown
  expenses_by_category: IRExpenseCategorySummary[];

  // Fiscal profile data
  fiscal_profile: FiscalProfile | null;
}

// Validation issue types
export type IRValidationIssueType =
  | 'missing_payer_cpf'
  | 'missing_payer_name'
  | 'missing_pj_source'
  | 'missing_supplier_data'
  | 'missing_receipt'
  | 'missing_fiscal_profile'
  | 'invalid_cpf'
  | 'invalid_cnpj';

export interface IRValidationIssue {
  type: IRValidationIssueType;
  severity: 'error' | 'warning';
  transaction_id: string | null;
  transaction_date: string | null;
  transaction_description: string | null;
  message: string;
}

// Form data types
export interface FiscalProfileFormData {
  pf_enabled: boolean;
  pf_cpf: string;
  pf_cro: string;
  pf_address: string;
  pf_city: string;
  pf_state: string;
  pf_zip_code: string;
  pf_uses_carne_leao: boolean;
  pj_enabled: boolean;
  pj_cnpj: string;
  pj_razao_social: string;
  pj_nome_fantasia: string;
  pj_regime_tributario: TaxRegime | '';
  pj_cnae: string;
}

export interface PJSourceFormData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  is_active: boolean;
}

export interface PayerFormData {
  payer_is_patient: boolean;
  payer_name: string;
  payer_cpf: string;
  payer_type: PayerType;
  pj_source_id: string;
  irrf_amount: string;
}

export interface SupplierFormData {
  supplier_name: string;
  supplier_cpf_cnpj: string;
  receipt_number: string;
  is_deductible: boolean;
}

// Export helpers
export interface IRExportOptions {
  year: number;
  format: 'pdf' | 'excel' | 'csv';
  include_details: boolean;
}
