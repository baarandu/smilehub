// Tax Calculation Service for Mobile
import { taxConfigService } from './taxConfig';
import type {
  TaxRegime,
  TaxType,
  TaxRateBracket,
  TaxCalculationInput,
  TaxCalculationResult,
  TaxBreakdownItem,
  TaxSummary,
  MonthlyTaxBreakdown,
  MonthlyTaxInput,
} from '../types/taxCalculations';
import { getTaxRegimeLabel, getTaxTypeLabel, formatTaxRate } from '../types/taxCalculations';

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateProgressiveTax(
  value: number,
  brackets: TaxRateBracket[]
): { tax: number; effectiveRate: number; bracketUsed: string } {
  if (value <= 0 || brackets.length === 0) {
    return { tax: 0, effectiveRate: 0, bracketUsed: 'Isento' };
  }

  const sortedBrackets = [...brackets].sort((a, b) => a.bracket_order - b.bracket_order);
  let applicableBracket: TaxRateBracket | null = null;

  for (const bracket of sortedBrackets) {
    const minOk = value >= bracket.min_value;
    const maxOk = bracket.max_value === null || value <= bracket.max_value;

    if (minOk && maxOk) {
      applicableBracket = bracket;
      break;
    }

    if (bracket.max_value !== null && value > bracket.max_value) {
      continue;
    }
  }

  if (!applicableBracket && sortedBrackets.length > 0) {
    applicableBracket = sortedBrackets[sortedBrackets.length - 1];
  }

  if (!applicableBracket) {
    return { tax: 0, effectiveRate: 0, bracketUsed: 'Isento' };
  }

  const tax = Math.max(0, (value * applicableBracket.rate) - applicableBracket.deduction);
  const effectiveRate = value > 0 ? tax / value : 0;

  const bracketUsed = applicableBracket.rate === 0
    ? 'Isento'
    : `${formatTaxRate(applicableBracket.rate)} (Faixa ${applicableBracket.bracket_order})`;

  return { tax, effectiveRate, bracketUsed };
}

function calculateSimplesNacionalRate(
  monthlyRevenue: number,
  rbt12: number,
  brackets: TaxRateBracket[]
): { tax: number; effectiveRate: number; bracketUsed: string } {
  if (rbt12 <= 0 || monthlyRevenue <= 0 || brackets.length === 0) {
    return { tax: 0, effectiveRate: 0, bracketUsed: 'N/A' };
  }

  const sortedBrackets = [...brackets].sort((a, b) => a.bracket_order - b.bracket_order);
  let applicableBracket: TaxRateBracket | null = null;

  for (const bracket of sortedBrackets) {
    const minOk = rbt12 >= bracket.min_value;
    const maxOk = bracket.max_value === null || rbt12 <= bracket.max_value;

    if (minOk && maxOk) {
      applicableBracket = bracket;
      break;
    }
  }

  if (!applicableBracket && sortedBrackets.length > 0) {
    applicableBracket = sortedBrackets[sortedBrackets.length - 1];
  }

  if (!applicableBracket) {
    return { tax: 0, effectiveRate: 0, bracketUsed: 'N/A' };
  }

  const effectiveRate = Math.max(0, ((rbt12 * applicableBracket.rate) - applicableBracket.deduction) / rbt12);
  const tax = monthlyRevenue * effectiveRate;

  const bracketUsed = `${formatTaxRate(applicableBracket.rate)} (Faixa ${applicableBracket.bracket_order})`;

  return { tax, effectiveRate, bracketUsed };
}

// ============================================
// REGIME-SPECIFIC CALCULATIONS
// ============================================

