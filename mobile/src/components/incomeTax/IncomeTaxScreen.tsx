import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  FileText,
  Settings,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronDown,
  RefreshCw,
  Calculator,
} from 'lucide-react-native';
import { incomeTaxService } from '../../services/incomeTax';
import type {
  FiscalProfile,
  PJSource,
  TransactionWithIR,
  IRSummary,
} from '../../types/incomeTax';
import { FiscalSettingsTab } from './FiscalSettingsTab';
import { IRIncomeTab } from './IRIncomeTab';
import { IRExpensesTab } from './IRExpensesTab';
import { AnnualReportTab } from './AnnualReportTab';
import { TaxRatesConfigModal } from './TaxRatesConfigModal';

interface Props {
  onBack?: () => void;
}

type TabType = 'settings' | 'income' | 'expenses' | 'report';

const TABS: { key: TabType; label: string; icon: any }[] = [
  { key: 'settings', label: 'Config', icon: Settings },
  { key: 'income', label: 'Receitas', icon: TrendingUp },
  { key: 'expenses', label: 'Despesas', icon: TrendingDown },
  { key: 'report', label: 'Relatorio', icon: BarChart3 },
];

export default function IncomeTaxScreen({ onBack }: Props) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showTaxConfigModal, setShowTaxConfigModal] = useState(false);

  // Data state
  const [fiscalProfile, setFiscalProfile] = useState<FiscalProfile | null>(null);
  const [pjSources, setPJSources] = useState<PJSource[]>([]);
  const [incomeTransactions, setIncomeTransactions] = useState<TransactionWithIR[]>([]);
  const [expenseTransactions, setExpenseTransactions] = useState<TransactionWithIR[]>([]);
  const [summary, setSummary] = useState<IRSummary | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const loadData = useCallback(async () => {
    try {
      const [profile, sources, incomes, expenses, summaryData] = await Promise.all([
        incomeTaxService.getFiscalProfile(),
        incomeTaxService.getPJSources(),
        incomeTaxService.getIncomeTransactionsForYear(selectedYear),
        incomeTaxService.getExpenseTransactionsForYear(selectedYear),
        incomeTaxService.generateIRSummary(selectedYear),
      ]);

      setFiscalProfile(profile);
      setPJSources(sources);
      setIncomeTransactions(incomes);
      setExpenseTransactions(expenses);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading IR data:', error);
      Alert.alert('Erro', 'Falha ao carregar dados do Imposto de Renda');
    }
  }, [selectedYear]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleProfileUpdated = (profile: FiscalProfile) => {
    setFiscalProfile(profile);
    Alert.alert('Sucesso', 'Perfil fiscal salvo');
  };

  const handlePJSourcesUpdated = async () => {
    const sources = await incomeTaxService.getPJSources();
    setPJSources(sources);
  };

  const handleTransactionUpdated = async () => {
    const [incomes, expenses, summaryData] = await Promise.all([
      incomeTaxService.getIncomeTransactionsForYear(selectedYear),
      incomeTaxService.getExpenseTransactionsForYear(selectedYear),
      incomeTaxService.generateIRSummary(selectedYear),
    ]);
    setIncomeTransactions(incomes);
    setExpenseTransactions(expenses);
    setSummary(summaryData);
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#b94a48" />
          <Text className="text-gray-500 mt-4">Carregando...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'settings':
        return (
          <FiscalSettingsTab
            fiscalProfile={fiscalProfile}
            pjSources={pjSources}
            onProfileUpdated={handleProfileUpdated}
            onPJSourcesUpdated={handlePJSourcesUpdated}
          />
        );
      case 'income':
        return (
          <IRIncomeTab
            transactions={incomeTransactions}
            pjSources={pjSources}
            onTransactionUpdated={handleTransactionUpdated}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        );
      case 'expenses':
        return (
          <IRExpensesTab
            transactions={expenseTransactions}
            onTransactionUpdated={handleTransactionUpdated}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        );
      case 'report':
        return (
          <AnnualReportTab
            year={selectedYear}
            summary={summary}
            onRefresh={onRefresh}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={onBack} className="mr-3 p-1">
              <ArrowLeft size={24} color="#b94a48" />
            </TouchableOpacity>
            <FileText size={24} color="#b94a48" />
            <Text className="text-lg font-bold text-gray-900 ml-2">Imposto de Renda</Text>
          </View>

          {/* Year Selector and Actions */}
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setShowTaxConfigModal(true)}
              className="p-2 bg-[#fef2f2] rounded-lg"
            >
              <Calculator size={18} color="#b94a48" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowYearPicker(!showYearPicker)}
              className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
            >
              <Text className="font-semibold text-gray-700 mr-1">{selectedYear}</Text>
              <ChevronDown size={16} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRefresh}
              disabled={refreshing}
              className="p-2 bg-gray-100 rounded-lg"
            >
              <RefreshCw size={18} color={refreshing ? '#9CA3AF' : '#b94a48'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Year Picker Dropdown */}
        {showYearPicker && (
          <View className="absolute top-16 right-4 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
            {years.map(year => (
              <TouchableOpacity
                key={year}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearPicker(false);
                }}
                className={`px-6 py-3 border-b border-gray-100 ${selectedYear === year ? 'bg-[#fef2f2]' : ''}`}
              >
                <Text className={`text-center font-medium ${selectedYear === year ? 'text-[#8b3634]' : 'text-gray-700'}`}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 items-center border-b-2 ${isActive ? 'border-[#a03f3d]' : 'border-transparent'}`}
            >
              <Icon size={20} color={isActive ? '#b94a48' : '#9CA3AF'} />
              <Text className={`text-xs mt-1 font-medium ${isActive ? 'text-[#a03f3d]' : 'text-gray-500'}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <View className="flex-1">
        {renderTabContent()}
      </View>

      {/* Tax Rates Config Modal */}
      <TaxRatesConfigModal
        visible={showTaxConfigModal}
        onClose={() => setShowTaxConfigModal(false)}
        onConfigUpdated={onRefresh}
      />
    </SafeAreaView>
  );
}
