import { supabase } from '../lib/supabase';
import { financialService } from './financial';

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
}

export interface AnalyticsData {
  periodRevenue: number;
  periodExpenses: number;
  avgMonthlyRevenue: number;
  revenueGrowth: number;
  newPatientsInPeriod: number;
  newPatientsPrevPeriod: number;
  totalPatients: number;
  returnRate: number;
  cancellationRate: number;
  noShowRate: number;
  avgTicket: number;
  budgetApprovalRate: number;

  revenueByMonth: { month: string; receita: number; despesas: number; lucro: number }[];
  newPatientsByMonth: { month: string; count: number }[];
  appointmentsByStatus: { status: string; count: number }[];
  topProcedures: { name: string; count: number; value: number }[];
  patientsByAge: { range: string; count: number }[];
  revenueByDentist: { name: string; value: number; count: number }[];
  appointmentsByDayOfWeek: { day: string; total: number; completed: number; cancelled: number }[];
  paymentMethods: { method: string; value: number; count: number }[];
}

const AGE_RANGES = [
  { label: '0-12', min: 0, max: 12 },
  { label: '13-17', min: 13, max: 17 },
  { label: '18-30', min: 18, max: 30 },
  { label: '31-45', min: 31, max: 45 },
  { label: '46-60', min: 46, max: 60 },
  { label: '60+', min: 61, max: 200 },
];

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Faltou',
  waiting: 'Aguardando',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  credit: 'Crédito',
  debit: 'Débito',
  pix: 'PIX',
  bank: 'Transferência',
  check: 'Cheque',
  boleto: 'Boleto',
};

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmtDate(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function subMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() - n, d.getDate());
}

function diffMonths(a: Date, b: Date): number {
  return Math.max((a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth()), 1);
}

function eachMonth(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  let cur = startOfMonth(start);
  const last = endOfMonth(end);
  while (cur <= last) {
    months.push(new Date(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return months;
}

function diffYears(a: Date, b: Date): number {
  let age = a.getFullYear() - b.getFullYear();
  const m = a.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && a.getDate() < b.getDate())) age--;
  return age;
}

function monthKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return MONTH_SHORT[parseInt(m) - 1] + '/' + y.slice(2);
}

