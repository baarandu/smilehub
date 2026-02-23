import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financialService } from '@/services/financial';
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfWeek,
  endOfWeek,
  subMonths,
  addMonths,
  subYears,
  addYears,
  subWeeks,
  addWeeks,
  format,
  getDaysInMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameYear,
  isSameDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type PeriodMode = 'weekly' | 'monthly' | 'yearly';

export interface RevenueExpensesDataPoint {
  label: string;
  receita: number;
  despesas: number;
}

export function useRevenueExpensesChart() {
  const [mode, setMode] = useState<PeriodMode>('monthly');
  const [referenceDate, setReferenceDate] = useState(new Date());

  const range = useMemo(() => {
    if (mode === 'weekly') {
      const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
      const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
      return { start, end };
    }
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

    if (mode === 'weekly') {
      const days = eachDayOfInterval({ start: range.start, end: range.end });
      const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

      return days.map((day, idx) => {
        let receita = 0;
        let despesas = 0;
        for (const tx of txs) {
          if (!tx.date) continue;
          const txDate = new Date(tx.date);
          if (!isSameDay(txDate, day)) continue;
          const amount = Math.abs(tx.amount || 0);
          if (tx.type === 'income') receita += amount;
          else if (tx.type === 'expense') despesas += amount;
        }
        return {
          label: dayLabels[idx] || format(day, 'EEE', { locale: ptBR }),
          receita: Math.round(receita * 100) / 100,
          despesas: Math.round(despesas * 100) / 100,
        };
      });
    }

    if (mode === 'monthly') {
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
  }, [transactions, mode, referenceDate, range.start, range.end]);

  const periodLabel = useMemo(() => {
    if (mode === 'weekly') {
      return `${format(range.start, 'dd/MM', { locale: ptBR })} - ${format(range.end, 'dd/MM', { locale: ptBR })}`;
    }
    if (mode === 'monthly') {
      return format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR });
    }
    return format(referenceDate, 'yyyy');
  }, [mode, referenceDate, range.start, range.end]);

  const goBack = () => {
    setReferenceDate((prev) =>
      mode === 'weekly' ? subWeeks(prev, 1) : mode === 'monthly' ? subMonths(prev, 1) : subYears(prev, 1)
    );
  };

  const goForward = () => {
    setReferenceDate((prev) =>
      mode === 'weekly' ? addWeeks(prev, 1) : mode === 'monthly' ? addMonths(prev, 1) : addYears(prev, 1)
    );
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
    referenceDate,
    range,
  };
}
