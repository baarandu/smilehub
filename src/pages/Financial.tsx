import { useState, useCallback, useEffect } from 'react';
import { Settings, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Transaction } from '@/components/financial';
import { IncomeTab } from '@/components/financial/tabs/IncomeTab';
import { ExpensesTab } from '@/components/financial/tabs/ExpensesTab';
import { ClosureTab } from '@/components/financial/tabs/ClosureTab';
import { financialService } from '@/services/financial';
import { toast } from 'sonner';

// Helper to format date to YYYY-MM-DD
const formatDateInput = (date: Date) => {
  return date.toISOString().split('T')[0];
};

// Helper to format date for display
const formatDateDisplay = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function Financial() {
  // Get current month range as default
  const getDefaultStartDate = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const getDefaultEndDate = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  };

  const [startDate, setStartDate] = useState(formatDateInput(getDefaultStartDate()));
  const [endDate, setEndDate] = useState(formatDateInput(getDefaultEndDate()));

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Quick presets
  const setPreset = (preset: 'today' | 'week' | 'month' | 'year') => {
    const now = new Date();
    let start: Date, end: Date;

    switch (preset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = start;
        break;
      case 'week':
        const day = now.getDay();
        const diff = now.getDate() - day;
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
    }

    setStartDate(formatDateInput(start));
    setEndDate(formatDateInput(end));
  };

  // Load Data
  const loadData = useCallback(async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');

      const data = await financialService.getTransactions(start, end);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Controle completo de receitas e despesas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/financeiro/configuracoes'}>
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-5 h-5" />
            <span className="font-medium text-foreground">Período:</span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset('today')}
              className="text-xs"
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset('week')}
              className="text-xs"
            >
              Esta Semana
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset('month')}
              className="text-xs"
            >
              Este Mês
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset('year')}
              className="text-xs"
            >
              Este Ano
            </Button>
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <span className="text-muted-foreground">até</span>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          {/* Current Filter Display */}
          <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-lg">
            {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
          </div>
        </div>
      </div>

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="income">Receitas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="closure">Fechamento</TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <IncomeTab transactions={transactions} loading={loading} />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesTab transactions={transactions} loading={loading} />
        </TabsContent>

        <TabsContent value="closure">
          <ClosureTab transactions={transactions} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
