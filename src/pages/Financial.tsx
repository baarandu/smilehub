import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FilterType,
  PeriodType,
  Transaction,
  PeriodSelector,
  FinancialStatsCards,
  TransactionsList,
} from '@/components/financial';

// Dados mock temporários - depois integrar com Supabase
const mockTransactions: Transaction[] = [
  { id: '1', type: 'income', description: 'Consulta - Maria Silva', amount: 150, date: '2024-12-10', category: 'Consulta' },
  { id: '2', type: 'income', description: 'Limpeza - João Santos', amount: 200, date: '2024-12-10', category: 'Procedimento' },
  { id: '3', type: 'expense', description: 'Compra de materiais', amount: 450, date: '2024-12-09', category: 'Materiais' },
  { id: '4', type: 'income', description: 'Clareamento - Ana Oliveira', amount: 800, date: '2024-11-15', category: 'Procedimento' },
  { id: '5', type: 'expense', description: 'Conta de luz', amount: 280, date: '2024-11-08', category: 'Despesas Fixas' },
  { id: '6', type: 'income', description: 'Restauração - Pedro Costa', amount: 350, date: '2024-10-20', category: 'Procedimento' },
  { id: '7', type: 'expense', description: 'Aluguel', amount: 2500, date: '2024-12-05', category: 'Despesas Fixas' },
  { id: '8', type: 'income', description: 'Canal - Lucas Mendes', amount: 1200, date: '2024-12-03', category: 'Procedimento' },
];

export default function Financial() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Calculate period boundaries
  const getPeriodBoundaries = () => {
    if (periodType === 'monthly') {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);
      return { start, end };
    }
    const start = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);
    return { start, end };
  };

  const { start, end } = getPeriodBoundaries();

  // Filter transactions by period
  const periodTransactions = mockTransactions.filter((t) => {
    const transactionDate = new Date(t.date);
    return transactionDate >= start && transactionDate <= end;
  });

  // Calculate totals
  const totalIncome = periodTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = periodTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  // Filter by type
  const filteredTransactions = periodTransactions.filter((t) => {
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
        <Button className="gap-2">
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

      <TransactionsList
        transactions={filteredTransactions}
        filter={filter}
        onClearFilter={() => setFilter('all')}
      />

      {/* Click outside to close dropdowns */}
      {(showMonthPicker || showYearPicker) && (
        <div className="fixed inset-0 z-40" onClick={closeDropdowns} />
      )}
    </div>
  );
}
