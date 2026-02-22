import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financialService } from '@/services/financial';
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  addMonths,
  subYears,
  addYears,
  format,
  getDaysInMonth,
  isSameMonth,
  isSameYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodMode = 'monthly' | 'yearly';

export interface RevenueExpensesDataPoint {
  label: string;
  receita: number;
  despesas: number;
}

export function useRevenueExpensesChart() {
  const [mode, setMode] = useState<PeriodMode>('monthly');
  const [referenceDate, setReferenceDate] = useState(new Date());

  const range = useMemo(() => {
    if (mode === 'monthly') {
      return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
    }
    return { start: startOfYear(referenceDate), end: endOfYear(referenceDate) };
  }, [mode, referenceDate]);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['revenue-expenses-chart', mode, range.start.toISOString(), range.end.toISOString()],
    queryFn: () => financialService.getTransactions(range.start, range.end),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const chartData = useMemo((): RevenueExpensesDataPoint[] => {
    const txs = transactions || [];

    if (mode === 'monthly') {
      // Group by day of the month
      const daysInMonth = getDaysInMonth(referenceDate);
      const dayMap = new Map<number, { receita: number; despesas: number }>();
      for (let d = 1; d <= daysInMonth; d++) {
        dayMap.set(d, { receita: 0, despesas: 0 });
      }

      for (const tx of txs) {
        if (!tx.date) continue;
        const txDate = new Date(tx.date);
        if (!isSameMonth(txDate, referenceDate)) continue;
        const day = txDate.getDate();
        const entry = dayMap.get(day);
        if (!entry) continue;
        const amount = Math.abs(tx.amount || 0);
        if (tx.type === 'income') entry.receita += amount;
        else if (tx.type === 'expense') entry.despesas += amount;
      }

      return Array.from(dayMap.entries()).map(([day, val]) => ({
        label: String(day).padStart(2, '0'),
        receita: Math.round(val.receita * 100) / 100,
        despesas: Math.round(val.despesas * 100) / 100,
      }));
    }

    // Yearly: group by month
    const monthMap = new Map<number, { receita: number; despesas: number }>();
    for (let m = 0; m < 12; m++) {
      monthMap.set(m, { receita: 0, despesas: 0 });
    }

    for (const tx of txs) {
      if (!tx.date) continue;
      const txDate = new Date(tx.date);
      if (!isSameYear(txDate, referenceDate)) continue;
      const month = txDate.getMonth();
      const entry = monthMap.get(month);
      if (!entry) continue;
      const amount = Math.abs(tx.amount || 0);
      if (tx.type === 'income') entry.receita += amount;
      else if (tx.type === 'expense') entry.despesas += amount;
    }

    return Array.from(monthMap.entries()).map(([m, val]) => {
      const d = new Date(referenceDate.getFullYear(), m);
      return {
        label: format(d, 'MMM', { locale: ptBR }),
        receita: Math.round(val.receita * 100) / 100,
        despesas: Math.round(val.despesas * 100) / 100,
      };
    });
  }, [transactions, mode, referenceDate]);

  const periodLabel = useMemo(() => {
    if (mode === 'monthly') {
      return format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
    return format(referenceDate, 'yyyy');
  }, [mode, referenceDate]);

  const goBack = () => {
    setReferenceDate((prev) => (mode === 'monthly' ? subMonths(prev, 1) : subYears(prev, 1)));
  };

  const goForward = () => {
    setReferenceDate((prev) => (mode === 'monthly' ? addMonths(prev, 1) : addYears(prev, 1)));
  };

  const changeMode = (newMode: PeriodMode) => {
    setMode(newMode);
    setReferenceDate(new Date());
  };

  return {
    mode,
    changeMode,
    periodLabel,
    goBack,
    goForward,
    chartData,
    isLoading,
  };
}
