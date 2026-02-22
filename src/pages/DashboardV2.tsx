import { useState, useEffect } from 'react';
import {
  Calendar,
  Bell,
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  User,
  ChevronRight,
  Phone,
  MessageCircle,
  Gift,
  CalendarClock,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RevenueExpensesChart } from '@/components/dashboard-preview/RevenueExpensesChart';
import { WeeklyAppointmentsChart } from '@/components/dashboard-preview/WeeklyAppointmentsChart';
import { BudgetStatusChart } from '@/components/dashboard-preview/BudgetStatusChart';
import { ProsthesisStatusChart } from '@/components/dashboard-preview/ProsthesisStatusChart';
import { ProfileMenu } from '@/components/profile';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useTodayAppointments, useTodayAppointmentsCount } from '@/hooks/useAppointments';
import { useReturnAlerts, usePendingReturnsCount } from '@/hooks/useConsultations';
import { useBirthdayAlerts, useProcedureReminders, useProsthesisSchedulingAlerts, useImportantReturnAlerts } from '@/hooks/useAlerts';
import { PROSTHESIS_TYPE_LABELS } from '@/types/prosthesis';
import { usePendingReturnsList, useMarkProcedureCompleted } from '@/hooks/usePendingReturns';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { budgetsService } from '@/services/budgets';
import { remindersService, type Reminder } from '@/services/reminders';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { PendingBudgetsDialog } from '@/components/patients/PendingBudgetsDialog';
import { OnboardingModal, OnboardingFloatingButton } from '@/components/onboarding';
import { ProfileSettingsModal } from '@/components/profile/ProfileSettingsModal';
import { useOnboarding } from '@/contexts/OnboardingContext';
import type { RecentAlert } from '@/components/dashboard/ReturnAlertsList';
import type { AppointmentWithPatient } from '@/types/database';

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */
function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pctChange(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

/* ═══════════════════════════════════════════
   Stat Tile — completely new design
   ═══════════════════════════════════════════ */
const tileStyles = {
  rose:    'from-[#a03f3d]/10 to-[#a03f3d]/[0.03] border-[#a03f3d]/15 [&_.tile-icon]:bg-[#a03f3d]/15 [&_.tile-icon]:text-[#a03f3d] [&_.tile-value]:text-[#a03f3d]',
  emerald: 'from-emerald-500/10 to-emerald-500/[0.03] border-emerald-500/15 [&_.tile-icon]:bg-emerald-500/15 [&_.tile-icon]:text-emerald-600 [&_.tile-value]:text-emerald-700',
  amber:   'from-amber-500/10 to-amber-500/[0.03] border-amber-500/15 [&_.tile-icon]:bg-amber-500/15 [&_.tile-icon]:text-amber-600 [&_.tile-value]:text-amber-700',
  slate:   'from-slate-500/10 to-slate-500/[0.03] border-slate-500/15 [&_.tile-icon]:bg-slate-500/15 [&_.tile-icon]:text-slate-600 [&_.tile-value]:text-slate-700',
} as const;

function StatTile({
  title,
  value,
  icon: Icon,
  color,
  onClick,
  delay = 0,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: keyof typeof tileStyles;
  onClick?: () => void;
  delay?: number;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-300',
        'hover:shadow-elevated hover:-translate-y-0.5',
        'animate-slide-up',
        tileStyles[color],
        onClick && 'cursor-pointer',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{title}</p>
          <p className="tile-value text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className="tile-icon flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {onClick && (
        <ArrowUpRight className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground/30 transition-all group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Financial Card — glass style
   ═══════════════════════════════════════════ */
function FinancialCard({
  label,
  value,
  icon: Icon,
  trend,
  positive,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: number;
  positive?: boolean;
}) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 transition-all hover:border-border hover:shadow-card">
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
        positive === true && 'bg-emerald-100 text-emerald-600',
        positive === false && 'bg-red-100 text-red-500',
        positive === undefined && 'bg-primary/10 text-primary',
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">{label}</p>
        <p className="text-base font-bold tracking-tight text-foreground">{value}</p>
      </div>
      {trend !== undefined && trend !== 0 && (
        <span className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
          (positive ?? trend >= 0) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
        )}>
          {(positive ?? trend >= 0) ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Inline Today Appointments — timeline style
   ═══════════════════════════════════════════ */
const statusMap: Record<string, { label: string; dot: string; badge: string }> = {
  scheduled:  { label: 'Agendado',         dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700' },
  confirmed:  { label: 'Confirmado',       dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700' },
  completed:  { label: 'Compareceu',       dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700' },
  cancelled:  { label: 'Cancelado',        dot: 'bg-red-400',     badge: 'bg-red-50 text-red-600' },
  no_show:    { label: 'Não compareceu',   dot: 'bg-orange-400',  badge: 'bg-orange-50 text-orange-700' },
};
const defaultStatus = { label: 'Pendente', dot: 'bg-gray-300', badge: 'bg-gray-100 text-gray-600' };

function TimelineAppointments({
  appointments,
  isLoading,
}: {
  appointments: AppointmentWithPatient[];
  isLoading: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Clock className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Agenda de Hoje</h3>
            <p className="text-xs text-muted-foreground">{appointments.length} consultas</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/agenda')}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          Ver agenda <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[420px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma consulta hoje</p>
          </div>
        ) : (
          <div className="relative px-6 py-4">
            {/* vertical timeline line */}
            <div className="absolute left-[39px] top-4 bottom-4 w-px bg-border" />

            <div className="space-y-1">
              {appointments.map((appt, i) => {
                const st = statusMap[appt.status] || defaultStatus;
                const name = appt.patients?.name || 'Paciente';
                return (
                  <div
                    key={appt.id}
                    onClick={() => navigate(`/pacientes/${appt.patient_id}`)}
                    className="group relative flex items-center gap-4 rounded-xl p-3 transition-all cursor-pointer hover:bg-muted/40 animate-slide-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {/* timeline dot */}
                    <div className={cn('relative z-10 h-3 w-3 shrink-0 rounded-full ring-[3px] ring-card', st.dot)} />

                    {/* time */}
                    <span className="w-12 shrink-0 text-sm font-bold tabular-nums text-foreground">
                      {appt.time.slice(0, 5)}
                    </span>

                    {/* patient */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{name}</p>
                      {appt.notes && (
                        <p className="truncate text-xs text-muted-foreground">{appt.notes}</p>
                      )}
                    </div>

                    {/* badge */}
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', st.badge)}>
                      {st.label}
                    </span>

                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Inline Alerts — compact card style
   ═══════════════════════════════════════════ */
const alertTypeConfig = {
  birthday:              { icon: Gift,          color: 'text-pink-600',    bg: 'bg-pink-50' },
  procedure_return:      { icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50' },
  prosthesis_scheduling: { icon: CalendarClock,  color: 'text-violet-600',  bg: 'bg-violet-50' },
  scheduled:             { icon: Bell,          color: 'text-[#a03f3d]',   bg: 'bg-red-50' },
  reminder:              { icon: Bell,          color: 'text-[#a03f3d]',   bg: 'bg-red-50' },
} as const;

function handleWhatsApp(phone: string, name: string, type: string) {
  const clean = phone.replace(/\D/g, '');
  let msg = '';
  if (type === 'birthday') {
    msg = `Parabéns ${name}! 🎉\nNós do Organiza Odonto desejamos a você um feliz aniversário, muita saúde e alegria!\nConte sempre conosco para cuidar do seu sorriso.`;
  } else if (type === 'procedure_return') {
    msg = `Olá ${name}, tudo bem?\nNotamos que já se passaram 6 meses desde seu último procedimento conosco. Que tal agendar uma avaliação de retorno?`;
  } else {
    msg = `Olá ${name}! Estamos entrando em contato para lembrar sobre sua consulta de retorno. Podemos agendar um horário?`;
  }
  window.open(`https://wa.me/55${clean}?text=${encodeURIComponent(msg)}`, '_blank');
}

function AlertsPanel({
  alerts,
  isLoading,
}: {
  alerts: RecentAlert[];
  isLoading: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
            <Bell className="h-4.5 w-4.5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Alertas & Lembretes</h3>
            <p className="text-xs text-muted-foreground">{alerts.length} pendentes</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/alertas')}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          Ver todos <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto max-h-[420px]">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhum alerta recente</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {alerts.map((alert, i) => {
              const cfg = alertTypeConfig[alert.type] || alertTypeConfig.scheduled;
              const Icon = cfg.icon;
              return (
                <div
                  key={`${alert.type}-${alert.id}`}
                  className="group flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-muted/40 animate-slide-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', cfg.bg)}>
                    <Icon className={cn('h-4 w-4', cfg.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{alert.patientName}</p>
                    <p className="truncate text-xs text-muted-foreground">{alert.subtitle}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {alert.patientPhone && (
                      <>
                        <button
                          onClick={() => window.open(`tel:${alert.patientPhone.replace(/\D/g, '')}`)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleWhatsApp(alert.patientPhone, alert.patientName.split(' ')[0], alert.type)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Dashboard V2
   ═══════════════════════════════════════════ */
export default function DashboardV2() {
  const navigate = useNavigate();
  const { returnToOnboardingIfNeeded } = useOnboarding();

  /* ── Data ── */
  const { data: analytics, isLoading: loadingAnalytics } = useDashboardAnalytics();
  const { data: todayAppointments, isLoading: loadingAppointments } = useTodayAppointments();
  const { data: todayCount, isLoading: loadingTodayCount } = useTodayAppointmentsCount();
  const { data: returnAlerts, isLoading: loadingReturns } = useReturnAlerts();
  const { data: birthdayAlerts, isLoading: loadingBirthdays } = useBirthdayAlerts();
  const { data: procedureAlerts, isLoading: loadingProcedures } = useProcedureReminders();
  const { data: prosthesisAlerts } = useProsthesisSchedulingAlerts();
  const { data: importantReturns, isLoading: loadingImportantReturns } = useImportantReturnAlerts();
  const { data: pendingReturns, isLoading: loadingPending } = usePendingReturnsCount();
  const { data: pendingReturnsList, isLoading: loadingPendingList, refetch: refetchPendingReturns } = usePendingReturnsList();
  const markCompleted = useMarkProcedureCompleted();

  /* ── Local state ── */
  const [activeRemindersCount, setActiveRemindersCount] = useState(0);
  const [activeRemindersList, setActiveRemindersList] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [pendingBudgetsCount, setPendingBudgetsCount] = useState(0);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [showPendingReturnsModal, setShowPendingReturnsModal] = useState(false);
  const [showBudgetsModal, setShowBudgetsModal] = useState(false);
  const [showImportantReturnsModal, setShowImportantReturnsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileSettingsTab, setProfileSettingsTab] = useState<'clinic' | 'team' | 'audit'>('clinic');

  /* ── Init ── */
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    loadPendingBudgets();
    try {
      const [count, list] = await Promise.all([
        remindersService.getActiveCount(),
        remindersService.getActive(),
      ]);
      setActiveRemindersCount(count);
      setActiveRemindersList(list);
    } catch {
      // silently fail
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    refetchPendingReturns();
    setIsRefreshing(false);
  };

  const loadPendingBudgets = async () => {
    try {
      setLoadingBudgets(true);
      setPendingBudgetsCount(await budgetsService.getPendingPatientsCount());
    } catch {
      // silently fail
    } finally {
      setLoadingBudgets(false);
    }
  };

  /* ── Alerts ── */
  const isLoadingAlerts = loadingReturns || loadingBirthdays || loadingProcedures;

  const recentAlerts: RecentAlert[] = [
    ...(birthdayAlerts || []).map(a => ({
      id: `b-${a.patient.id}`, type: 'birthday' as const,
      patientName: a.patient.name, patientPhone: a.patient.phone,
      date: a.date, subtitle: 'Aniversário hoje', urgency: 'urgent' as const,
    })),
    ...(procedureAlerts || []).map(a => ({
      id: `p-${a.patient.id}`, type: 'procedure_return' as const,
      patientName: a.patient.name, patientPhone: a.patient.phone,
      date: a.date, subtitle: `${a.daysSince} dias sem vir`, urgency: 'urgent' as const,
    })),
    ...(returnAlerts || []).map(a => ({
      id: `r-${a.patient_id}`, type: 'scheduled' as const,
      patientName: a.patient_name, patientPhone: a.phone,
      date: a.suggested_return_date,
      subtitle: `Retorno em ${a.days_until_return} dias`,
      urgency: (a.days_until_return <= 7 ? 'urgent' : 'normal') as 'urgent' | 'normal',
    })),
    ...(activeRemindersList || []).map(r => ({
      id: `rem-${r.id}`, type: 'reminder' as const,
      patientName: r.title, patientPhone: '',
      date: r.created_at, subtitle: r.description || 'Lembrete', urgency: 'normal' as const,
    })),
    ...(prosthesisAlerts || []).map(a => ({
      id: `prost-${a.id}`, type: 'prosthesis_scheduling' as const,
      patientName: a.patientName, patientPhone: a.patientPhone,
      date: a.createdAt,
      subtitle: `Agendar prova - ${PROSTHESIS_TYPE_LABELS[a.type] || a.type}${a.toothNumbers.length > 0 ? ` (${a.toothNumbers.join(', ')})` : ''}`,
      urgency: 'urgent' as const,
    })),
  ].slice(0, 6);

  /* ── Derived ── */
  const revTrend = analytics ? pctChange(analytics.monthRevenue, analytics.prevMonthRevenue) : 0;
  const expTrend = analytics ? pctChange(analytics.monthExpenses, analytics.prevMonthExpenses) : 0;

  const today = new Date();
  const dateStr = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div className="space-y-8 pb-8">

      {/* ━━━ HEADER ━━━ */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#a03f3d] to-[#7a2e2c] p-6 text-white shadow-elevated">
        {/* decorative shapes */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-28 w-28 rounded-full bg-white/[0.04]" />
        <div className="pointer-events-none absolute right-1/4 top-0 h-16 w-16 rounded-full bg-white/[0.03]" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
              <img src="/logo-login.png" alt="Logo" className="h-10 w-10 object-contain brightness-0 invert" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Painel de Controle</h1>
              <p className="mt-0.5 text-sm font-medium capitalize text-white/70">{dateStr}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <ProfileMenu className="text-white hover:bg-white/10 [&_p]:text-white [&_p]:opacity-80" />
            </div>
          </div>
        </div>
      </header>

      {/* ━━━ STAT TILES ━━━ */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        {loadingReminders ? <Skeleton className="h-28 rounded-2xl" /> : (
          <StatTile title="Lembretes" value={activeRemindersCount} icon={Bell} color="rose" onClick={() => navigate('/alertas')} delay={0} />
        )}
        {loadingTodayCount ? <Skeleton className="h-28 rounded-2xl" /> : (
          <StatTile title="Consultas Hoje" value={todayCount || 0} icon={Calendar} color="emerald" delay={50} />
        )}
        {loadingPending ? <Skeleton className="h-28 rounded-2xl" /> : (
          <StatTile title="Retornos" value={pendingReturnsList?.length || pendingReturns || 0} icon={AlertTriangle} color="amber" onClick={() => setShowPendingReturnsModal(true)} delay={100} />
        )}
        {loadingBudgets ? <Skeleton className="h-28 rounded-2xl" /> : (
          <StatTile title="Orçamentos" value={pendingBudgetsCount} icon={FileText} color="slate" onClick={() => setShowBudgetsModal(true)} delay={150} />
        )}
        {loadingImportantReturns ? <Skeleton className="h-28 rounded-2xl" /> : (
          <StatTile title="Retorno Imp." value={importantReturns?.length || 0} icon={HeartPulse} color="amber" onClick={() => setShowImportantReturnsModal(true)} delay={200} />
        )}
      </section>

      {/* ━━━ FINANCIAL STRIP ━━━ */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loadingAnalytics ? (
          <>
            <Skeleton className="h-[68px] rounded-xl" />
            <Skeleton className="h-[68px] rounded-xl" />
            <Skeleton className="h-[68px] rounded-xl" />
            <Skeleton className="h-[68px] rounded-xl" />
          </>
        ) : (
          <>
            <FinancialCard label="Receita do Mês" value={fmtCurrency(analytics?.monthRevenue || 0)} icon={TrendingUp} trend={analytics?.prevMonthRevenue ? revTrend : undefined} positive={revTrend >= 0} />
            <FinancialCard label="Despesas do Mês" value={fmtCurrency(analytics?.monthExpenses || 0)} icon={TrendingDown} trend={analytics?.prevMonthExpenses ? expTrend : undefined} positive={expTrend <= 0} />
            <FinancialCard label="Lucro Líquido" value={fmtCurrency(analytics?.monthProfit || 0)} icon={DollarSign} positive={(analytics?.monthProfit || 0) >= 0} />
            <FinancialCard label="Pacientes" value={String(analytics?.totalPatients || 0)} icon={Users} trend={analytics?.newPatientsThisMonth ? analytics.newPatientsThisMonth : undefined} positive={true} />
          </>
        )}
      </section>

      {/* ━━━ APPOINTMENTS + ALERTS ━━━ */}
      <section className="grid gap-6 lg:grid-cols-2">
        <TimelineAppointments
          appointments={todayAppointments || []}
          isLoading={loadingAppointments}
        />
        <AlertsPanel
          alerts={recentAlerts}
          isLoading={isLoadingAlerts}
        />
      </section>

      {/* ━━━ CHARTS: Revenue + Weekly ━━━ */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueExpensesChart />
        </div>
        <div>
          <WeeklyAppointmentsChart />
        </div>
      </section>

      {/* ━━━ CHARTS: Budgets + Prosthesis ━━━ */}
      <section className="grid gap-6 lg:grid-cols-2">
        {loadingAnalytics ? (
          <>
            <Skeleton className="h-[380px] rounded-xl" />
            <Skeleton className="h-[380px] rounded-xl" />
          </>
        ) : (
          <>
            <BudgetStatusChart data={analytics?.budgetsByStatus || []} />
            <ProsthesisStatusChart data={analytics?.prosthesisByStatus || []} />
          </>
        )}
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         MODALS (same as original Dashboard)
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      <PendingBudgetsDialog
        open={showBudgetsModal}
        onClose={() => { setShowBudgetsModal(false); loadPendingBudgets(); }}
      />

      {/* Pending Returns */}
      <Dialog open={showPendingReturnsModal} onOpenChange={setShowPendingReturnsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Retornos Pendentes ({pendingReturnsList?.length || 0})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="bg-amber-50 text-amber-800 p-4 rounded-lg text-sm border border-amber-100 mb-4">
              <p className="font-semibold mb-1">Como funciona esta lista?</p>
              Ela exibe procedimentos que estão <strong>Em andamento</strong> mas não tiveram nenhuma atualização nos últimos <strong>30 dias</strong>.
            </div>
            {loadingPendingList ? (
              <Skeleton className="h-20 w-full rounded-lg" />
            ) : (pendingReturnsList || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg">Nenhum tratamento com retorno pendente</div>
            ) : (
              (pendingReturnsList || []).map(item => (
                <div key={item.procedure.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.patient?.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{item.procedure.description}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">{item.daysSinceUpdate} dias</span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <div className="flex gap-2">
                      {item.patient?.phone && (
                        <Button size="sm" variant="outline" className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100" onClick={() => {
                          const phone = item.patient.phone.replace(/\D/g, '');
                          window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${item.patient.name}, tudo bem? Estamos entrando em contato sobre seu tratamento.`)}`, '_blank');
                        }}>
                          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                          Mensagem
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setShowPendingReturnsModal(false); navigate('/agenda'); }}>
                        <Calendar className="w-3 h-3 mr-1" /> Agendar
                      </Button>
                    </div>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={async () => { await markCompleted.mutateAsync(item.procedure.id); refetchPendingReturns(); }} disabled={markCompleted.isPending}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Marcar OK
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Important Returns */}
      <Dialog open={showImportantReturnsModal} onOpenChange={setShowImportantReturnsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-amber-600" />
              Retornos Importantes ({importantReturns?.length || 0})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="bg-amber-50 text-amber-800 p-4 rounded-lg text-sm border border-amber-100 mb-4">
              <p className="font-semibold mb-1">O que é esta lista?</p>
              Pacientes sinalizados manualmente com <strong>retorno importante</strong>.
            </div>
            {(importantReturns || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg">Nenhum paciente sinalizado</div>
            ) : (
              (importantReturns || []).map(patient => {
                const rd = new Date(patient.return_alert_date + 'T00:00:00');
                const td = new Date(); td.setHours(0,0,0,0);
                const diff = Math.ceil((rd.getTime() - td.getTime()) / 86400000);
                const overdue = diff < 0;
                const isToday = diff === 0;
                return (
                  <div key={patient.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setShowImportantReturnsModal(false); navigate(`/pacientes/${patient.id}`); }}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{patient.name}</p>
                        <p className="text-sm text-gray-600 mt-1">Retorno: {rd.toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${overdue ? 'bg-red-100 text-red-700' : isToday ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {overdue ? `${Math.abs(diff)} dia${Math.abs(diff)!==1?'s':''} atrasado` : isToday ? 'Hoje' : `em ${diff} dia${diff!==1?'s':''}`}
                      </span>
                    </div>
                    {patient.phone && (
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button size="sm" variant="outline" className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100" onClick={(e) => {
                          e.stopPropagation();
                          const phone = patient.phone.replace(/\D/g, '');
                          window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${patient.name}, tudo bem? Estamos entrando em contato sobre seu retorno.`)}`, '_blank');
                        }}>
                          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                          Mensagem
                        </Button>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setShowImportantReturnsModal(false); navigate('/agenda'); }}>
                          <Calendar className="w-3 h-3 mr-1" /> Agendar
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Onboarding ── */}
      <OnboardingModal onOpenClinicSettings={(tab) => { setProfileSettingsTab(tab || 'clinic'); setShowProfileSettings(true); }} />
      <OnboardingFloatingButton />
      <ProfileSettingsModal
        open={showProfileSettings}
        onOpenChange={(open) => { setShowProfileSettings(open); if (!open) returnToOnboardingIfNeeded(); }}
        initialTab={profileSettingsTab}
      />
    </div>
  );
}
