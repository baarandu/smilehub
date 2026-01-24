import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FiscalSettingsTab } from '@/components/incomeTax/FiscalSettingsTab';
import { IRIncomeTab } from '@/components/incomeTax/IRIncomeTab';
import { IRExpensesTab } from '@/components/incomeTax/IRExpensesTab';
import { AnnualReportTab } from '@/components/incomeTax/AnnualReportTab';
import { TaxRatesConfigModal } from '@/components/incomeTax/TaxRatesConfigModal';
import { incomeTaxService } from '@/services/incomeTaxService';
import type { FiscalProfile, PJSource, TransactionWithIR, IRSummary } from '@/types/incomeTax';
import { toast } from 'sonner';

export default function IncomeTax() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data state
  const [fiscalProfile, setFiscalProfile] = useState<FiscalProfile | null>(null);
  const [pjSources, setPJSources] = useState<PJSource[]>([]);
  const [incomeTransactions, setIncomeTransactions] = useState<TransactionWithIR[]>([]);
  const [expenseTransactions, setExpenseTransactions] = useState<TransactionWithIR[]>([]);
  const [summary, setSummary] = useState<IRSummary | null>(null);

  // Generate year options (last 5 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
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
      console.error('Error loading income tax data:', error);
      toast.error('Erro ao carregar dados do Imposto de Renda');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success('Dados atualizados');
  };

  const handleProfileUpdated = (profile: FiscalProfile) => {
    setFiscalProfile(profile);
    toast.success('Perfil fiscal salvo com sucesso');
  };

  const handlePJSourcesUpdated = () => {
    incomeTaxService.getPJSources().then(setPJSources);
  };

  const handleTransactionUpdated = () => {
    // Reload transactions and summary after update
    Promise.all([
      incomeTaxService.getIncomeTransactionsForYear(selectedYear),
      incomeTaxService.getExpenseTransactionsForYear(selectedYear),
      incomeTaxService.generateIRSummary(selectedYear),
    ]).then(([incomes, expenses, summaryData]) => {
      setIncomeTransactions(incomes);
      setExpenseTransactions(expenses);
      setSummary(summaryData);
    });
  };

  const handleTaxConfigUpdated = () => {
    // Trigger recalculation when tax rates are updated
    if (summary) {
      incomeTaxService.generateIRSummary(selectedYear).then(setSummary);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-7 h-7" />
            Imposto de Renda
          </h1>
          <p className="text-muted-foreground mt-1">
            Documentação fiscal para o contador
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Tax Rates Config Modal */}
          <TaxRatesConfigModal onConfigUpdated={handleTaxConfigUpdated} />

          {/* Year Selector */}
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 w-10"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="settings">Configuracoes</TabsTrigger>
          <TabsTrigger value="income">Receitas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="report">Relatorio Anual</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <FiscalSettingsTab
            fiscalProfile={fiscalProfile}
            pjSources={pjSources}
            onProfileUpdated={handleProfileUpdated}
            onPJSourcesUpdated={handlePJSourcesUpdated}
          />
        </TabsContent>

        <TabsContent value="income">
          <IRIncomeTab
            transactions={incomeTransactions}
            pjSources={pjSources}
            loading={loading}
            onTransactionUpdated={handleTransactionUpdated}
          />
        </TabsContent>

        <TabsContent value="expenses">
          <IRExpensesTab
            transactions={expenseTransactions}
            loading={loading}
            onTransactionUpdated={handleTransactionUpdated}
          />
        </TabsContent>

        <TabsContent value="report">
          <AnnualReportTab
            year={selectedYear}
            summary={summary}
            loading={loading}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
