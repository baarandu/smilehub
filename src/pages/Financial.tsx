import { useState, useCallback, useEffect } from 'react';
import { Settings, Calendar, ChevronDown, RefreshCw, DollarSign, TrendingUp, TrendingDown, ClipboardList } from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  const [activePreset, setActivePreset] = useState<string>('month');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success('Dados atualizados');
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
    setPeriodDropdownOpen(false);
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
      {/* Header Unificado */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#a03f3d]/10 rounded-xl">
            <DollarSign className="w-6 h-6 text-[#a03f3d]" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Controle claro de receitas e despesas do seu consultório</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Botão Atualizar */}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          {/* Seletor de Período Inline */}
          <Popover open={periodDropdownOpen} onOpenChange={setPeriodDropdownOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{getPresetLabel()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded hidden sm:inline">
                    {formatDateDisplay(startDate)} - {formatDateDisplay(endDate)}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                {/* Presets rápidos */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Período Rápido</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'today', label: 'Hoje' },
                      { key: 'week', label: 'Esta Semana' },
                      { key: 'month', label: 'Este Mês' },
                      { key: 'year', label: 'Este Ano' },
                    ].map(({ key, label }) => (
                      <Button
                        key={key}
                        variant={activePreset === key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreset(key as 'today' | 'week' | 'month' | 'year')}
                        className={activePreset === key ? 'bg-[#a03f3d] hover:bg-[#8b3634]' : ''}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Divisor */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-popover px-2 text-muted-foreground">ou personalizado</span>
                  </div>
                </div>

                {/* Período Personalizado */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">De</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setActivePreset('custom');
                      }}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Até</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setActivePreset('custom');
                      }}
                      className="h-9"
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-[#a03f3d] hover:bg-[#8b3634]"
                  size="sm"
                  onClick={() => setPeriodDropdownOpen(false)}
                >
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Botão Configurações */}
          <Button variant="outline" onClick={() => window.location.href = '/financeiro/configuracoes'} className="gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configurações</span>
          </Button>
        </div>
      </div>

      {/* Abas com Ícones */}
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-12">
          <TabsTrigger value="income" className="gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200">
            <TrendingUp className="w-4 h-4" />
            <span>Receitas</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:border-red-200">
            <TrendingDown className="w-4 h-4" />
            <span>Despesas</span>
          </TabsTrigger>
          <TabsTrigger value="closure" className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200">
            <ClipboardList className="w-4 h-4" />
            <span>Fechamento</span>
          </TabsTrigger>
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
