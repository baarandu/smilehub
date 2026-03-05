import { useState } from 'react';
import { useCrmOpportunities, useCrmFunnel } from '@/hooks/useCRM';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, UserX, CalendarClock, Clock, CalendarX, Trophy, FileX, ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { OpportunityDetailSheet } from './components/OpportunityDetailSheet';
import type { OpportunityCard, FunnelStep } from '@/services/crmMetrics';

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

export function OpportunitiesTab() {
  const { data: cards, isLoading: cardsLoading } = useCrmOpportunities();
  const { data: funnel, isLoading: funnelLoading } = useCrmFunnel();
  const [selectedCard, setSelectedCard] = useState<OpportunityCard | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleCardClick = (card: OpportunityCard) => {
    if (card.count === 0) return;
    setSelectedCard(card);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
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
              <p className="text-[10px] text-muted-foreground text-center mt-3">Últimos 30 dias</p>
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
      />
    </div>
  );
}
