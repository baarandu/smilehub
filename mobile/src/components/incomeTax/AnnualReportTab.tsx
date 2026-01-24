import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
  User,
  Building2,
  FileSpreadsheet,
} from 'lucide-react-native';
import { incomeTaxService } from '../../services/incomeTax';
import { TaxCalculationSection } from './TaxCalculationSection';
import { generateIRPdf, exportCSV } from '../../utils/incomeTaxPdfGenerator';
import type { IRSummary, IRValidationIssue } from '../../types/incomeTax';

interface Props {
  year: number;
  summary: IRSummary | null;
  onRefresh: () => void;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function AnnualReportTab({ year, summary, onRefresh }: Props) {
  const [validationIssues, setValidationIssues] = useState<IRValidationIssue[]>([]);
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const issues = await incomeTaxService.validateTransactionsForYear(year);
      setValidationIssues(issues);
      if (issues.length === 0) {
        Alert.alert('Sucesso', 'Todos os dados estão completos!');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao validar dados');
    } finally {
      setValidating(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!summary) return;

    setExporting(true);
    try {
      await generateIRPdf(summary);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Erro', 'Falha ao gerar PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!summary) return;

    setExporting(true);
    try {
      await exportCSV(summary);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Erro', 'Falha ao exportar CSV');
    } finally {
      setExporting(false);
    }
  };

  const errors = validationIssues.filter((i) => i.severity === 'error');
  const warnings = validationIssues.filter((i) => i.severity === 'warning');

  if (!summary) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-gray-500">Nenhum dado disponível para {year}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
      {/* Summary Overview */}
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <Text className="font-bold text-lg text-gray-900 mb-4">Resumo Anual - {year}</Text>

        <View className="flex-row flex-wrap">
          <View className="w-1/2 p-2">
            <View className="bg-teal-50 p-3 rounded-xl">
              <View className="flex-row items-center mb-2">
                <User size={16} color="#0D9488" />
                <Text className="text-xs text-teal-700 ml-1">Receita PF</Text>
              </View>
              <Text className="font-bold text-teal-700">{formatCurrency(summary.total_income_pf)}</Text>
            </View>
          </View>

          <View className="w-1/2 p-2">
            <View className="bg-blue-50 p-3 rounded-xl">
              <View className="flex-row items-center mb-2">
                <Building2 size={16} color="#2563EB" />
                <Text className="text-xs text-blue-700 ml-1">Receita PJ</Text>
              </View>
              <Text className="font-bold text-blue-700">{formatCurrency(summary.total_income_pj)}</Text>
            </View>
          </View>

          <View className="w-1/2 p-2">
            <View className="bg-purple-50 p-3 rounded-xl">
              <View className="flex-row items-center mb-2">
                <FileText size={16} color="#7C3AED" />
                <Text className="text-xs text-purple-700 ml-1">IRRF Retido</Text>
              </View>
              <Text className="font-bold text-purple-700">{formatCurrency(summary.total_irrf)}</Text>
            </View>
          </View>

          <View className="w-1/2 p-2">
            <View className="bg-red-50 p-3 rounded-xl">
              <View className="flex-row items-center mb-2">
                <TrendingDown size={16} color="#DC2626" />
                <Text className="text-xs text-red-700 ml-1">Deduções</Text>
              </View>
              <Text className="font-bold text-red-700">
                {formatCurrency(summary.total_expenses_deductible)}
              </Text>
            </View>
          </View>
        </View>

        {/* Totals */}
        <View className="mt-4 pt-4 border-t border-gray-100">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-600">Receita Total</Text>
            <Text className="font-bold text-gray-900">{formatCurrency(summary.total_income)}</Text>
          </View>
          <View className="flex-row justify-between items-center bg-teal-50 p-3 rounded-xl">
            <Text className="text-teal-700 font-medium">Resultado Líquido</Text>
            <Text className="font-bold text-teal-700 text-lg">
              {formatCurrency(summary.net_result)}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row gap-3 mb-4">
        <TouchableOpacity
          onPress={handleValidate}
          disabled={validating}
          className="flex-1 bg-white border border-gray-200 py-3 rounded-xl flex-row items-center justify-center"
        >
          {validating ? (
            <ActivityIndicator size="small" color="#0D9488" />
          ) : (
            <>
              <CheckCircle size={18} color="#0D9488" />
              <Text className="text-teal-600 font-medium ml-2">Validar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExportPdf}
          disabled={exporting || errors.length > 0}
          className={`flex-1 py-3 rounded-xl flex-row items-center justify-center ${
            errors.length > 0 ? 'bg-gray-300' : 'bg-teal-600'
          }`}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Download size={18} color="white" />
              <Text className="text-white font-medium ml-2">PDF</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExportCSV}
          disabled={exporting}
          className="flex-1 bg-white border border-gray-200 py-3 rounded-xl flex-row items-center justify-center"
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#0D9488" />
          ) : (
            <>
              <FileSpreadsheet size={18} color="#0D9488" />
              <Text className="text-teal-600 font-medium ml-2">CSV</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <View
          className={`p-4 rounded-xl mb-4 ${errors.length > 0 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}
        >
          <View className="flex-row items-center mb-2">
            <AlertTriangle size={18} color={errors.length > 0 ? '#DC2626' : '#D97706'} />
            <Text
              className={`font-bold ml-2 ${errors.length > 0 ? 'text-red-800' : 'text-amber-800'}`}
            >
              {errors.length > 0 ? `${errors.length} erro(s)` : ''}
              {errors.length > 0 && warnings.length > 0 ? ' e ' : ''}
              {warnings.length > 0 ? `${warnings.length} aviso(s)` : ''}
            </Text>
          </View>

          {errors.map((issue, idx) => (
            <View key={`err-${idx}`} className="bg-red-100 p-2 rounded-lg mb-1">
              <Text className="text-sm text-red-800">{issue.message}</Text>
            </View>
          ))}

          {warnings.slice(0, 5).map((issue, idx) => (
            <View key={`warn-${idx}`} className="bg-amber-100/50 p-2 rounded-lg mb-1">
              <Text className="text-sm text-amber-800">{issue.message}</Text>
            </View>
          ))}

          {warnings.length > 5 && (
            <Text className="text-xs text-amber-700 mt-2">
              + {warnings.length - 5} outros avisos
            </Text>
          )}

          <TouchableOpacity
            onPress={onRefresh}
            className="mt-3 py-2 border border-amber-300 rounded-lg items-center"
          >
            <Text className="text-amber-800 font-medium">Atualizar após correções</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tax Calculations */}
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <TaxCalculationSection summary={summary} year={year} />
      </View>

      {/* Monthly Breakdown */}
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <Text className="font-bold text-gray-900 mb-3">Receitas por Mês</Text>
        {summary.monthly
          .filter((m) => m.income_total > 0)
          .map((month) => (
            <View
              key={month.month}
              className="flex-row justify-between items-center py-2 border-b border-gray-100"
            >
              <Text className="text-gray-700">{month.month_name}</Text>
              <View className="flex-row items-center">
                {month.income_pf > 0 && (
                  <Text className="text-xs text-teal-600 mr-2">
                    PF: {formatCurrency(month.income_pf)}
                  </Text>
                )}
                {month.income_pj > 0 && (
                  <Text className="text-xs text-blue-600 mr-2">
                    PJ: {formatCurrency(month.income_pj)}
                  </Text>
                )}
                <Text className="font-semibold text-gray-900">
                  {formatCurrency(month.income_total)}
                </Text>
              </View>
            </View>
          ))}
      </View>

      {/* PF Payers */}
      {summary.payers_pf.length > 0 && (
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
          <Text className="font-bold text-gray-900 mb-3">Pagadores PF</Text>
          {summary.payers_pf.slice(0, 5).map((payer, idx) => (
            <View
              key={idx}
              className="flex-row justify-between items-center py-2 border-b border-gray-100"
            >
              <View className="flex-1 mr-2">
                <Text className="text-gray-800 font-medium" numberOfLines={1}>
                  {payer.name}
                </Text>
                <Text className="text-xs text-gray-500">{payer.cpf}</Text>
              </View>
              <Text className="font-semibold text-gray-900">
                {formatCurrency(payer.total_amount)}
              </Text>
            </View>
          ))}
          {summary.payers_pf.length > 5 && (
            <Text className="text-center text-teal-600 text-sm mt-2">
              + {summary.payers_pf.length - 5} pagadores
            </Text>
          )}
        </View>
      )}

      {/* PJ Sources */}
      {summary.payers_pj.length > 0 && (
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
          <Text className="font-bold text-gray-900 mb-3">Fontes PJ</Text>
          {summary.payers_pj.slice(0, 5).map((source, idx) => (
            <View
              key={idx}
              className="flex-row justify-between items-center py-2 border-b border-gray-100"
            >
              <View className="flex-1 mr-2">
                <Text className="text-gray-800 font-medium" numberOfLines={1}>
                  {source.nome_fantasia || source.razao_social}
                </Text>
                <Text className="text-xs text-gray-500">{source.cnpj}</Text>
              </View>
              <View className="items-end">
                <Text className="font-semibold text-gray-900">
                  {formatCurrency(source.total_amount)}
                </Text>
                {source.irrf_total > 0 && (
                  <Text className="text-xs text-purple-600">
                    IRRF: {formatCurrency(source.irrf_total)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Expense Categories */}
      {summary.expenses_by_category.length > 0 && (
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
          <Text className="font-bold text-gray-900 mb-3">Despesas Dedutíveis por Categoria</Text>
          {summary.expenses_by_category.map((cat, idx) => (
            <View
              key={idx}
              className="flex-row justify-between items-center py-2 border-b border-gray-100"
            >
              <Text className="text-gray-700">{cat.category}</Text>
              <View className="flex-row items-center">
                <Text className="text-xs text-gray-500 mr-2">{cat.transaction_count}x</Text>
                <Text className="font-semibold text-red-600">
                  {formatCurrency(cat.total_amount)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Info Card */}
      <View className="bg-teal-50 p-4 rounded-xl border border-teal-200 mb-8">
        <Text className="text-teal-800 font-medium mb-2">Exportar Relatório</Text>
        <Text className="text-teal-700 text-sm">
          Clique em PDF para gerar o Dossiê IR completo ou CSV para exportar os dados em planilha.
          O arquivo será compartilhado para salvar ou enviar.
        </Text>
      </View>
    </ScrollView>
  );
}
