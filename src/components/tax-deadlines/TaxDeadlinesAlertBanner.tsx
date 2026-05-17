import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CalendarClock, ArrowRight } from 'lucide-react';
import { useUpcomingDeadlines } from '@/hooks/useTaxDeadlines';
import { classifyUrgency } from '@/services/taxDeadlines';
import { formatDisplayDate } from '@/utils/budgetUtils';
import { Link } from 'react-router-dom';

interface Props {
  /** Where the "Ver tudo" button should link to */
  detailsPath?: string;
  /** Max items shown inline (default 3) */
  limit?: number;
}

/**
 * Compact banner that renders only when there are overdue or today's deadlines.
 * Use on Dashboard / Financial header for proactive alerts.
 */
export function TaxDeadlinesAlertBanner({ detailsPath = '/financeiro', limit = 3 }: Props) {
  const { data: occurrences = [] } = useUpcomingDeadlines(14, 7);

  const critical = useMemo(() => {
    return occurrences
      .map((o) => classifyUrgency(o))
      .filter((c) => c.urgency === 'overdue' || c.urgency === 'today')
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [occurrences]);

  if (critical.length === 0) return null;

  const visible = critical.slice(0, limit);
  const hidden = critical.length - visible.length;

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-sm text-red-700">
                {critical.length} prazo{critical.length > 1 ? 's' : ''} requer{critical.length > 1 ? 'em' : ''} sua atenção
              </h3>
            </div>
            <ul className="space-y-1">
              {visible.map((c) => (
                <li key={`${c.occurrence.deadline_id}-${c.occurrence.occurrence_date}`} className="flex items-center gap-2 text-xs text-slate-700">
                  <CalendarClock className="w-3 h-3 text-red-500" />
                  <span className="font-medium">{c.occurrence.deadline_name}</span>
                  <span className="text-slate-500">· {formatDisplayDate(c.occurrence.occurrence_date)}</span>
                  <Badge
                    className={`text-[9px] h-4 px-1.5 ${
                      c.urgency === 'overdue'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {c.urgency === 'overdue'
                      ? `${Math.abs(c.daysUntilDue)}d em atraso`
                      : 'Hoje'}
                  </Badge>
                </li>
              ))}
              {hidden > 0 && (
                <li className="text-xs text-slate-500 italic">e mais {hidden}...</li>
              )}
            </ul>
            <Button asChild variant="link" size="sm" className="h-6 p-0 mt-1 text-red-600 hover:text-red-700">
              <Link to={detailsPath} state={{ tab: 'deadlines' }}>
                Ver calendário fiscal
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
