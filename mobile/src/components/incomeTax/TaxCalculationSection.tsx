import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react-native';
import { calculateTaxes, type CalculateTaxesOptions } from '../../services/taxCalculation';
import { taxConfigService } from '../../services/taxConfig';
import type {
  TaxSummary,
  TaxCalculationResult,
  TaxBreakdownItem,
  TaxCalculationInput,
  MonthlyTaxInput,
  TaxRegime,
} from '../../types/taxCalculations';
import { formatCurrency, formatTaxRate, getTaxTypeLabel } from '../../types/taxCalculations';
import type { IRSummary } from '../../types/incomeTax';

interface Props {
  summary: IRSummary;
  year: number;
}

export function TaxCalculationSection({ summary, year }: Props) {
  const [loading, setLoading] = useState(true);
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [showPFDetails, setShowPFDetails] = useState(false);
  const [showPJDetails, setShowPJDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    calculateTaxSummary();
  }, [summary]);

  const calculateTaxSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      await taxConfigService.initializeDefaultRates();

      const monthlyInputs: MonthlyTaxInput[] = summary.monthly.map(m => ({
        month: m.month,
        month_name: m.month_name,
        pf_income: m.income_pf,
        pj_income: m.income_pj,
        deductible_expenses: m.expenses_deductible,
        irrf_withheld: m.irrf_total,
      }));

      const input: TaxCalculationInput = {
        pf_gross_income: summary.total_income_pf,
        pj_gross_income: summary.total_income_pj,
        pf_deductible_expenses: summary.total_expenses_deductible,
        irrf_withheld: summary.total_irrf,
        rbt12: summary.total_income_pj,
        months_in_period: 12,
      };

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
      setError('Erro ao calcular impostos');
    } finally {
      setLoading(false);
    }
  };

  const renderTaxBreakdown = (taxes: TaxBreakdownItem[]) => {
    return (
      <View className="space-y-2">
        {taxes.map((tax, index) => (
          <View key={index} className="flex-row justify-between items-start py-2 border-b border-gray-100">
            <View className="flex-1">
              <Text className="font-medium text-gray-800">{tax.tax_label}</Text>
              {tax.notes && (
                <Text className="text-xs text-gray-500">{tax.notes}</Text>
              )}
              <Text className="text-xs text-gray-500">
                Base: {formatCurrency(tax.base_value)} x {tax.rate_display}
              </Text>
            </View>
            <Text className="font-bold text-gray-900">
              {formatCurrency(tax.calculated_amount)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCalculationResult = (
    result: TaxCalculationResult,
    title: string,
    showDetails: boolean,
    setShowDetails: (v: boolean) => void,
    color: string
  ) => {
    return (
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="font-bold text-gray-900">{title}</Text>
            <Text className="text-xs text-gray-500">{result.regime_label}</Text>
          </View>
          <View className="items-end">
            <Text className={`text-xl font-bold ${color}`}>
              {formatCurrency(result.total_taxes)}
            </Text>
            <Text className="text-xs text-gray-500">
              {formatTaxRate(result.effective_rate)} efetivo
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowDetails(!showDetails)}
          className="flex-row items-center justify-center py-2 bg-gray-50 rounded-lg"
        >
          <Text className="text-gray-600 mr-1">Ver detalhamento</Text>
          {showDetails ? (
            <ChevronUp size={16} color="#6B7280" />
          ) : (
            <ChevronDown size={16} color="#6B7280" />
          )}
        </TouchableOpacity>

        {showDetails && (
          <View className="mt-3 pt-3 border-t border-gray-100">
            {renderTaxBreakdown(result.taxes)}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View className="bg-white rounded-xl p-6 mb-4 border border-gray-100 items-center">
        <ActivityIndicator size="large" color="#0D9488" />
        <Text className="text-gray-500 mt-2">Calculando impostos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
        <View className="flex-row items-center">
          <AlertCircle size={20} color="#D97706" />
          <Text className="text-amber-700 ml-2">{error}</Text>
        </View>
      </View>
    );
  }

  if (!taxSummary) {
    return null;
  }

  const balanceIsPositive = taxSummary.balance_due > 0;

  return (
    <View>
      {/* Header */}
      <View className="flex-row items-center mb-4">
        <Calculator size={20} color="#0D9488" />
        <Text className="font-bold text-lg text-gray-900 ml-2">
          Calculo de Impostos - {year}
        </Text>
      </View>

      {/* Summary Cards */}
      <View className="flex-row flex-wrap mb-4">
        <View className="w-1/2 p-1">
          <View className="bg-teal-50 p-3 rounded-xl">
            <Text className="text-xs text-teal-700">Impostos PF</Text>
            <Text className="font-bold text-teal-700">
              {formatCurrency(taxSummary.total_pf_taxes)}
            </Text>
            <Text className="text-xs text-teal-600">
              {formatTaxRate(taxSummary.pf_effective_rate)} efetivo
            </Text>
          </View>
        </View>

        <View className="w-1/2 p-1">
          <View className="bg-blue-50 p-3 rounded-xl">
            <Text className="text-xs text-blue-700">Impostos PJ</Text>
            <Text className="font-bold text-blue-700">
              {formatCurrency(taxSummary.total_pj_taxes)}
            </Text>
            <Text className="text-xs text-blue-600">
              {formatTaxRate(taxSummary.pj_effective_rate)} efetivo
            </Text>
          </View>
        </View>

        <View className="w-1/2 p-1">
          <View className="bg-purple-50 p-3 rounded-xl">
            <Text className="text-xs text-purple-700">IRRF Ja Retido</Text>
            <Text className="font-bold text-purple-700">
              {formatCurrency(taxSummary.irrf_already_paid)}
            </Text>
          </View>
        </View>

        <View className="w-1/2 p-1">
          <View className={`p-3 rounded-xl ${balanceIsPositive ? 'bg-red-50' : 'bg-green-50'}`}>
            <View className="flex-row items-center">
              {balanceIsPositive ? (
                <TrendingUp size={14} color="#DC2626" />
              ) : (
                <TrendingDown size={14} color="#16A34A" />
              )}
              <Text className={`text-xs ml-1 ${balanceIsPositive ? 'text-red-700' : 'text-green-700'}`}>
                {balanceIsPositive ? 'A Pagar' : 'A Restituir'}
              </Text>
            </View>
            <Text className={`font-bold ${balanceIsPositive ? 'text-red-700' : 'text-green-700'}`}>
              {formatCurrency(Math.abs(taxSummary.balance_due))}
            </Text>
          </View>
        </View>
      </View>

      {/* PF Calculation Details */}
      {taxSummary.pf_calculation && (
        renderCalculationResult(
          taxSummary.pf_calculation,
          'Impostos Pessoa Fisica',
          showPFDetails,
          setShowPFDetails,
          'text-teal-600'
        )
      )}

      {/* PJ Calculation Details */}
      {taxSummary.pj_calculation && (
        renderCalculationResult(
          taxSummary.pj_calculation,
          'Impostos Pessoa Juridica',
          showPJDetails,
          setShowPJDetails,
          'text-blue-600'
        )
      )}

      {/* No calculations message */}
      {!taxSummary.pf_calculation && !taxSummary.pj_calculation && (
        <View className="bg-gray-50 rounded-xl p-4 items-center">
          <Text className="text-gray-500 text-center">
            Configure seu perfil fiscal para ver os calculos de impostos.
          </Text>
        </View>
      )}

      {/* Disclaimer */}
      <View className="bg-gray-50 rounded-xl p-3 mt-2">
        <Text className="text-xs text-gray-500">
          Calculos estimados. Consulte um contador para declaracao oficial.
        </Text>
      </View>
    </View>
  );
}
