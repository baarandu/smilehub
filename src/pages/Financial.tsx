import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings, ChevronLeft, ChevronRight, RefreshCw, DollarSign, TrendingUp, TrendingDown, ClipboardList, CalendarClock, CheckCircle, AlertCircle, Clock, CreditCard, Banknote, Smartphone, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Transaction } from '@/components/financial';
import { IncomeTab } from '@/components/financial/tabs/IncomeTab';
import { ExpensesTab } from '@/components/financial/tabs/ExpensesTab';
import { ClosureTab } from '@/components/financial/tabs/ClosureTab';
import { financialService } from '@/services/financial';
import { toast } from 'sonner';
import { useClinicReceivables, useOverdueSummary, useConfirmReceivable, useCancelReceivable } from '@/hooks/useReceivables';
import { ConfirmReceivableDialog } from '@/components/patients/ConfirmReceivableDialog';
import type { PaymentReceivable } from '@/types/receivables';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMoney, formatDisplayDate } from '@/utils/budgetUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Month names in Portuguese
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Financial() {
  const location = useLocation();
  const navigate = useNavigate();
  const now = new Date();
  const initialState = location.state as { month?: number; year?: number } | null;
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(initialState?.month ?? now.getMonth());
  const [selectedYear, setSelectedYear] = useState(initialState?.year ?? now.getFullYear());

  // Clear route state after consuming it
  useEffect(() => {
    if (initialState) {
      navigate(location.pathname, { replace: true });
    }
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Receivables tab state
  const [receivablesFilter, setReceivablesFilter] = useState<string>('active');
  const receivablesFilterMap: Record<string, any> = {
    active: undefined, // defaults to pending+overdue+confirmed
    pending: { status: 'pending' },
    overdue: { status: 'overdue' },
    confirmed: { status: 'confirmed' },
  };
  const { data: clinicReceivables = [], refetch: refetchReceivables } = useClinicReceivables(receivablesFilterMap[receivablesFilter]);
  const { data: overdueSummary } = useOverdueSummary();
  const confirmReceivable = useConfirmReceivable();
  const cancelReceivable = useCancelReceivable();
  const [confirmingReceivable, setConfirmingReceivable] = useState<PaymentReceivable | null>(null);

  // Calculate date range based on view mode
  const getDateRange = useCallback(() => {
    if (viewMode === 'monthly') {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);
      return { start, end };
    } else {
      const start = new Date(selectedYear, 0, 1);
      const end = new Date(selectedYear, 11, 31);
      return { start, end };
    }
  }, [viewMode, selectedMonth, selectedYear]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success('Dados atualizados');
  };

  // Navigate to previous period
  const goToPrevious = () => {
    if (viewMode === 'monthly') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      setSelectedYear(selectedYear - 1);
    }
  };

  // Navigate to next period
  const goToNext = () => {
    if (viewMode === 'monthly') {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    } else {
      setSelectedYear(selectedYear + 1);
    }
  };

  // Get display label for current period
  const getPeriodLabel = () => {
    if (viewMode === 'monthly') {
      return `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    } else {
      return `${selectedYear}`;
    }
  };

  // Handle view mode change
  const handleViewModeChange = (mode: 'monthly' | 'yearly') => {
    setViewMode(mode);
    // Reset to current month/year when switching modes
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
  };

  // Load Data
  const loadData = useCallback(async () => {
    const { start, end } = getDateRange();

    setLoading(true);
    try {
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);

      const data = await financialService.getTransactions(startDate, endDate);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

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
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Toggle Mensal/Anual */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('monthly')}
              className={viewMode === 'monthly' ? 'bg-[#a03f3d] hover:bg-[#8b3634] text-white' : 'hover:bg-transparent'}
            >
              Mensal
            </Button>
            <Button
              variant={viewMode === 'yearly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('yearly')}
              className={viewMode === 'yearly' ? 'bg-[#a03f3d] hover:bg-[#8b3634] text-white' : 'hover:bg-transparent'}
            >
              Anual
            </Button>
          </div>

          {/* Navegação de Período */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="h-8 w-8 hover:bg-background"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 font-medium text-sm min-w-[140px] text-center">
              {getPeriodLabel()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="h-8 w-8 hover:bg-background"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Botão Configurações */}
          <Button variant="outline" onClick={() => navigate('/financeiro/configuracoes')} className="gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configurações</span>
          </Button>
        </div>
      </div>

      {/* Abas com Ícones */}
      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8 h-12">
          <TabsTrigger value="income" className="gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200">
            <TrendingUp className="w-4 h-4" />
            <span>Receitas</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:border-red-200">
            <TrendingDown className="w-4 h-4" />
            <span>Despesas</span>
          </TabsTrigger>
          <TabsTrigger value="receivables" className="gap-2 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:border-amber-200">
            <CalendarClock className="w-4 h-4" />
            <span>A Receber</span>
            {(overdueSummary?.total_count ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 text-[10px] px-1.5">
                {overdueSummary!.total_count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="closure" className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200">
            <ClipboardList className="w-4 h-4" />
            <span>Fechamento</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="income">
          <IncomeTab transactions={transactions} loading={loading} onRefresh={loadData} />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesTab transactions={transactions} loading={loading} onRefresh={loadData} />
        </TabsContent>

        <TabsContent value="receivables">
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-amber-50 border-amber-100">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600">Pendentes</p>
                    <h3 className="text-2xl font-bold text-amber-700">
                      {clinicReceivables.filter(r => r.status === 'pending').length}
                    </h3>
                  </div>
                  <Clock className="w-8 h-8 text-amber-300" />
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-100">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Em Atraso</p>
                    <h3 className="text-2xl font-bold text-red-700">
                      {overdueSummary?.total_count || 0}
                      {(overdueSummary?.total_amount ?? 0) > 0 && (
                        <span className="text-sm font-normal ml-2">
                          (R$ {formatMoney(overdueSummary!.total_amount)})
                        </span>
                      )}
                    </h3>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-300" />
                </CardContent>
              </Card>
              <Card className="bg-emerald-50 border-emerald-100">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600">Confirmados</p>
                    <h3 className="text-2xl font-bold text-emerald-700">
                      {clinicReceivables.filter(r => r.status === 'confirmed').length}
                    </h3>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-300" />
                </CardContent>
              </Card>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
              <Select value={receivablesFilter} onValueChange={setReceivablesFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Todos ativos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="overdue">Em atraso</SelectItem>
                  <SelectItem value="confirmed">Confirmados</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetchReceivables()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>

            {/* Receivables list */}
            <Card>
              <CardContent className="p-0">
                {clinicReceivables.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma parcela encontrada
                  </div>
                ) : (
                  <div className="divide-y">
                    {clinicReceivables.map(r => {
                      const isOverdue = r.status === 'overdue';
                      const isConfirmed = r.status === 'confirmed';
                      const patientName = (r as any).patients?.name || '';

                      const methodLabels: Record<string, string> = {
                        credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro',
                      };
                      const MethodIcon = r.payment_method === 'pix' ? Smartphone
                        : r.payment_method === 'cash' ? Banknote
                        : CreditCard;

                      return (
                        <div key={r.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50/50' : ''}`}>
                          <div className="flex-1 min-w-0">
                            {patientName && (
                              <p className="text-xs font-medium text-slate-400 mb-0.5">{patientName}</p>
                            )}
                            <p className="font-medium text-slate-800 truncate">{r.tooth_description}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <MethodIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-xs text-slate-500">{methodLabels[r.payment_method] || r.payment_method}</span>
                              <span className="text-xs text-slate-400">|</span>
                              <span className="text-xs text-slate-500">{formatDisplayDate(r.due_date)}</span>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-[10px] h-5">Em atraso</Badge>
                              )}
                              {isConfirmed && (
                                <Badge className="text-[10px] h-5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Confirmado</Badge>
                              )}
                              {r.status === 'pending' && (
                                <Badge className="text-[10px] h-5 bg-amber-100 text-amber-700 hover:bg-amber-100">Pendente</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span className={`font-bold ${isOverdue ? 'text-red-600' : isConfirmed ? 'text-emerald-600' : 'text-amber-600'}`}>
                              R$ {formatMoney(r.amount)}
                            </span>
                            {!isConfirmed && r.status !== 'cancelled' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                                  onClick={() => setConfirmingReceivable(r)}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Confirmar
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={async () => {
                                        try {
                                          await cancelReceivable.mutateAsync(r.id);
                                          toast.success('Parcela cancelada');
                                          refetchReceivables();
                                        } catch {
                                          toast.error('Falha ao cancelar parcela');
                                        }
                                      }}
                                    >
                                      <X className="w-4 h-4 mr-2" />
                                      Cancelar parcela
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {confirmingReceivable && (
            <ConfirmReceivableDialog
              open={!!confirmingReceivable}
              onClose={() => setConfirmingReceivable(null)}
              receivable={confirmingReceivable}
              loading={confirmReceivable.isPending}
              onConfirm={async (id, date) => {
                try {
                  await confirmReceivable.mutateAsync({ receivableId: id, confirmationDate: date });
                  toast.success('Recebimento confirmado e lançado no financeiro');
                  setConfirmingReceivable(null);
                  refetchReceivables();
                  loadData();
                } catch {
                  toast.error('Falha ao confirmar recebimento');
                }
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="closure">
          <ClosureTab transactions={transactions} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
