import { useState, useEffect } from 'react';
import { Calculator, TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { calculateTaxes, type CalculateTaxesOptions } from '@/services/taxCalculationService';
import type {
  TaxSummary,
  TaxCalculationResult,
  TaxBreakdownItem,
  MonthlyTaxBreakdown,
  TaxCalculationInput,
  MonthlyTaxInput,
} from '@/types/taxCalculations';
import type { IRSummary, TaxRegime } from '@/types/incomeTax';
import { formatCurrency, formatTaxRate, getTaxTypeLabel } from '@/types/taxCalculations';
import { taxConfigService } from '@/services/taxConfigService';

interface TaxCalculationSectionProps {
  summary: IRSummary;
  year: number;
  onConfigUpdated?: () => void;
}

export function TaxCalculationSection({ summary, year, onConfigUpdated }: TaxCalculationSectionProps) {
  const [loading, setLoading] = useState(true);
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [showPFDetails, setShowPFDetails] = useState(false);
  const [showPJDetails, setShowPJDetails] = useState(false);
  const [showMonthly, setShowMonthly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    calculateTaxSummary();
  }, [summary]);

  const calculateTaxSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      // Ensure default rates are initialized
      await taxConfigService.initializeDefaultRates();

      // Build monthly inputs from summary
      const monthlyInputs: MonthlyTaxInput[] = summary.monthly.map(m => ({
        month: m.month,
        month_name: m.month_name,
        pf_income: m.income_pf,
        pj_income: m.income_pj,
        deductible_expenses: m.expenses_deductible,
        irrf_withheld: m.irrf_total,
      }));

      // Build calculation input
      const input: TaxCalculationInput = {
        pf_gross_income: summary.total_income_pf,
        pj_gross_income: summary.total_income_pj,
        pf_deductible_expenses: summary.total_expenses_deductible,
        irrf_withheld: summary.total_irrf,
        // For Simples, use annual income as RBT12 (simplified)
        rbt12: summary.total_income_pj,
        months_in_period: 12,
      };

      // Determine PJ regime from fiscal profile
      const pjRegime = summary.fiscal_profile?.pj_regime_tributario as TaxRegime | undefined;

      const options: CalculateTaxesOptions = {
        pjRegime: summary.fiscal_profile?.pj_enabled ? pjRegime : undefined,
        includePF: summary.fiscal_profile?.pf_enabled && summary.fiscal_profile?.pf_uses_carne_leao,
        monthlyInputs,
      };

      const result = await calculateTaxes(input, options);
      result.year = year;

      setTaxSummary(result);
    } catch (error) {
      console.error('Error calculating taxes:', error);
      setError('Erro ao calcular impostos. Verifique as configuracoes de base de calculo.');
    } finally {
      setLoading(false);
    }
  };

  const renderTaxBreakdown = (taxes: TaxBreakdownItem[]) => {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imposto</TableHead>
            <TableHead className="text-right">Base de Calculo</TableHead>
            <TableHead className="text-right">Aliquota</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {taxes.map((tax, index) => (
            <TableRow key={index}>
              <TableCell>
                <div>
                  <span className="font-medium">{tax.tax_label}</span>
                  {tax.notes && (
                    <p className="text-xs text-muted-foreground">{tax.notes}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(tax.base_value)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {tax.rate_display}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(tax.calculated_amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderMonthlyBreakdown = (monthly: MonthlyTaxBreakdown[]) => {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mes</TableHead>
            <TableHead className="text-right">Base</TableHead>
            <TableHead className="text-right">Aliquota Efetiva</TableHead>
            <TableHead className="text-right">Imposto</TableHead>
            <TableHead>Faixa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monthly.map((m) => (
            <TableRow key={m.month}>
              <TableCell>{m.month_name}</TableCell>
              <TableCell className="text-right">{formatCurrency(m.base_value)}</TableCell>
              <TableCell className="text-right font-mono">
                {formatTaxRate(m.effective_rate)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(m.tax_amount)}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {m.bracket_used}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/50">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">
              {formatCurrency(monthly.reduce((s, m) => s + m.base_value, 0))}
            </TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right">
              {formatCurrency(monthly.reduce((s, m) => s + m.tax_amount, 0))}
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  };

  const renderCalculationResult = (
    result: TaxCalculationResult,
    title: string,
    showDetails: boolean,
    setShowDetails: (v: boolean) => void
  ) => {
    return (
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{result.regime_label}</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-teal-600">
                {formatCurrency(result.total_taxes)}
              </p>
              <p className="text-sm text-muted-foreground">
                Aliquota efetiva: {formatTaxRate(result.effective_rate)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Ver detalhamento</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {renderTaxBreakdown(result.taxes)}

              {result.monthly_breakdown && result.monthly_breakdown.length > 0 && (
                <Collapsible open={showMonthly} onOpenChange={setShowMonthly}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      <span>Detalhamento mensal</span>
                      {showMonthly ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">
                    {renderMonthlyBreakdown(result.monthly_breakdown)}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-semibold">Calculo de Impostos</h2>
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-amber-700">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!taxSummary) {
    return null;
  }

  const balanceIsPositive = taxSummary.balance_due > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-teal-600" />
        <h2 className="text-lg font-semibold">Calculo de Impostos - {year}</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Impostos PF</p>
            <p className="text-xl font-bold text-teal-600">
              {formatCurrency(taxSummary.total_pf_taxes)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTaxRate(taxSummary.pf_effective_rate)} efetivo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Impostos PJ</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(taxSummary.total_pj_taxes)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTaxRate(taxSummary.pj_effective_rate)} efetivo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">IRRF Ja Retido</p>
            <p className="text-xl font-bold text-amber-600">
              {formatCurrency(taxSummary.irrf_already_paid)}
            </p>
            <p className="text-xs text-muted-foreground">
              Descontado na fonte
            </p>
          </CardContent>
        </Card>

        <Card className={balanceIsPositive ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {balanceIsPositive ? (
                <TrendingUp className="w-4 h-4 text-red-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-600" />
              )}
              <p className="text-sm text-muted-foreground">
                {balanceIsPositive ? 'Saldo a Pagar' : 'Saldo a Restituir'}
              </p>
            </div>
            <p className={`text-xl font-bold ${balanceIsPositive ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(taxSummary.balance_due))}
            </p>
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(taxSummary.combined_total_taxes)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PF Calculation Details */}
      {taxSummary.pf_calculation && (
        renderCalculationResult(
          taxSummary.pf_calculation,
          'Impostos Pessoa Fisica',
          showPFDetails,
          setShowPFDetails
        )
      )}

      {/* PJ Calculation Details */}
      {taxSummary.pj_calculation && (
        renderCalculationResult(
          taxSummary.pj_calculation,
          'Impostos Pessoa Juridica',
          showPJDetails,
          setShowPJDetails
        )
      )}

      {/* No calculations message */}
      {!taxSummary.pf_calculation && !taxSummary.pj_calculation && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Configure seu perfil fiscal para ver os calculos de impostos.</p>
            <p className="text-sm mt-2">
              Habilite PF (Carne-Leao) ou PJ nas configuracoes fiscais.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
        <p className="text-sm font-medium text-amber-800">
          Importante: Simulacao para fins de planejamento
        </p>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>Os valores apresentados sao <strong>estimativas</strong> baseadas nas aliquotas vigentes e servem apenas como referencia.</li>
          <li>Aliquotas do Simples Nacional exibidas sao <strong>efetivas</strong> (calculadas pela formula oficial).</li>
          <li>O regime mais vantajoso depende de diversos fatores especificos. <strong>Consulte seu contador</strong> antes de tomar decisoes.</li>
          <li>As aliquotas e faixas podem ser alteradas pela legislacao. Valores baseados na tabela 2024.</li>
        </ul>
        <p className="text-xs text-amber-600 italic">
          Este sistema nao substitui assessoria contabil profissional.
        </p>
      </div>
    </div>
  );
}