async function calculatePFCarneLeao(
  input: TaxCalculationInput,
  monthlyInputs?: MonthlyTaxInput[]
): Promise<TaxCalculationResult> {
  const configs = await taxConfigService.getConfigurationsForRegime('pf_carne_leao');
  const irpfConfig = configs.find(c => c.tax_type === 'irpf');
  const inssConfig = configs.find(c => c.tax_type === 'inss');
  const issConfig = configs.find(c => c.tax_type === 'iss');

  const taxes: TaxBreakdownItem[] = [];
  const monthlyBreakdown: MonthlyTaxBreakdown[] = [];

  const baseValue = Math.max(0, input.pf_gross_income - input.pf_deductible_expenses);

  if (irpfConfig && irpfConfig.brackets && irpfConfig.brackets.length > 0) {
    if (monthlyInputs && monthlyInputs.length > 0) {
      let totalIRPF = 0;

      for (const month of monthlyInputs) {
        const monthlyBase = Math.max(0, month.pf_income - month.deductible_expenses);
        const { tax, effectiveRate, bracketUsed } = calculateProgressiveTax(monthlyBase, irpfConfig.brackets);
        totalIRPF += tax;

        monthlyBreakdown.push({
          month: month.month,
          month_name: month.month_name,
          base_value: monthlyBase,
          tax_amount: tax,
          effective_rate: effectiveRate,
          bracket_used: bracketUsed,
        });
      }

      taxes.push({
        tax_type: 'irpf',
        tax_label: getTaxTypeLabel('irpf'),
        base_value: baseValue,
        rate: totalIRPF > 0 ? totalIRPF / baseValue : 0,
        rate_display: 'Progressivo',
        calculated_amount: totalIRPF,
        notes: 'Calculo mensal pela tabela progressiva',
      });
    } else {
      const monthlyBase = baseValue / 12;
      const { tax: monthlyTax, effectiveRate } = calculateProgressiveTax(monthlyBase, irpfConfig.brackets);
      const annualTax = monthlyTax * 12;

      taxes.push({
        tax_type: 'irpf',
        tax_label: getTaxTypeLabel('irpf'),
        base_value: baseValue,
        rate: effectiveRate,
        rate_display: 'Progressivo',
        calculated_amount: annualTax,
        notes: 'Estimativa anual',
      });
    }
  }

  // Calculate INSS (20% contribuicao autonomo)
  if (inssConfig && inssConfig.flat_rate) {
    const inssAmount = input.pf_gross_income * inssConfig.flat_rate;

    taxes.push({
      tax_type: 'inss',
      tax_label: getTaxTypeLabel('inss'),
      base_value: input.pf_gross_income,
      rate: inssConfig.flat_rate,
      rate_display: formatTaxRate(inssConfig.flat_rate),
      calculated_amount: inssAmount,
      notes: 'Contribuicao previdenciaria autonomo',
    });
  }

  if (issConfig && issConfig.flat_rate) {
    const issAmount = input.pf_gross_income * issConfig.flat_rate;

    taxes.push({
      tax_type: 'iss',
      tax_label: getTaxTypeLabel('iss'),
      base_value: input.pf_gross_income,
      rate: issConfig.flat_rate,
      rate_display: formatTaxRate(issConfig.flat_rate),
      calculated_amount: issAmount,
    });
  }

  const totalTaxes = taxes.reduce((sum, t) => sum + t.calculated_amount, 0);

  return {
    regime: 'pf_carne_leao',
    regime_label: getTaxRegimeLabel('pf_carne_leao'),
    base_value: baseValue,
    taxes,
    total_taxes: totalTaxes,
    effective_rate: baseValue > 0 ? totalTaxes / baseValue : 0,
    monthly_breakdown: monthlyBreakdown.length > 0 ? monthlyBreakdown : undefined,
  };
}

