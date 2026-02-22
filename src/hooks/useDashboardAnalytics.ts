import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { financialService } from '@/services/financial';
import { useClinic } from '@/contexts/ClinicContext';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  format,
  addDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DashboardAnalytics {
  // Cards
  monthRevenue: number;
  monthExpenses: number;
  monthProfit: number;
  prevMonthRevenue: number;
  prevMonthExpenses: number;
  totalPatients: number;
  newPatientsThisMonth: number;
  pendingBudgetsCount: number;
  pendingBudgetsValue: number;

  // Charts
  revenueByMonth: { month: string; receita: number; despesas: number }[];
  appointmentsByDay: { day: string; count: number }[];
  budgetsByStatus: { status: string; count: number; value: number }[];
  prosthesisByStatus: { status: string; count: number }[];
}

const PROSTHESIS_STATUS_LABELS: Record<string, string> = {
  pre_lab: 'Pré-lab',
  in_lab: 'No Lab',
  in_clinic: 'Na Clínica',
  completed: 'Concluído',
};

async function fetchDashboardAnalytics(clinicId: string): Promise<DashboardAnalytics> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));

  // Week boundaries (Monday-Sunday)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Parallel queries
  const [
    transactionsResult,
    patientsCountResult,
    newPatientsResult,
    budgetsResult,
    prosthesisResult,
    appointmentsResult,
  ] = await Promise.all([
    // 1. Financial: last 6 months
    financialService.getTransactions(sixMonthsAgo, monthEnd),

    // 2. Total patients
    supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId),

    // 3. New patients this month
    supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('created_at', monthStart.toISOString()),

    // 4. Budgets with notes (for status parsing)
    supabase
      .from('budgets')
      .select('id, status, total_amount, notes, patient_id')
      .eq('clinic_id', clinicId),

    // 5. Prosthesis orders - status
    supabase
      .from('prosthesis_orders')
      .select('status')
      .eq('clinic_id', clinicId),

    // 6. Appointments this week
    supabase
      .from('appointments')
      .select('date, status')
      .eq('clinic_id', clinicId)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(weekEnd, 'yyyy-MM-dd'))
      .neq('status', 'cancelled'),
  ]);

  const transactions = transactionsResult || [];

  // --- Financial aggregation by month ---
  const monthlyMap = new Map<string, { receita: number; despesas: number }>();

  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const key = format(d, 'yyyy-MM');
    monthlyMap.set(key, { receita: 0, despesas: 0 });
  }

  let currentMonthRevenue = 0;
  let currentMonthExpenses = 0;
  let prevRevenue = 0;
  let prevExpenses = 0;
  const currentMonthKey = format(now, 'yyyy-MM');
  const prevMonthKey = format(subMonths(now, 1), 'yyyy-MM');

  for (const tx of transactions) {
    const txDate = tx.date?.slice(0, 7); // yyyy-MM
    if (!txDate) continue;

    const amount = Math.abs(tx.amount || 0);

    if (monthlyMap.has(txDate)) {
      const entry = monthlyMap.get(txDate)!;
      if (tx.type === 'income') {
        entry.receita += amount;
      } else if (tx.type === 'expense') {
        entry.despesas += amount;
      }
    }

    if (txDate === currentMonthKey) {
      if (tx.type === 'income') currentMonthRevenue += amount;
      else if (tx.type === 'expense') currentMonthExpenses += amount;
    }

    if (txDate === prevMonthKey) {
      if (tx.type === 'income') prevRevenue += amount;
      else if (tx.type === 'expense') prevExpenses += amount;
    }
  }

  const revenueByMonth = Array.from(monthlyMap.entries()).map(([key, val]) => {
    const [year, month] = key.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return {
      month: format(d, 'MMM/yy', { locale: ptBR }),
      receita: Math.round(val.receita * 100) / 100,
      despesas: Math.round(val.despesas * 100) / 100,
    };
  });

  // --- Patients ---
  const totalPatients = patientsCountResult.count || 0;
  const newPatientsThisMonth = newPatientsResult.count || 0;

  // --- Budgets ---
  const budgets = (budgetsResult.data || []) as any[];
  const budgetStatusMap: Record<string, { count: number; value: number }> = {
    Pendente: { count: 0, value: 0 },
    Aprovado: { count: 0, value: 0 },
    Concluído: { count: 0, value: 0 },
  };

  let pendingBudgetsCount = 0;
  let pendingBudgetsValue = 0;

  for (const budget of budgets) {
    const status = budget.status || 'pending';
    const amount = budget.total_amount || 0;

    if (status === 'pending') {
      budgetStatusMap['Pendente'].count++;
      budgetStatusMap['Pendente'].value += amount;
      pendingBudgetsCount++;
      pendingBudgetsValue += amount;
    } else if (status === 'approved') {
      budgetStatusMap['Aprovado'].count++;
      budgetStatusMap['Aprovado'].value += amount;
    } else if (status === 'completed') {
      budgetStatusMap['Concluído'].count++;
      budgetStatusMap['Concluído'].value += amount;
    }
  }

  const budgetsByStatus = Object.entries(budgetStatusMap).map(([status, data]) => ({
    status,
    count: data.count,
    value: Math.round(data.value * 100) / 100,
  }));

  // --- Prosthesis ---
  const prosthesisOrders = (prosthesisResult.data || []) as any[];
  const prosthesisCountMap: Record<string, number> = {};
  for (const order of prosthesisOrders) {
    const label = PROSTHESIS_STATUS_LABELS[order.status] || order.status;
    prosthesisCountMap[label] = (prosthesisCountMap[label] || 0) + 1;
  }

  // Ensure all statuses present
  const prosthesisByStatus = Object.entries(PROSTHESIS_STATUS_LABELS).map(([key, label]) => ({
    status: label,
    count: prosthesisCountMap[label] || 0,
  }));

  // --- Appointments by day of week ---
  const appointments = (appointmentsResult.data || []) as any[];
  const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const dayCounts = new Array(7).fill(0);

  for (const appt of appointments) {
    // Calculate day index from date
    const apptDate = new Date(appt.date + 'T00:00:00');
    let dayIndex = apptDate.getDay() - 1; // getDay: 0=Sun, so Mon=0
    if (dayIndex < 0) dayIndex = 6; // Sunday -> 6
    dayCounts[dayIndex]++;
  }

  const appointmentsByDay = dayLabels.map((day, i) => ({
    day,
    count: dayCounts[i],
  }));

  return {
    monthRevenue: Math.round(currentMonthRevenue * 100) / 100,
    monthExpenses: Math.round(currentMonthExpenses * 100) / 100,
    monthProfit: Math.round((currentMonthRevenue - currentMonthExpenses) * 100) / 100,
    prevMonthRevenue: Math.round(prevRevenue * 100) / 100,
    prevMonthExpenses: Math.round(prevExpenses * 100) / 100,
    totalPatients,
    newPatientsThisMonth,
    pendingBudgetsCount,
    pendingBudgetsValue: Math.round(pendingBudgetsValue * 100) / 100,
    revenueByMonth,
    appointmentsByDay,
    budgetsByStatus,
    prosthesisByStatus,
  };
}

export function useDashboardAnalytics() {
  const { clinicId } = useClinic();

  return useQuery({
    queryKey: ['dashboard-analytics', clinicId],
    queryFn: () => fetchDashboardAnalytics(clinicId!),
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
  });
}
