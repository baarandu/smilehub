import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  CalendarCheck,
  CalendarX,
  Receipt,
  UserPlus,
  RefreshCw,
  Percent,
  FileCheck,
  CalendarRange,
  Share2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAnalytics, type AnalyticsPeriod } from '@/hooks/useAnalytics';
import { formatCurrency } from '@/utils/formatters';
import { useClinic } from '@/contexts/ClinicContext';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  format,
  subYears,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// --- Preset periods ---
type PresetKey = '1m' | '3m' | '6m' | '12m' | 'ytd' | 'custom';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: '1m', label: 'Este mês' },
  { key: '3m', label: '3 meses' },
  { key: '6m', label: '6 meses' },
  { key: '12m', label: '12 meses' },
  { key: 'ytd', label: 'Ano atual' },
  { key: 'custom', label: 'Personalizado' },
];

function getPresetPeriod(key: PresetKey): AnalyticsPeriod {
  const now = new Date();
  switch (key) {
    case '1m':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case '3m':
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    case '6m':
      return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    case '12m':
      return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
    case 'ytd':
      return { start: startOfYear(now), end: endOfMonth(now) };
    default:
      return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
  }
}

function formatPeriodLabel(period: AnalyticsPeriod): string {
  return `${format(period.start, "dd/MM/yy")} - ${format(period.end, "dd/MM/yy")}`;
}