async function calculateSimples(
  input: TaxCalculationInput,
  monthlyInputs?: MonthlyTaxInput[]
): Promise<TaxCalculationResult> {
  const configs = await taxConfigService.getConfigurationsForRegime('simples');
  const dasConfig = configs.find(c => c.tax_type === 'das');

  const taxes: TaxBreakdownItem[] = [];
  const monthlyBreakdown: MonthlyTaxBreakdown[] = [];

  const grossIncome = input.pj_gross_income;
  const rbt12 = input.rbt12 || grossIncome;

  if (dasConfig && dasConfig.brackets && dasConfig.brackets.length > 0) {
    if (monthlyInputs && monthlyInputs.length > 0) {
      let totalDAS = 0;

      for (const month of monthlyInputs) {
        const monthlyRevenue = month.pj_income;
        const { tax, effectiveRate, bracketUsed } = calculateSimplesNacionalRate(
          monthlyRevenue,
          rbt12,
          dasConfig.brackets
        );
        totalDAS += tax;

        monthlyBreakdown.push({
          month: month.month,
          month_name: month.month_name,
          base_value: monthlyRevenue,
          tax_amount: tax,
          effective_rate: effectiveRate,
          bracket_used: bracketUsed,
        });
      }

      taxes.push({
        tax_type: 'das',
        tax_label: getTaxTypeLabel('das'),
        base_value: grossIncome,
        rate: grossIncome > 0 ? totalDAS / grossIncome : 0,
        rate_display: 'Progressivo',
        calculated_amount: totalDAS,
      });
    } else {
      const { tax, effectiveRate, bracketUsed } = calculateSimplesNacionalRate(
        grossIncome,
        rbt12,
        dasConfig.brackets
      );

      taxes.push({
        tax_type: 'das',
        tax_label: getTaxTypeLabel('das'),
        base_value: grossIncome,
        rate: effectiveRate,
        rate_display: `${formatTaxRate(effectiveRate)} efetiva`,
        calculated_amount: tax,
        notes: `Nominal: ${bracketUsed}. Efetiva = (RBT12 x Nominal - Deducao) / RBT12`,
      });
    }
  }

  const totalTaxes = taxes.reduce((sum, t) => sum + t.calculated_amount, 0);

  return {
    regime: 'simples',
    regime_label: getTaxRegimeLabel('simples'),
    base_value: grossIncome,
    taxes,
    total_taxes: totalTaxes,
    effective_rate: grossIncome > 0 ? totalTaxes / grossIncome : 0,
    monthly_breakdown: monthlyBreakdown.length > 0 ? monthlyBreakdown : undefined,
  };
}

async function calculateLucroPresumido(input: TaxCalculationInput): Promise<TaxCalculationResult> {
  const configs = await taxConfigService.getConfigurationsForRegime('lucro_presumido');

  const taxes: TaxBreakdownItem[] = [];
  const grossIncome = input.pj_gross_income;

  const getConfig = (taxType: TaxType) => configs.find(c => c.tax_type === taxType);

  const irpjConfig = getConfig('irpj');
  if (irpjConfig && irpjConfig.flat_rate) {
    const presumptionRate = irpjConfig.presumption_rate || 0.32;
    const presumedBase = grossIncome * presumptionRate;
    const irpjAmount = presumedBase * irpjConfig.flat_rate;

    taxes.push({
      tax_type: 'irpj',
      tax_label: getTaxTypeLabel('irpj'),
      base_value: presumedBase,
      rate: irpjConfig.flat_rate,
      rate_display: `${formatTaxRate(irpjConfig.flat_rate)} s/ ${formatTaxRate(presumptionRate)}`,
      calculated_amount: irpjAmount,
    });
  }

  const irpjAdicionalConfig = getConfig('irpj_adicional');
  if (irpjAdicionalConfig && irpjAdicionalConfig.flat_rate) {
    const presumptionRate = irpjAdicionalConfig.presumption_rate || 0.32;
    const presumedBase = grossIncome * presumptionRate;
    const quarters = input.quarter ? 1 : (input.months_in_period ? Math.ceil(input.months_in_period / 3) : 4);
    const threshold = 60000 * quarters;
    const excess = Math.max(0, presumedBase - threshold);
    const adicionalAmount = excess * irpjAdicionalConfig.flat_rate;

    if (adicionalAmount > 0) {
      taxes.push({
        tax_type: 'irpj_adicional',
        tax_label: getTaxTypeLabel('irpj_adicional'),
        base_value: excess,
        rate: irpjAdicionalConfig.flat_rate,
        rate_display: formatTaxRate(irpjAdicionalConfig.flat_rate),
        calculated_amount: adicionalAmount,
      });
    }
  }

  const csllConfig = getConfig('csll');
  if (csllConfig && csllConfig.flat_rate) {
    const presumptionRate = csllConfig.presumption_rate || 0.32;
    const presumedBase = grossIncome * presumptionRate;
    const csllAmount = presumedBase * csllConfig.flat_rate;

    taxes.push({
      tax_type: 'csll',
      tax_label: getTaxTypeLabel('csll'),
      base_value: presumedBase,
      rate: csllConfig.flat_rate,
      rate_display: `${formatTaxRate(csllConfig.flat_rate)} s/ ${formatTaxRate(presumptionRate)}`,
      calculated_amount: csllAmount,
    });
  }

  const pisConfig = getConfig('pis');
  if (pisConfig && pisConfig.flat_rate) {
    const pisAmount = grossIncome * pisConfig.flat_rate;

    taxes.push({
      tax_type: 'pis',
      tax_label: getTaxTypeLabel('pis'),
      base_value: grossIncome,
      rate: pisConfig.flat_rate,
      rate_display: formatTaxRate(pisConfig.flat_rate),
      calculated_amount: pisAmount,
    });
  }

  const cofinsConfig = getConfig('cofins');
  if (cofinsConfig && cofinsConfig.flat_rate) {
    const cofinsAmount = grossIncome * cofinsConfig.flat_rate;

    taxes.push({
      tax_type: 'cofins',
      tax_label: getTaxTypeLabel('cofins'),
      base_value: grossIncome,
      rate: cofinsConfig.flat_rate,
      rate_display: formatTaxRate(cofinsConfig.flat_rate),
      calculated_amount: cofinsAmount,
    });
  }

  const issConfig = getConfig('iss');
  if (issConfig && issConfig.flat_rate) {
    const issAmount = grossIncome * issConfig.flat_rate;

    taxes.push({
      tax_type: 'iss',
      tax_label: getTaxTypeLabel('iss'),
      base_value: grossIncome,
      rate: issConfig.flat_rate,
      rate_display: formatTaxRate(issConfig.flat_rate),
      calculated_amount: issAmount,
    });
  }

  const totalTaxes = taxes.reduce((sum, t) => sum + t.calculated_amount, 0);

  return {
    regime: 'lucro_presumido',
    regime_label: getTaxRegimeLabel('lucro_presumido'),
    base_value: grossIncome,
    taxes,
    total_taxes: totalTaxes,
    effective_rate: grossIncome > 0 ? totalTaxes / grossIncome : 0,
  };
}

