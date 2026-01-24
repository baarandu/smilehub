// Tax Calculation Types
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
  // Joined relation
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
// Form Data Types
// ============================================

export interface TaxRateConfigurationFormData {
  tax_regime: TaxRegime;
  tax_type: TaxType;
  rate_type: RateType;
  flat_rate?: number;
  presumption_rate?: number;
  description?: string;
  effective_from?: string;
  is_active?: boolean;
}

export interface TaxRateBracketFormData {
  min_value: number;
  max_value: number | null;
  rate: number;
  deduction: number;
  bracket_order: number;
}

export interface ISSMunicipalRateFormData {
  city: string;
  state: string;
  rate: number;
  is_default?: boolean;
}

// ============================================
// Calculation Input Types
// ============================================

export interface TaxCalculationInput {
  // Income values
  pf_gross_income: number; // PF gross income (receita bruta PF)
  pj_gross_income: number; // PJ gross income (receita bruta PJ)

  // Deductions for PF
  pf_deductible_expenses: number; // Deducoes do livro caixa

  // For Simples Nacional
  rbt12?: number; // Receita Bruta Acumulada 12 meses

  // For Lucro Real
  real_profit?: number; // Lucro liquido real (after all deductions)
  pj_deductible_expenses?: number; // Operating expenses (PIS/COFINS credits)

  // Additional context
  quarter?: 1 | 2 | 3 | 4; // For quarterly calculations (Lucro Presumido)
  months_in_period?: number; // Number of months being calculated

  // IRRF already withheld
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

  // PF calculation (Carne-Leao)
  pf_calculation?: TaxCalculationResult;

  // PJ calculation (based on regime)
  pj_calculation?: TaxCalculationResult;

  // Totals
  total_pf_taxes: number;
  total_pj_taxes: number;
  combined_total_taxes: number;

  // IRRF already paid
  irrf_already_paid: number;

  // Balance
  balance_due: number; // Positive = pay more, Negative = refund

  // Effective rates
  pf_effective_rate: number;
  pj_effective_rate: number;
  combined_effective_rate: number;
}

// ============================================
// Display/UI Types
// ============================================

export interface TaxRegimeInfo {
  value: TaxRegime;
  label: string;
  description: string;
  applicableTaxTypes: TaxType[];
}

export interface TaxTypeInfo {
  value: TaxType;
  label: string;
  description: string;
}

// Tax regime display information
export const TAX_REGIME_INFO: Record<TaxRegime, TaxRegimeInfo> = {
  pf_carne_leao: {
    value: 'pf_carne_leao',
    label: 'Pessoa Física - Autônomo',
    description: 'Dentista autônomo sem CNPJ. Tabela progressiva mensal do IRPF. Com desconto simplificado vigente, rendimentos até ~R$ 2.824 podem ter isenção prática.',
    applicableTaxTypes: ['irpf', 'inss', 'iss'],
  },
  simples: {
    value: 'simples',
    label: 'Simples Nacional',
    description: 'Regime unificado para ME/EPP. Anexo III (com folha) ou V (sem folha). Fator R define o anexo.',
    applicableTaxTypes: ['das', 'das_anexo_v'],
  },
  lucro_presumido: {
    value: 'lucro_presumido',
    label: 'Lucro Presumido',
    description: 'Base de cálculo presumida de 32% para serviços odontológicos. Impostos sobre faturamento.',
    applicableTaxTypes: ['irpj', 'irpj_adicional', 'csll', 'pis', 'cofins', 'iss'],
  },
  lucro_real: {
    value: 'lucro_real',
    label: 'Lucro Real',
    description: 'Impostos calculados sobre o lucro líquido real. PIS/COFINS não-cumulativo com direito a créditos.',
    applicableTaxTypes: ['irpj', 'irpj_adicional', 'csll', 'pis', 'cofins', 'iss'],
  },
};

export const TAX_TYPE_INFO: Record<TaxType, TaxTypeInfo> = {
  irpf: {
    value: 'irpf',
    label: 'IRPF',
    description: 'Imposto de Renda Pessoa Física',
  },
  irpj: {
    value: 'irpj',
    label: 'IRPJ',
    description: 'Imposto de Renda Pessoa Jurídica',
  },
  irpj_adicional: {
    value: 'irpj_adicional',
    label: 'IRPJ Adicional',
    description: 'Adicional do IRPJ (10% sobre excedente R$20.000/mês)',
  },
  csll: {
    value: 'csll',
    label: 'CSLL',
    description: 'Contribuição Social sobre o Lucro Líquido',
  },
  pis: {
    value: 'pis',
    label: 'PIS',
    description: 'Programa de Integração Social',
  },
  cofins: {
    value: 'cofins',
    label: 'COFINS',
    description: 'Contribuição para Financiamento da Seguridade Social',
  },
  iss: {
    value: 'iss',
    label: 'ISS',
    description: 'Imposto sobre Serviços (2% a 5% conforme município)',
  },
  das: {
    value: 'das',
    label: 'DAS Anexo III',
    description: 'Simples Nacional - Anexo III (Fator R >= 28%)',
  },
  das_anexo_v: {
    value: 'das_anexo_v',
    label: 'DAS Anexo V',
    description: 'Simples Nacional - Anexo V (Fator R < 28%)',
  },
  inss: {
    value: 'inss',
    label: 'INSS',
    description: 'Contribuição Previdenciária (20% autônomo)',
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
