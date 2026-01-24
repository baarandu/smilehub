// Income Tax types for mobile app

export interface FiscalProfile {
  id: string;
  clinic_id: string;
  pf_enabled: boolean;
  pf_cpf: string | null;
  pf_cro: string | null;
  pf_address: string | null;
  pf_city: string | null;
  pf_state: string | null;
  pf_zip_code: string | null;
  pf_uses_carne_leao: boolean;
  pj_enabled: boolean;
  pj_cnpj: string | null;
  pj_razao_social: string | null;
  pj_nome_fantasia: string | null;
  pj_regime_tributario: 'simples' | 'lucro_presumido' | 'lucro_real' | null;
  pj_cnae: string | null;
  created_at: string;
  updated_at: string;
}

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
  pj_regime_tributario: string;
  pj_cnae: string;
}

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

export interface PJSourceFormData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  is_active: boolean;
}

export type PayerType = 'PF' | 'PJ';

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

export interface TransactionWithIR {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  category: string;
  payment_method: string | null;
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
  patient?: { name: string; cpf: string | null };
  pj_source?: PJSource;
}

export interface IRMonthlySummary {
  month: number;
  month_name: string;
  income_pf: number;
  income_pj: number;
  income_total: number;
  irrf_total: number;
  expenses_deductible: number;
}

export interface IRPayerPF {
  cpf: string;
  name: string;
  total_amount: number;
  transaction_count: number;
}

export interface IRPayerPJ {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  total_amount: number;
  irrf_total: number;
  transaction_count: number;
}

export interface IRExpenseCategory {
  category: string;
  total_amount: number;
  transaction_count: number;
}

export interface IRSummary {
  year: number;
  fiscal_profile: FiscalProfile | null;
  total_income: number;
  total_income_pf: number;
  total_income_pj: number;
  total_irrf: number;
  total_expenses: number;
  total_expenses_deductible: number;
  net_result: number;
  monthly: IRMonthlySummary[];
  payers_pf: IRPayerPF[];
  payers_pj: IRPayerPJ[];
  expenses_by_category: IRExpenseCategory[];
}

export interface IRValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  field?: string;
  transaction_id?: string;
  transaction_date?: string;
}