async function calculateLucroReal(input: TaxCalculationInput): Promise<TaxCalculationResult> {
  const configs = await taxConfigService.getConfigurationsForRegime('lucro_real');

  const taxes: TaxBreakdownItem[] = [];
  const grossIncome = input.pj_gross_income;
  const realProfit = input.real_profit ?? (grossIncome - (input.pj_deductible_expenses || 0));

  const getConfig = (taxType: TaxType) => configs.find(c => c.tax_type === taxType);

  const irpjConfig = getConfig('irpj');
  if (irpjConfig && irpjConfig.flat_rate && realProfit > 0) {
    const irpjAmount = realProfit * irpjConfig.flat_rate;

    taxes.push({
      tax_type: 'irpj',
      tax_label: getTaxTypeLabel('irpj'),
      base_value: realProfit,
      rate: irpjConfig.flat_rate,
      rate_display: formatTaxRate(irpjConfig.flat_rate),
      calculated_amount: irpjAmount,
    });
  }

  const irpjAdicionalConfig = getConfig('irpj_adicional');
  if (irpjAdicionalConfig && irpjAdicionalConfig.flat_rate && realProfit > 0) {
    const months = input.months_in_period || 12;
    const threshold = 20000 * months;
    const excess = Math.max(0, realProfit - threshold);
    const adicionalAmount = excess * irpjAdicionalConfig.flat_rate;

    if (adicionalAmount > 0) {
      taxes.push({
        tax_type: 'irpj_adicional',
        tax_label: getTaxTypeLabel('irpj_adicional'),
        base_value: excess,
        rate: irpjAdicionalConfig.flat_rate,
        rate_display: formatTaxRate(irpjAdicionalConfig.flat_rate),
        calculated_amount: adicionalAmount,
      });
    }
  }

  const csllConfig = getConfig('csll');
  if (csllConfig && csllConfig.flat_rate && realProfit > 0) {
    const csllAmount = realProfit * csllConfig.flat_rate;

    taxes.push({
      tax_type: 'csll',
      tax_label: getTaxTypeLabel('csll'),
      base_value: realProfit,
      rate: csllConfig.flat_rate,
      rate_display: formatTaxRate(csllConfig.flat_rate),
      calculated_amount: csllAmount,
    });
  }

  const pisConfig = getConfig('pis');
  if (pisConfig && pisConfig.flat_rate) {
    const pisAmount = grossIncome * pisConfig.flat_rate;

    taxes.push({
      tax_type: 'pis',
      tax_label: getTaxTypeLabel('pis'),
      base_value: grossIncome,
      rate: pisConfig.flat_rate,
      rate_display: formatTaxRate(pisConfig.flat_rate),
      calculated_amount: pisAmount,
    });
  }

  const cofinsConfig = getConfig('cofins');
  if (cofinsConfig && cofinsConfig.flat_rate) {
    const cofinsAmount = grossIncome * cofinsConfig.flat_rate;

    taxes.push({
      tax_type: 'cofins',
      tax_label: getTaxTypeLabel('cofins'),
      base_value: grossIncome,
      rate: cofinsConfig.flat_rate,
      rate_display: formatTaxRate(cofinsConfig.flat_rate),
      calculated_amount: cofinsAmount,
    });
  }

  const issConfig = getConfig('iss');
  if (issConfig && issConfig.flat_rate) {
    const issAmount = grossIncome * issConfig.flat_rate;

    taxes.push({
      tax_type: 'iss',
      tax_label: getTaxTypeLabel('iss'),
      base_value: grossIncome,
      rate: issConfig.flat_rate,
      rate_display: formatTaxRate(issConfig.flat_rate),
      calculated_amount: issAmount,
    });
  }

  const totalTaxes = taxes.reduce((sum, t) => sum + t.calculated_amount, 0);

  return {
    regime: 'lucro_real',
    regime_label: getTaxRegimeLabel('lucro_real'),
    base_value: grossIncome,
    taxes,
    total_taxes: totalTaxes,
    effective_rate: grossIncome > 0 ? totalTaxes / grossIncome : 0,
  };
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

export interface CalculateTaxesOptions {
  pjRegime?: TaxRegime;
  includePF?: boolean;
  monthlyInputs?: MonthlyTaxInput[];
}

export async function calculateTaxes(
  input: TaxCalculationInput,
  options: CalculateTaxesOptions = {}
): Promise<TaxSummary> {
  const { pjRegime, includePF = true, monthlyInputs } = options;

  let pfResult: TaxCalculationResult | undefined;
  let pjResult: TaxCalculationResult | undefined;

  if (includePF && input.pf_gross_income > 0) {
    pfResult = await calculatePFCarneLeao(input, monthlyInputs);
  }

  if (pjRegime && input.pj_gross_income > 0) {
    switch (pjRegime) {
      case 'simples':
        pjResult = await calculateSimples(input, monthlyInputs);
        break;
      case 'lucro_presumido':
        pjResult = await calculateLucroPresumido(input);
        break;
      case 'lucro_real':
        pjResult = await calculateLucroReal(input);
        break;
    }
  }

  const totalPFTaxes = pfResult?.total_taxes || 0;
  const totalPJTaxes = pjResult?.total_taxes || 0;
  const combinedTotalTaxes = totalPFTaxes + totalPJTaxes;

  const irrfPaid = input.irrf_withheld || 0;
  const balanceDue = combinedTotalTaxes - irrfPaid;

  const totalIncome = input.pf_gross_income + input.pj_gross_income;

  return {
    year: new Date().getFullYear(),
    pf_calculation: pfResult,
    pj_calculation: pjResult,
    total_pf_taxes: totalPFTaxes,
    total_pj_taxes: totalPJTaxes,
    combined_total_taxes: combinedTotalTaxes,
    irrf_already_paid: irrfPaid,
    balance_due: balanceDue,
    pf_effective_rate: input.pf_gross_income > 0 ? totalPFTaxes / input.pf_gross_income : 0,
    pj_effective_rate: input.pj_gross_income > 0 ? totalPJTaxes / input.pj_gross_income : 0,
    combined_effective_rate: totalIncome > 0 ? combinedTotalTaxes / totalIncome : 0,
  };
}

export const taxCalculationService = {
  calculateTaxes,
  calculatePFCarneLeao,
  calculateSimples,
  calculateLucroPresumido,
  calculateLucroReal,
  calculateProgressiveTax,
  calculateSimplesNacionalRate,
};