export const analyticsService = {
  async fetch(clinicId: string, period: AnalyticsPeriod): Promise<AnalyticsData> {
    const { start, end } = period;
    const startStr = fmtDate(start);
    const endStr = fmtDate(end);

    const periodMonths = diffMonths(end, start);
    const prevStart = subMonths(start, periodMonths);
    const prevEnd = subMonths(end, periodMonths);
    const prevStartStr = fmtDate(prevStart);
    const prevEndStr = fmtDate(prevEnd);

    const [
      transactionsResult,
      prevTransactionsResult,
      patientsResult,
      appointmentsResult,
      proceduresResult,
      budgetsResult,
      dentistsResult,
    ] = await Promise.all([
      financialService.getTransactions(start, end),
      financialService.getTransactions(prevStart, prevEnd),
      supabase
        .from('patients')
        .select('id, created_at, birth_date')
        .eq('clinic_id', clinicId)
        .is('deleted_at', null),
      supabase
        .from('appointments')
        .select('id, date, status, patient_id, dentist_id')
        .eq('clinic_id', clinicId)
        .gte('date', startStr)
        .lte('date', endStr),
      supabase
        .from('procedures')
        .select('id, date, description, value, status, created_by')
        .eq('clinic_id', clinicId)
        .gte('date', startStr)
        .lte('date', endStr),
      supabase
        .from('budgets')
        .select('id, status, total_amount, created_at')
        .eq('clinic_id', clinicId),
      supabase
        .from('clinic_users')
        .select('user_id, role, profiles(full_name)')
        .eq('clinic_id', clinicId)
        .in('role', ['dentist', 'owner', 'admin']),
    ]);

    const transactions = transactionsResult || [];
    const prevTransactions = prevTransactionsResult || [];
    const patients = (patientsResult.data || []) as any[];
    const appointments = (appointmentsResult.data || []) as any[];
    const procedures = (proceduresResult.data || []) as any[];
    const budgets = (budgetsResult.data || []) as any[];
    const dentists = (dentistsResult.data || []) as any[];

    const dentistNameMap: Record<string, string> = {};
    for (const d of dentists) {
      dentistNameMap[d.user_id] = (d as any).profiles?.full_name || 'Sem nome';
    }

    // Monthly buckets
    const months = eachMonth(start, end);
    const monthlyMap = new Map<string, { receita: number; despesas: number }>();
    for (const m of months) monthlyMap.set(monthKey(m), { receita: 0, despesas: 0 });

    const paymentMethodMap = new Map<string, { value: number; count: number }>();
    let periodRevenue = 0;
    let periodExpenses = 0;
    let incomeCount = 0;
    let incomeSum = 0;

    for (const tx of transactions) {
      const txMonth = tx.date?.slice(0, 7);
      if (!txMonth) continue;
      const amount = Math.abs(tx.amount || 0);

      if (monthlyMap.has(txMonth)) {
        const entry = monthlyMap.get(txMonth)!;
        if (tx.type === 'income') entry.receita += amount;
        else if (tx.type === 'expense') entry.despesas += amount;
      }

      if (tx.type === 'income') {
        periodRevenue += amount;
        incomeCount++;
        incomeSum += amount;
      } else if (tx.type === 'expense') {
        periodExpenses += amount;
      }

      if (tx.type === 'income' && tx.payment_method) {
        const existing = paymentMethodMap.get(tx.payment_method) || { value: 0, count: 0 };
        existing.value += amount;
        existing.count++;
        paymentMethodMap.set(tx.payment_method, existing);
      }
    }

    let prevPeriodRevenue = 0;
    for (const tx of prevTransactions) {
      if (tx.type === 'income') prevPeriodRevenue += Math.abs(tx.amount || 0);
    }

    const revenueByMonth = Array.from(monthlyMap.entries()).map(([key, val]) => ({
      month: monthLabel(key),
      receita: Math.round(val.receita * 100) / 100,
      despesas: Math.round(val.despesas * 100) / 100,
      lucro: Math.round((val.receita - val.despesas) * 100) / 100,
    }));

    const numMonths = Math.max(months.length, 1);
    const avgMonthlyRevenue = periodRevenue / numMonths;
    const revenueGrowth = prevPeriodRevenue > 0
      ? ((periodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100
      : 0;

    // Patients
    const totalPatients = patients.length;
    const newPatientsInPeriod = patients.filter((p: any) => {
      if (!p.created_at) return false;
      const d = p.created_at.slice(0, 10);
      return d >= startStr && d <= endStr;
    }).length;
    const newPatientsPrevPeriod = patients.filter((p: any) => {
      if (!p.created_at) return false;
      const d = p.created_at.slice(0, 10);
      return d >= prevStartStr && d <= prevEndStr;
    }).length;

    // New patients by month
    const newPatientsByMonthMap = new Map<string, number>();
    for (const m of months) newPatientsByMonthMap.set(monthKey(m), 0);
    for (const p of patients) {
      const pMonth = p.created_at?.slice(0, 7);
      if (pMonth && newPatientsByMonthMap.has(pMonth)) {
        newPatientsByMonthMap.set(pMonth, (newPatientsByMonthMap.get(pMonth) || 0) + 1);
      }
    }
    const newPatientsByMonth = Array.from(newPatientsByMonthMap.entries()).map(([key, count]) => ({
      month: monthLabel(key),
      count,
    }));

    // Age distribution
    const now = new Date();
    const patientsByAge = AGE_RANGES.map(r => ({ range: r.label, count: 0 }));
    for (const p of patients) {
      if (!p.birth_date) continue;
      const age = diffYears(now, new Date(p.birth_date));
      const idx = AGE_RANGES.findIndex(r => age >= r.min && age <= r.max);
      if (idx >= 0) patientsByAge[idx].count++;
    }

    // Appointments
    const totalAppts = appointments.length;
    const cancelledCount = appointments.filter((a: any) => a.status === 'cancelled').length;
    const noShowCount = appointments.filter((a: any) => a.status === 'no_show').length;
    const cancellationRate = totalAppts > 0 ? (cancelledCount / totalAppts) * 100 : 0;
    const noShowRate = totalAppts > 0 ? (noShowCount / totalAppts) * 100 : 0;

    const statusMap = new Map<string, number>();
    for (const a of appointments) {
      const s = a.status || 'scheduled';
      statusMap.set(s, (statusMap.get(s) || 0) + 1);
    }
    const appointmentsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status: STATUS_LABELS[status] || status,
      count,
    }));

    // Return rate
    const patientApptCount = new Map<string, number>();
    for (const a of appointments) {
      if (a.patient_id) patientApptCount.set(a.patient_id, (patientApptCount.get(a.patient_id) || 0) + 1);
    }
    const patientsWithAppts = patientApptCount.size;
    const returningPatients = Array.from(patientApptCount.values()).filter(c => c > 1).length;
    const returnRate = patientsWithAppts > 0 ? (returningPatients / patientsWithAppts) * 100 : 0;

    // Appointments by day of week
    const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const dayData = DAY_LABELS.map(day => ({ day, total: 0, completed: 0, cancelled: 0 }));
    for (const a of appointments) {
      if (!a.date) continue;
      const apptDate = new Date(a.date + 'T00:00:00');
      let dayIndex = apptDate.getDay() - 1;
      if (dayIndex < 0) dayIndex = 6;
      dayData[dayIndex].total++;
      if (a.status === 'completed') dayData[dayIndex].completed++;
      if (a.status === 'cancelled') dayData[dayIndex].cancelled++;
    }

    // Top procedures
    const procMap = new Map<string, { count: number; value: number }>();
    for (const p of procedures) {
      const name = p.description || 'Outros';
      const existing = procMap.get(name) || { count: 0, value: 0 };
      existing.count++;
      existing.value += (p.value || 0);
      procMap.set(name, existing);
    }
    const topProcedures = Array.from(procMap.entries())
      .map(([name, data]) => ({ name, count: data.count, value: Math.round(data.value * 100) / 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Revenue by dentist
    const dentistRevenueMap = new Map<string, { value: number; count: number }>();
    for (const tx of transactions) {
      if (tx.type !== 'income') continue;
      const uid = (tx as any).created_by || (tx as any).user_id;
      if (!uid || !dentistNameMap[uid]) continue;
      const existing = dentistRevenueMap.get(uid) || { value: 0, count: 0 };
      existing.value += Math.abs(tx.amount || 0);
      existing.count++;
      dentistRevenueMap.set(uid, existing);
    }
    const revenueByDentist = Array.from(dentistRevenueMap.entries())
      .map(([uid, data]) => ({
        name: dentistNameMap[uid] || 'Desconhecido',
        value: Math.round(data.value * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);

    // Budget approval rate
    const periodBudgets = budgets.filter((b: any) => {
      if (!b.created_at) return true;
      const d = b.created_at.slice(0, 10);
      return d >= startStr && d <= endStr;
    });
    const approvedBudgets = periodBudgets.filter((b: any) => b.status === 'approved' || b.status === 'completed').length;
    const pendingBudgets = periodBudgets.filter((b: any) => b.status === 'pending').length;
    const budgetApprovalRate = (approvedBudgets + pendingBudgets) > 0
      ? (approvedBudgets / (approvedBudgets + pendingBudgets)) * 100
      : 0;

    // Payment methods
    const paymentMethods = Array.from(paymentMethodMap.entries())
      .map(([method, data]) => ({
        method: PAYMENT_LABELS[method] || method,
        value: Math.round(data.value * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);

    const avgTicket = incomeCount > 0 ? incomeSum / incomeCount : 0;

    return {
      periodRevenue: Math.round(periodRevenue * 100) / 100,
      periodExpenses: Math.round(periodExpenses * 100) / 100,
      avgMonthlyRevenue: Math.round(avgMonthlyRevenue * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      newPatientsInPeriod,
      newPatientsPrevPeriod,
      totalPatients,
      returnRate: Math.round(returnRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      noShowRate: Math.round(noShowRate * 10) / 10,
      avgTicket: Math.round(avgTicket * 100) / 100,
      budgetApprovalRate: Math.round(budgetApprovalRate * 10) / 10,
      revenueByMonth,
      newPatientsByMonth,
      appointmentsByStatus,
      topProcedures,
      patientsByAge,
      revenueByDentist,
      appointmentsByDayOfWeek: dayData,
      paymentMethods,
    };
  },
};
