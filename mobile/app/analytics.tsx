import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  UserPlus,
  RefreshCw,
  CalendarX,
  CalendarCheck,
  FileCheck,
  Receipt,
  BarChart3,
  Users,
} from 'lucide-react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useClinic } from '../src/contexts/ClinicContext';
import { analyticsService, type AnalyticsData, type AnalyticsPeriod } from '../src/services/analytics';

// --- Period presets ---
type PresetKey = '1m' | '3m' | '6m' | '12m';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: '1m', label: 'Este mês' },
  { key: '3m', label: '3 meses' },
  { key: '6m', label: '6 meses' },
  { key: '12m', label: '12 meses' },
];

function getPresetPeriod(key: PresetKey): AnalyticsPeriod {
  const now = new Date();
  const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  switch (key) {
    case '1m':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfCurrentMonth };
    case '3m':
      return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: endOfCurrentMonth };
    case '6m':
      return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end: endOfCurrentMonth };
    case '12m':
      return { start: new Date(now.getFullYear(), now.getMonth() - 11, 1), end: endOfCurrentMonth };
  }
}

function formatCurrency(value: number): string {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyShort(value: number): string {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
  return `R$ ${value.toFixed(0)}`;
}

function formatPeriodLabel(period: AnalyticsPeriod): string {
  const fmt = (d: Date) =>
    String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getFullYear()).slice(2);
  return `${fmt(period.start)} - ${fmt(period.end)}`;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = 32;
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING * 2 - 32; // account for card padding

// --- Simple Bar Chart component using react-native-svg ---
function SimpleBarChart({
  data,
  labelKey,
  valueKey,
  color = '#3b82f6',
  height = 180,
  formatValue,
}: {
  data: any[];
  labelKey: string;
  valueKey: string;
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) return <Text className="text-gray-400 text-center py-8">Sem dados</Text>;

  const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const barWidth = Math.max(Math.min(CHART_WIDTH / data.length - 4, 40), 12);
  const chartAreaHeight = height - 40;
  const totalBarsWidth = data.length * (barWidth + 4);
  const offsetX = Math.max((CHART_WIDTH - totalBarsWidth) / 2, 0);

  return (
    <Svg width={CHART_WIDTH} height={height}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <Line
          key={i}
          x1={0}
          y1={chartAreaHeight * (1 - pct)}
          x2={CHART_WIDTH}
          y2={chartAreaHeight * (1 - pct)}
          stroke="#e5e7eb"
          strokeWidth={0.5}
        />
      ))}
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const barHeight = (val / maxVal) * chartAreaHeight;
        const x = offsetX + i * (barWidth + 4);
        const y = chartAreaHeight - barHeight;
        return (
          <React.Fragment key={i}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 1)}
              rx={3}
              fill={color}
            />
            <SvgText
              x={x + barWidth / 2}
              y={height - 4}
              fontSize={9}
              fill="#6b7280"
              textAnchor="middle"
            >
              {d[labelKey]}
            </SvgText>
            {val > 0 && (
              <SvgText
                x={x + barWidth / 2}
                y={y - 4}
                fontSize={8}
                fill="#374151"
                textAnchor="middle"
              >
                {formatValue ? formatValue(val) : val}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

import React from 'react';

// Grouped bar chart for revenue vs expenses
function GroupedBarChart({
  data,
  height = 200,
}: {
  data: { month: string; receita: number; despesas: number }[];
  height?: number;
}) {
  if (data.length === 0) return <Text className="text-gray-400 text-center py-8">Sem dados</Text>;

  const maxVal = Math.max(...data.flatMap(d => [d.receita, d.despesas]), 1);
  const groupWidth = Math.min(CHART_WIDTH / data.length, 60);
  const barWidth = Math.max((groupWidth - 8) / 2, 8);
  const chartAreaHeight = height - 44;
  const totalWidth = data.length * groupWidth;
  const offsetX = Math.max((CHART_WIDTH - totalWidth) / 2, 0);

  return (
    <View>
      <Svg width={CHART_WIDTH} height={height}>
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <Line
            key={i}
            x1={0}
            y1={chartAreaHeight * (1 - pct)}
            x2={CHART_WIDTH}
            y2={chartAreaHeight * (1 - pct)}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}
        {data.map((d, i) => {
          const x = offsetX + i * groupWidth;
          const recHeight = (d.receita / maxVal) * chartAreaHeight;
          const despHeight = (d.despesas / maxVal) * chartAreaHeight;
          return (
            <React.Fragment key={i}>
              <Rect
                x={x + 2}
                y={chartAreaHeight - recHeight}
                width={barWidth}
                height={Math.max(recHeight, 1)}
                rx={2}
                fill="#10b981"
              />
              <Rect
                x={x + barWidth + 4}
                y={chartAreaHeight - despHeight}
                width={barWidth}
                height={Math.max(despHeight, 1)}
                rx={2}
                fill="#ef4444"
              />
              <SvgText
                x={x + groupWidth / 2}
                y={height - 4}
                fontSize={9}
                fill="#6b7280"
                textAnchor="middle"
              >
                {d.month}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <View className="flex-row items-center justify-center gap-4 mt-2">
        <View className="flex-row items-center gap-1">
          <View className="w-3 h-3 rounded-sm bg-emerald-500" />
          <Text className="text-xs text-gray-500">Receita</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="w-3 h-3 rounded-sm bg-red-500" />
          <Text className="text-xs text-gray-500">Despesas</Text>
        </View>
      </View>
    </View>
  );
}

// Horizontal bar chart for procedures / dentists
function HorizontalBarChart({
  data,
  nameKey,
  valueKey,
  color = '#8b5cf6',
  formatValue,
}: {
  data: any[];
  nameKey: string;
  valueKey: string;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) return <Text className="text-gray-400 text-center py-8">Sem dados</Text>;

  const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1);

  return (
    <View className="gap-2">
      {data.map((d, i) => {
        const val = d[valueKey] || 0;
        const pct = (val / maxVal) * 100;
        const label = d[nameKey] || '';
        const displayName = label.length > 20 ? label.slice(0, 20) + '...' : label;
        return (
          <View key={i}>
            <View className="flex-row justify-between mb-1">
              <Text className="text-xs text-gray-700 flex-1" numberOfLines={1}>{displayName}</Text>
              <Text className="text-xs text-gray-500 ml-2">
                {formatValue ? formatValue(val) : val}
              </Text>
            </View>
            <View className="h-5 bg-gray-100 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// --- KPI Card ---
function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = '#b94a48',
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  trend?: number;
}) {
  const isPositive = trend != null && trend >= 0;
  return (
    <View className="w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="bg-[#fef2f2] p-1.5 rounded-lg">
          <Icon size={18} color={iconColor} />
        </View>
      </View>
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500 mt-0.5">{title}</Text>
      {subtitle && <Text className="text-[10px] text-gray-400">{subtitle}</Text>}
      {trend != null && (
        <View className="flex-row items-center gap-1 mt-1">
          {isPositive ? (
            <TrendingUp size={12} color="#059669" />
          ) : (
            <TrendingDown size={12} color="#dc2626" />
          )}
          <Text className={`text-[10px] font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{trend}% vs anterior
          </Text>
        </View>
      )}
    </View>
  );
}

// --- Section Card ---
function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
      <View className="flex-row items-center gap-2 mb-4">
        <Icon size={18} color="#b94a48" />
        <Text className="text-base font-bold text-gray-900">{title}</Text>
      </View>
      {children}
    </View>
  );
}

// --- Main page ---
export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clinicId, isAdmin } = useClinic();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preset, setPreset] = useState<PresetKey>('6m');
  const [data, setData] = useState<AnalyticsData | null>(null);

  const period = useMemo(() => getPresetPeriod(preset), [preset]);

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      const result = await analyticsService.fetch(clinicId, period);
      setData(result);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [clinicId, period]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const newPatientsGrowth = data && data.newPatientsPrevPeriod > 0
    ? Math.round(((data.newPatientsInPeriod - data.newPatientsPrevPeriod) / data.newPatientsPrevPeriod) * 100)
    : 0;

  if (loading && !data) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#b94a48" />
        <Text className="text-gray-500 mt-4">Carregando analytics...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }}
            colors={['#b94a48']}
            tintColor="#b94a48"
          />
        }
      >
        {/* Header */}
        <View
          style={{ paddingTop: insets.top + 12, paddingBottom: 20 }}
          className="bg-[#a03f3d] px-6 rounded-b-[32px] mb-4 shadow-md"
        >
          <View className="flex-row items-center gap-3 mb-3">
            <TouchableOpacity
              className="w-9 h-9 bg-white/20 rounded-full items-center justify-center"
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-white">Analytics</Text>
              <Text className="text-[#fef2f2] text-xs opacity-90">Indicadores da clínica</Text>
            </View>
          </View>

          {/* Period filter pills */}
          <View className="flex-row gap-2 mt-1">
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.key}
                onPress={() => setPreset(p.key)}
                className={`px-3 py-1.5 rounded-full ${
                  preset === p.key
                    ? 'bg-white'
                    : 'bg-white/20'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    preset === p.key ? 'text-[#a03f3d]' : 'text-white'
                  }`}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-white/70 text-[10px] mt-2">{formatPeriodLabel(period)}</Text>
        </View>

        {data && (
          <View className="px-4 pb-8">
            {/* KPI Grid */}
            <View className="flex-row flex-wrap justify-between">
              <KpiCard
                title="Faturamento"
                value={formatCurrency(data.periodRevenue)}
                icon={DollarSign}
                trend={data.revenueGrowth}
              />
              <KpiCard
                title="Média Mensal"
                value={formatCurrency(data.avgMonthlyRevenue)}
                icon={Receipt}
                subtitle={PRESETS.find(p => p.key === preset)?.label}
              />
              <KpiCard
                title="Ticket Médio"
                value={formatCurrency(data.avgTicket)}
                icon={DollarSign}
                subtitle="Por receita"
              />
              <KpiCard
                title="Novos Pacientes"
                value={String(data.newPatientsInPeriod)}
                icon={UserPlus}
                trend={newPatientsGrowth}
                subtitle={`${data.totalPatients} total`}
              />
              <KpiCard
                title="Taxa de Retorno"
                value={`${data.returnRate}%`}
                icon={RefreshCw}
                subtitle=">1 consulta no período"
              />
              <KpiCard
                title="Cancelamentos"
                value={`${data.cancellationRate}%`}
                icon={CalendarX}
                iconColor="#ef4444"
              />
              <KpiCard
                title="Faltas"
                value={`${data.noShowRate}%`}
                icon={CalendarCheck}
                iconColor="#f59e0b"
              />
              <KpiCard
                title="Aprov. Orçamentos"
                value={`${data.budgetApprovalRate}%`}
                icon={FileCheck}
                subtitle="Aprovados / total"
              />
            </View>

            {/* Revenue vs Expenses chart */}
            <SectionCard title="Receita vs Despesas" icon={DollarSign}>
              <GroupedBarChart data={data.revenueByMonth} />
            </SectionCard>

            {/* New patients chart */}
            <SectionCard title="Novos Pacientes por Mês" icon={UserPlus}>
              <SimpleBarChart
                data={data.newPatientsByMonth}
                labelKey="month"
                valueKey="count"
                color="#3b82f6"
              />
            </SectionCard>

            {/* Top procedures */}
            <SectionCard title="Procedimentos Mais Realizados" icon={BarChart3}>
              <HorizontalBarChart
                data={data.topProcedures}
                nameKey="name"
                valueKey="count"
                color="#8b5cf6"
              />
            </SectionCard>

            {/* Appointment status breakdown */}
            <SectionCard title="Status das Consultas" icon={CalendarCheck}>
              {data.appointmentsByStatus.length === 0 ? (
                <Text className="text-gray-400 text-center py-4">Sem consultas no período</Text>
              ) : (
                <View className="gap-2">
                  {data.appointmentsByStatus.map((item, i) => {
                    const total = data.appointmentsByStatus.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? (item.count / total) * 100 : 0;
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                    return (
                      <View key={i} className="flex-row items-center gap-3">
                        <View className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                        <Text className="text-sm text-gray-700 flex-1">{item.status}</Text>
                        <Text className="text-sm font-medium text-gray-900">{item.count}</Text>
                        <Text className="text-xs text-gray-400 w-10 text-right">{pct.toFixed(0)}%</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </SectionCard>

            {/* Age distribution */}
            <SectionCard title="Faixa Etária" icon={Users}>
              <SimpleBarChart
                data={data.patientsByAge}
                labelKey="range"
                valueKey="count"
                color="#06b6d4"
              />
            </SectionCard>

            {/* Payment methods */}
            <SectionCard title="Formas de Pagamento" icon={Receipt}>
              <HorizontalBarChart
                data={data.paymentMethods}
                nameKey="method"
                valueKey="value"
                color="#f59e0b"
                formatValue={formatCurrencyShort}
              />
            </SectionCard>

            {/* Revenue by dentist (admin only) */}
            {isAdmin && data.revenueByDentist.length > 0 && (
              <SectionCard title="Faturamento por Profissional" icon={DollarSign}>
                <HorizontalBarChart
                  data={data.revenueByDentist}
                  nameKey="name"
                  valueKey="value"
                  color="#10b981"
                  formatValue={formatCurrencyShort}
                />
              </SectionCard>
            )}

            <View className="h-6" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
