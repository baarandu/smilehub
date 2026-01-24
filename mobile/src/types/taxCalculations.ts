// Tax Calculation Types for Mobile
// Types for configurable tax rates and calculations

export type TaxRegime = 'pf_carne_leao' | 'simples' | 'lucro_presumido' | 'lucro_real';
export type TaxType = 'irpf' | 'irpj' | 'irpj_adicional' | 'csll' | 'pis' | 'cofins' | 'iss' | 'das' | 'das_anexo_v' | 'inss';
export type RateType = 'flat' | 'progressive';

// ============================================
// Database Table Types
// ============================================

export interface TaxRateConfiguration {
  id: string;
  clinic_id: string;
  tax_regime: TaxRegime;
  tax_type: TaxType;
  rate_type: RateType;
  flat_rate: number | null;
  presumption_rate: number | null;
  description: string | null;
  effective_from: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  brackets?: TaxRateBracket[];
}

export interface TaxRateBracket {
  id: string;
  tax_configuration_id: string;
  min_value: number;
  max_value: number | null;
  rate: number;
  deduction: number;
  bracket_order: number;
  created_at: string;
  updated_at: string;
}

export interface ISSMunicipalRate {
  id: string;
  clinic_id: string;
  city: string;
  state: string;
  rate: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Calculation Input Types
// ============================================

export interface TaxCalculationInput {
  pf_gross_income: number;
  pj_gross_income: number;
  pf_deductible_expenses: number;
  rbt12?: number;
  real_profit?: number;
  pj_deductible_expenses?: number;
  quarter?: 1 | 2 | 3 | 4;
  months_in_period?: number;
  irrf_withheld: number;
}

export interface MonthlyTaxInput {
  month: number;
  month_name: string;
  pf_income: number;
  pj_income: number;
  deductible_expenses: number;
  irrf_withheld: number;
}

// ============================================
// Calculation Result Types
// ============================================

export interface TaxBreakdownItem {
  tax_type: TaxType;
  tax_label: string;
  base_value: number;
  rate: number;
  rate_display: string;
  calculated_amount: number;
  notes?: string;
}

export interface MonthlyTaxBreakdown {
  month: number;
  month_name: string;
  base_value: number;
  tax_amount: number;
  effective_rate: number;
  bracket_used?: string;
}

export interface TaxCalculationResult {
  regime: TaxRegime;
  regime_label: string;
  base_value: number;
  taxes: TaxBreakdownItem[];
  total_taxes: number;
  effective_rate: number;
  monthly_breakdown?: MonthlyTaxBreakdown[];
}

export interface TaxSummary {
  year: number;
  pf_calculation?: TaxCalculationResult;
  pj_calculation?: TaxCalculationResult;
  total_pf_taxes: number;
  total_pj_taxes: number;
  combined_total_taxes: number;
  irrf_already_paid: number;
  balance_due: number;
  pf_effective_rate: number;
  pj_effective_rate: number;
  combined_effective_rate: number;
}

// ============================================
// Display/UI Types
// ============================================

export interface TaxRegimeInfo {
  label: string;
  description: string;
}

export interface TaxTypeInfo {
  label: string;
  description: string;
}

export const TAX_REGIME_INFO: Record<TaxRegime, TaxRegimeInfo> = {
  pf_carne_leao: {
    label: 'Pessoa Fisica - Autonomo',
    description: 'Dentista autonomo sem CNPJ. Tabela progressiva mensal do IRPF com isencao ate R$5.000.',
  },
  simples: {
    label: 'Simples Nacional',
    description: 'Regime unificado para ME/EPP. Anexo III (com folha) ou V (sem folha). Fator R define o anexo.',
  },
  lucro_presumido: {
    label: 'Lucro Presumido',
    description: 'Base de calculo presumida de 32% para servicos odontologicos. Impostos sobre faturamento.',
  },
  lucro_real: {
    label: 'Lucro Real',
    description: 'Impostos calculados sobre o lucro liquido real. PIS/COFINS nao-cumulativo com direito a creditos.',
  },
};

export const TAX_TYPE_INFO: Record<TaxType, TaxTypeInfo> = {
  irpf: {
    label: 'IRPF',
    description: 'Imposto de Renda Pessoa Fisica',
  },
  irpj: {
    label: 'IRPJ',
    description: 'Imposto de Renda Pessoa Juridica',
  },
  irpj_adicional: {
    label: 'IRPJ Adicional',
    description: 'Adicional do IRPJ (10% sobre excedente R$20.000/mes)',
  },
  csll: {
    label: 'CSLL',
    description: 'Contribuicao Social sobre o Lucro Liquido',
  },
  pis: {
    label: 'PIS',
    description: 'Programa de Integracao Social',
  },
  cofins: {
    label: 'COFINS',
    description: 'Contribuicao para Financiamento da Seguridade Social',
  },
  iss: {
    label: 'ISS',
    description: 'Imposto sobre Servicos (2% a 5% conforme municipio)',
  },
  das: {
    label: 'DAS Anexo III',
    description: 'Simples Nacional - Anexo III (Fator R >= 28%)',
  },
  das_anexo_v: {
    label: 'DAS Anexo V',
    description: 'Simples Nacional - Anexo V (Fator R < 28%)',
  },
  inss: {
    label: 'INSS',
    description: 'Contribuicao Previdenciaria (20% autonomo)',
  },
};

// ============================================
// Helper Functions
// ============================================

export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getTaxRegimeLabel(regime: TaxRegime): string {
  return TAX_REGIME_INFO[regime]?.label || regime;
}

export function getTaxTypeLabel(type: TaxType): string {
  return TAX_TYPE_INFO[type]?.label || type;
}
