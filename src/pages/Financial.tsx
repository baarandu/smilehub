import { useState, useCallback, useEffect } from 'react';
import { Settings, Calendar, Filter, X, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Transaction } from '@/components/financial';
import { IncomeTab } from '@/components/financial/tabs/IncomeTab';
import { ExpensesTab } from '@/components/financial/tabs/ExpensesTab';
import { ClosureTab } from '@/components/financial/tabs/ClosureTab';
import { financialService } from '@/services/financial';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('month');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

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
    setActivePreset(preset);
    setShowFilterModal(false);
  };

  // Get preset label
  const getPresetLabel = () => {
    switch (activePreset) {
      case 'today': return 'Hoje';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mês';
      case 'year': return 'Este Ano';
      default: return 'Personalizado';
    }
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
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 w-10"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          {/* Filter Button */}
          <Button
            variant="outline"
            onClick={() => setShowFilterModal(true)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">{getPresetLabel()}</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/financeiro/configuracoes'}>
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Filter Modal */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtrar por Período
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Período Rápido</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={activePreset === 'today' ? 'default' : 'outline'}
                  onClick={() => setPreset('today')}
                  className={activePreset === 'today' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                >
                  Hoje
                </Button>
                <Button
                  variant={activePreset === 'week' ? 'default' : 'outline'}
                  onClick={() => setPreset('week')}
                  className={activePreset === 'week' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                >
                  Esta Semana
                </Button>
                <Button
                  variant={activePreset === 'month' ? 'default' : 'outline'}
                  onClick={() => setPreset('month')}
                  className={activePreset === 'month' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                >
                  Este Mês
                </Button>
                <Button
                  variant={activePreset === 'year' ? 'default' : 'outline'}
                  onClick={() => setPreset('year')}
                  className={activePreset === 'year' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                >
                  Este Ano
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Período Personalizado</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">De</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setActivePreset('custom');
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Até</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setActivePreset('custom');
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Apply Button for custom dates */}
            <Button
              className="w-full bg-teal-600 hover:bg-teal-700"
              onClick={() => setShowFilterModal(false)}
            >
              Aplicar Filtro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
