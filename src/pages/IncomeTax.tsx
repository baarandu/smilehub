import { useState, useCallback, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw, FileText, Search, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FiscalSettingsTab } from '@/components/incomeTax/FiscalSettingsTab';
import { IRIncomeTab } from '@/components/incomeTax/IRIncomeTab';
import { IRExpensesTab } from '@/components/incomeTax/IRExpensesTab';
import { AnnualReportTab } from '@/components/incomeTax/AnnualReportTab';
import { FiscalDocumentsTab } from '@/components/incomeTax/FiscalDocumentsTab';
import { TaxRatesConfigModal } from '@/components/incomeTax/TaxRatesConfigModal';
import type { TaxRegime } from '@/types/fiscalDocuments';
import { incomeTaxService } from '@/services/incomeTaxService';
import type { FiscalProfile, PJSource, TransactionWithIR, IRSummary } from '@/types/incomeTax';
import { toast } from 'sonner';
import { useClinic } from '@/contexts/ClinicContext';

export default function IncomeTax() {
  const { isAdmin } = useClinic();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

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

  // Apenas admin pode acessar esta página
  if (!isAdmin) {
    return <Navigate to="/inicio" replace />;
  }

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
    <div className="space-y-4">
      {/* Main Card */}
      <Card className="overflow-hidden">
        <Tabs defaultValue="settings" className="w-full">
          {/* Fixed Header */}
          <div className="bg-gradient-to-r from-rose-50 to-white border-b px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Title Section */}
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 rounded-xl">
                  <FileText className="w-6 h-6 text-[#a03f3d]" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    Imposto de Renda
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Documentação fiscal para o contador
                  </p>
                </div>
              </div>

              {/* Actions Section */}
              <div className="flex gap-2 items-center flex-wrap">
                {/* Tax Rates Config Modal - mantém o botão completo */}
                <TaxRatesConfigModal onConfigUpdated={handleTaxConfigUpdated} />

                {/* Year Selector */}
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-[100px] bg-white">
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
                  className="h-10 w-10 bg-white"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>

                {/* Global Search */}
                <Popover open={showSearch} onOpenChange={setShowSearch}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="bg-white">
                      <Search className="w-4 h-4 mr-2" />
                      Buscar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Busca Global</p>
                      <Input
                        placeholder="Buscar em todas as abas..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">
                        Busque por receitas, despesas, documentos ou configurações
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Tabs Navigation */}
            <TabsList className="w-full grid grid-cols-5 bg-white/50 p-1 h-auto mt-4">
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5"
            >
              Configurações
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5"
            >
              Documentos
            </TabsTrigger>
            <TabsTrigger
              value="income"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5"
            >
              Receitas
            </TabsTrigger>
            <TabsTrigger
              value="expenses"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5"
            >
              Despesas
            </TabsTrigger>
            <TabsTrigger
              value="report"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5"
            >
              Relatório
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <div className="p-6 bg-slate-50/50">
          <TabsContent value="settings" className="mt-0">
            <FiscalSettingsTab
              fiscalProfile={fiscalProfile}
              pjSources={pjSources}
              onProfileUpdated={handleProfileUpdated}
              onPJSourcesUpdated={handlePJSourcesUpdated}
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <FiscalDocumentsTab
              year={selectedYear}
              taxRegime={
                fiscalProfile?.pj_enabled
                  ? (fiscalProfile.pj_regime_tributario as TaxRegime) || 'simples'
                  : 'pf'
              }
            />
          </TabsContent>

          <TabsContent value="income" className="mt-0">
            <IRIncomeTab
              transactions={incomeTransactions}
              pjSources={pjSources}
              loading={loading}
              onTransactionUpdated={handleTransactionUpdated}
              globalSearch={globalSearch}
            />
          </TabsContent>

          <TabsContent value="expenses" className="mt-0">
            <IRExpensesTab
              transactions={expenseTransactions}
              loading={loading}
              onTransactionUpdated={handleTransactionUpdated}
              globalSearch={globalSearch}
            />
          </TabsContent>

          <TabsContent value="report" className="mt-0">
            <AnnualReportTab
              year={selectedYear}
              summary={summary}
              loading={loading}
              onRefresh={handleRefresh}
            />
          </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Info Banner - At the bottom of the page */}
      <div className="px-4 py-3 text-xs text-muted-foreground">
        <p>
          Esta página centraliza dados, receitas, despesas e documentos para declaração de IR.
          Os cálculos são estimativas para planejamento e não substituem o trabalho de um contador.
        </p>
      </div>
    </div>
  );
}
