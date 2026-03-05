import { useState, useMemo } from 'react';
import { useCrmOpportunities, useCrmFunnel } from '@/hooks/useCRM';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  FileText, UserX, CalendarClock, Clock, CalendarX, Trophy, FileX, ChevronRight, CalendarRange,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { OpportunityDetailSheet } from './components/OpportunityDetailSheet';
import type { OpportunityCard, FunnelStep, CrmMetricsPeriod } from '@/services/crmMetrics';
import { startOfMonth, endOfMonth, subMonths, startOfYear, subYears, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, typeof FileText> = {
  'file-text': FileText,
  'user-x': UserX,
  'calendar-clock': CalendarClock,
  'clock': Clock,
  'calendar-x': CalendarX,
  'trophy': Trophy,
  'file-x': FileX,
};

function OpportunityCardItem({ card, onClick }: { card: OpportunityCard; onClick: () => void }) {
  const Icon = ICON_MAP[card.icon] || FileText;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${card.color}15` }}>
            <Icon className="w-5 h-5" style={{ color: card.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: card.color }}>
                {card.count}
              </span>
              <span className="text-sm font-medium text-foreground truncate">{card.title}</span>
            </div>
            {card.value > 0 && (
              <div className="mt-1">
                <p className="text-sm font-medium text-muted-foreground">Oportunidade</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(card.value)}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Período: {card.period}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const maxCount = Math.max(...steps.map(s => s.count), 1);

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => {
        const widthPercent = Math.max(30, 100 - idx * 10);
        return (
          <div key={step.label} className="flex items-center justify-center">
            <div
              className="relative rounded-md px-4 py-3 text-center transition-all"
              style={{
                width: `${widthPercent}%`,
                backgroundColor: step.color,
                opacity: step.count === 0 ? 0.5 : 1,
              }}
            >
              <p className="text-white font-semibold text-sm">{step.label}</p>
              <p className="text-white/90 text-xs">
                {step.count} ({step.count > 0 && maxCount > 0 ? Math.round((step.count / maxCount) * 100) : 0}%)
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type PresetKey = '1m' | '3m' | '6m' | '12m' | 'ytd' | 'custom';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: '1m', label: 'Mês' },
  { key: '3m', label: '3m' },
  { key: '6m', label: '6m' },
  { key: '12m', label: '12m' },
  { key: 'ytd', label: 'Ano' },
  { key: 'custom', label: 'Personalizado' },
];

function getPresetDates(key: PresetKey): { start: Date; end: Date } {
  const now = new Date();
  switch (key) {
    case '1m': return { start: startOfMonth(now), end: endOfMonth(now) };
    case '3m': return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    case '6m': return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
    case '12m': return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
    case 'ytd': return { start: startOfYear(now), end: endOfMonth(now) };
    default: return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
  }
}

function fmtDate(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function OpportunitiesTab() {
  const [preset, setPreset] = useState<PresetKey>('1m');
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [tempStart, setTempStart] = useState<Date>(new Date());

  const dates = preset === 'custom' && customRange ? customRange : getPresetDates(preset);
  const period: CrmMetricsPeriod = useMemo(() => ({
    start: fmtDate(dates.start),
    end: fmtDate(dates.end),
  }), [dates.start.getTime(), dates.end.getTime()]);

  const { data: cards, isLoading: cardsLoading } = useCrmOpportunities(period);
  const { data: funnel, isLoading: funnelLoading } = useCrmFunnel(period);
  const [selectedCard, setSelectedCard] = useState<OpportunityCard | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleCardClick = (card: OpportunityCard) => {
    if (card.count === 0) return;
    setSelectedCard(card);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                if (p.key === 'custom') {
                  setPreset('custom');
                  setCalendarOpen(true);
                } else {
                  setPreset(p.key);
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
        {preset === 'custom' && (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <CalendarRange className="h-3.5 w-3.5" />
                {format(dates.start, "dd/MM/yy")} - {format(dates.end, "dd/MM/yy")}
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
                selected={selecting === 'start' ? dates.start : dates.end}
                onSelect={(date) => {
                  if (!date) return;
                  if (selecting === 'start') {
                    setTempStart(date);
                    setSelecting('end');
                  } else {
                    const finalStart = tempStart <= date ? tempStart : date;
                    const finalEnd = tempStart <= date ? date : tempStart;
                    setCustomRange({ start: startOfMonth(finalStart), end: endOfMonth(finalEnd) });
                    setSelecting('start');
                    setCalendarOpen(false);
                  }
                }}
                disabled={(date) => date > new Date()}
                defaultMonth={selecting === 'start' ? dates.start : dates.end}
                fromDate={subYears(new Date(), 3)}
                toDate={new Date()}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel */}
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Funil de Conversão
          </h3>
          <Card>
            <CardContent className="p-4">
              {funnelLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <FunnelChart steps={funnel || []} />
              )}
              <p className="text-[10px] text-muted-foreground text-center mt-3">{format(dates.start, "dd/MM/yy")} - {format(dates.end, "dd/MM/yy")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Cards */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Oportunidades
          </h3>
          {cardsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(cards || []).map(card => (
                <OpportunityCardItem
                  key={card.key}
                  card={card}
                  onClick={() => handleCardClick(card)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <OpportunityDetailSheet
        card={selectedCard}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        period={period}
      />
    </div>
  );
}