// --- Shared constants ---
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// --- KPI Card ---
function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
}) {
  const isPositive = trend != null && trend >= 0;
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend != null && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            )}
            <span className={isPositive ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
              {isPositive ? '+' : ''}{trend}%
            </span>
            {trendLabel && <span className="text-muted-foreground">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Period Filter component ---
function PeriodFilter({
  preset,
  period,
  onPresetChange,
  onCustomChange,
}: {
  preset: PresetKey;
  period: AnalyticsPeriod;
  onPresetChange: (key: PresetKey) => void;
  onCustomChange: (period: AnalyticsPeriod) => void;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [tempStart, setTempStart] = useState<Date>(period.start);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Preset buttons */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              if (p.key === 'custom') {
                onPresetChange('custom');
                setCalendarOpen(true);
              } else {
                onPresetChange(p.key);
              }
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
              preset === p.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date range picker */}
      {preset === 'custom' && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <CalendarRange className="h-3.5 w-3.5" />
              {formatPeriodLabel(period)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 border-b">
              <p className="text-sm font-medium">
                {selecting === 'start' ? 'Selecione a data inicial' : 'Selecione a data final'}
              </p>
            </div>
            <Calendar
              mode="single"
              locale={ptBR}
              selected={selecting === 'start' ? period.start : period.end}
              onSelect={(date) => {
                if (!date) return;
                if (selecting === 'start') {
                  setTempStart(date);
                  setSelecting('end');
                } else {
                  const finalStart = tempStart <= date ? tempStart : date;
                  const finalEnd = tempStart <= date ? date : tempStart;
                  onCustomChange({
                    start: startOfMonth(finalStart),
                    end: endOfMonth(finalEnd),
                  });
                  setSelecting('start');
                  setCalendarOpen(false);
                }
              }}
              disabled={(date) => date > new Date()}
              defaultMonth={selecting === 'start' ? period.start : period.end}
              fromDate={subYears(new Date(), 3)}
              toDate={new Date()}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Period label for presets */}
      {preset !== 'custom' && (
        <span className="text-xs text-muted-foreground">
          {formatPeriodLabel(period)}
        </span>
      )}
    </div>
  );
}

// --- Formatters ---
const currencyFormatter = (value: number) =>
  value >= 1000 ? `R$ ${(value / 1000).toFixed(0)}k` : `R$ ${value}`;

const tooltipCurrency = (value: number) => formatCurrency(value);

// --- Main component ---
export default function Analytics() {
  const { isAdmin } = useClinic();
  const [preset, setPreset] = useState<PresetKey>('6m');
  const [customPeriod, setCustomPeriod] = useState<AnalyticsPeriod | null>(null);

  const period = useMemo(() => {
    if (preset === 'custom' && customPeriod) return customPeriod;
    return getPresetPeriod(preset);
  }, [preset, customPeriod]);

  const { data, isLoading } = useAnalytics(period);

  const handlePresetChange = (key: PresetKey) => {
    setPreset(key);
    if (key !== 'custom') setCustomPeriod(null);
  };

  const handleCustomChange = (p: AnalyticsPeriod) => {
    setCustomPeriod(p);
  };

  const periodLabel = preset === 'custom'
    ? 'Período personalizado'
    : PRESETS.find(p => p.key === preset)?.label || '';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[380px] rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const newPatientsGrowth = data.newPatientsPrevPeriod > 0
    ? Math.round(((data.newPatientsInPeriod - data.newPatientsPrevPeriod) / data.newPatientsPrevPeriod) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">Indicadores e desempenho da clínica</p>
          </div>
        </div>
      </div>

      {/* Global Period Filter */}
      <PeriodFilter
        preset={preset}
        period={period}
        onPresetChange={handlePresetChange}
        onCustomChange={handleCustomChange}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Faturamento no Período"
          value={formatCurrency(data.periodRevenue)}
          icon={DollarSign}
          trend={data.revenueGrowth}
          trendLabel="vs período anterior"
        />
        <KpiCard
          title="Média Mensal"
          value={formatCurrency(data.avgMonthlyRevenue)}
          icon={Receipt}
          subtitle={periodLabel}
        />
        <KpiCard
          title="Ticket Médio"
          value={formatCurrency(data.avgTicket)}
          icon={DollarSign}
          subtitle="Valor médio por receita"
        />
        <KpiCard
          title="Novos Pacientes"
          value={String(data.newPatientsInPeriod)}
          icon={UserPlus}
          trend={newPatientsGrowth}
          trendLabel="vs período anterior"
          subtitle={`${data.totalPatients} total`}
        />
        <KpiCard
          title="Taxa de Retorno"
          value={`${data.returnRate}%`}
          icon={RefreshCw}
          subtitle="Pacientes com >1 consulta"
        />
        <KpiCard
          title="Cancelamentos"
          value={`${data.cancellationRate}%`}
          icon={CalendarX}
          subtitle="No período"
        />
        <KpiCard
          title="Faltas"
          value={`${data.noShowRate}%`}
          icon={CalendarCheck}
          subtitle="No período"
        />
        <KpiCard
          title="Aprovação de Orçamentos"
          value={`${data.budgetApprovalRate}%`}
          icon={FileCheck}
          subtitle="Aprovados / total"
        />
      </div>

      {/* Row 1: Revenue + New Patients */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Receita vs Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={currencyFormatter} />
                  <Tooltip formatter={(v: number, name: string) => [
                    tooltipCurrency(v),
                    name === 'receita' ? 'Receita' : name === 'despesas' ? 'Despesas' : 'Lucro'
                  ]} />
                  <Legend formatter={(v) => v === 'receita' ? 'Receita' : v === 'despesas' ? 'Despesas' : 'Lucro'} />
                  <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Novos Pacientes por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.newPatientsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Novos pacientes']} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Pacientes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Appointments by day + Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Consultas por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.appointmentsByDayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend formatter={(v) => v === 'total' ? 'Total' : v === 'completed' ? 'Concluídas' : 'Canceladas'} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="total" />
                  <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="completed" />
                  <Bar dataKey="cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} name="cancelled" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Status das Consultas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.appointmentsByStatus.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Sem consultas no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.appointmentsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="status"
                      label={({ status, count }) => `${status} (${count})`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {data.appointmentsByStatus.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Consultas']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Top Procedures + Age Distribution */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Procedimentos Mais Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.topProcedures.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Sem procedimentos no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topProcedures} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={120}
                      tickFormatter={(v) => v.length > 18 ? v.slice(0, 18) + '...' : v}
                    />
                    <Tooltip formatter={(v: number, name: string) => [
                      name === 'count' ? v : tooltipCurrency(v),
                      name === 'count' ? 'Quantidade' : 'Valor total'
                    ]} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Perfil dos Pacientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.patientsByAge}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="masculino" stackId="gender" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Masculino" />
                  <Bar dataKey="feminino" stackId="gender" fill="#ec4899" radius={[0, 0, 0, 0]} name="Feminino" />
                  <Bar dataKey="naoInformado" stackId="gender" fill="#d1d5db" radius={[4, 4, 0, 0]} name="Não Informado" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Referral Sources */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              Origem dos Pacientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.patientsByReferral.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Sem dados de origem
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.patientsByReferral}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="source"
                      label={({ source, count }) => `${source} (${count})`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {data.patientsByReferral.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'Pacientes']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              Ranking de Origem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.patientsByReferral.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Sem dados de origem
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.patientsByReferral.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      dataKey="source"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={120}
                      tickFormatter={(v) => v.length > 16 ? v.slice(0, 16) + '...' : v}
                    />
                    <Tooltip formatter={(v: number) => [v, 'Pacientes']} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Pacientes" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 5: Payment Methods + Revenue by Dentist */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Formas de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {data.paymentMethods.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Sem receitas no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.paymentMethods}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="method"
                      label={({ method }) => `${method}`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {data.paymentMethods.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [tooltipCurrency(v), 'Valor']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Faturamento por Profissional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {data.revenueByDentist.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Sem dados de faturamento por profissional
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.revenueByDentist} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={currencyFormatter} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={120}
                        tickFormatter={(v) => v.length > 16 ? v.slice(0, 16) + '...' : v}
                      />
                      <Tooltip formatter={(v: number, name: string) => [
                        name === 'value' ? tooltipCurrency(v) : v,
                        name === 'value' ? 'Faturamento' : 'Atendimentos'
                      ]} />
                      <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} name="value" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Profit trend line */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução do Lucro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={currencyFormatter} />
                <Tooltip formatter={(v: number, name: string) => [
                  tooltipCurrency(v),
                  name === 'lucro' ? 'Lucro' : name === 'receita' ? 'Receita' : 'Despesas'
                ]} />
                <Legend formatter={(v) => v === 'lucro' ? 'Lucro' : v === 'receita' ? 'Receita' : 'Despesas'} />
                <Line type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="lucro" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
