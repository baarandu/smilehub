export type ProlaboreStatus = 'planned' | 'paid' | 'canceled';

export interface ProlaboreWithdrawal {
  id: string;
  clinic_id: string;
  partner_user_id: string | null;
  partner_name: string;
  partner_cpf: string | null;
  reference_month: string; // YYYY-MM-01
  amount: number;
  inss_amount: number;
  irrf_amount: number;
  net_amount: number | null;
  payment_date: string | null;
  status: ProlaboreStatus;
  financial_transaction_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProlaboreInput {
  partner_user_id?: string | null;
  partner_name: string;
  partner_cpf?: string;
  reference_month: string; // any date in target month — backend normalizes
  amount: number;
  inss_amount?: number;
  irrf_amount?: number;
  payment_date?: string;
  status?: ProlaboreStatus;
  notes?: string;
  /** If true, also creates a corresponding financial_transaction (expense) */
  create_expense?: boolean;
}

export interface FatorRStatus {
  faturamento_12m: number;
  folha_12m: number;
  folha_expenses_12m: number;
  folha_prolabore_12m: number;
  fator_r: number;
  fator_r_percent: number;
  threshold_percent: number;
  anexo_recomendado: string;
  anexo_number: 3 | 5;
  periodo: { inicio: string; fim: string };
  status: 'bom' | 'atencao' | 'critico';
  deficit_to_threshold: number;
}

export interface ProlaboreMonthlySummary {
  reference_month: string;
  total_amount: number;
  partner_count: number;
  paid_count: number;
  planned_count: number;
}
