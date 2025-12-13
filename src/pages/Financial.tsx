import { useState, useCallback, useEffect } from 'react';
import { Plus, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FilterType,
  PeriodType,
  Transaction,
  PeriodSelector,
  FinancialStatsCards,
  TransactionsList,
} from '@/components/financial';
import { financialService } from '@/services/financial';
import { toast } from 'sonner';

export default function Financial() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let start: Date, end: Date;

      if (periodType === 'monthly') {
        start = new Date(selectedYear, selectedMonth, 1);
        end = new Date(selectedYear, selectedMonth + 1, 0);
      } else {
        start = new Date(selectedYear, 0, 1);
        end = new Date(selectedYear, 11, 31);
      }

      const data = await financialService.getTransactions(start, end);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, periodType]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // Calculate totals
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  // Filter by type
  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  const handleFilterClick = (type: FilterType) => {
    setFilter(filter === type ? 'all' : type);
  };

  const closeDropdowns = () => {
    setShowMonthPicker(false);
    setShowYearPicker(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Controle de receitas e despesas</p>
        </div>
        <Button className="gap-2" onClick={() => toast.info('Funcionalidade em desenvolvimento')}>
          <Plus className="w-4 h-4" />
          Nova Transação
        </Button>
      </div>

      <PeriodSelector
        periodType={periodType}
        setPeriodType={setPeriodType}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        showMonthPicker={showMonthPicker}
        setShowMonthPicker={setShowMonthPicker}
        showYearPicker={showYearPicker}
        setShowYearPicker={setShowYearPicker}
      />

      <FinancialStatsCards
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        balance={balance}
        filter={filter}
        onFilterClick={handleFilterClick}
      />

      {/* Revenue by Location Breakdown */}
      {transactions.some(t => t.type === 'income' && t.location) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Receita por Unidade</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(transactions
              .filter(t => t.type === 'income' && t.location)
              .reduce((acc, t) => {
                const loc = t.location!;
                acc[loc] = (acc[loc] || 0) + t.amount;
                return acc;
              }, {} as Record<string, number>))
              .map(([location, amount]) => (
                <div key={location} className="bg-card rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1 truncate max-w-[120px]" title={location}>{location}</p>
                      <p className="text-lg font-bold text-green-600">
                        {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                      <MapPin className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <span className="text-muted-foreground">Carregando...</span>
        </div>
      ) : (
        <TransactionsList
          transactions={filteredTransactions}
          filter={filter}
          onClearFilter={() => setFilter('all')}
        />
      )}

      {/* Click outside to close dropdowns */}
      {(showMonthPicker || showYearPicker) && (
        <div className="fixed inset-0 z-40" onClick={closeDropdowns} />
      )}
    </div>
  );
}
