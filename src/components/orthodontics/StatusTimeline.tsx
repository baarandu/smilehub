import { Badge } from '@/components/ui/badge';
import { useCaseHistory } from '@/hooks/useOrthodontics';
import { getStatusLabel } from '@/utils/orthodontics';
import { ArrowRight, Clock } from 'lucide-react';

interface StatusTimelineProps {
  caseId: string;
}

export function StatusTimeline({ caseId }: StatusTimelineProps) {
  const { data: history, isLoading } = useCaseHistory(caseId);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  }

  if (!history || history.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>;
  }

  return (
    <div className="space-y-3">
      {history.map((entry, idx) => (
        <div key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
            {idx < history.length - 1 && (
              <div className="w-px flex-1 bg-border mt-1" />
            )}
          </div>

          <div className="flex-1 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {entry.from_status && (
                <>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {getStatusLabel(entry.from_status)}
                  </Badge>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </>
              )}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {getStatusLabel(entry.to_status)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">
                {new Date(entry.created_at).toLocaleString('pt-BR')}
              </span>
              {entry.changed_by_name && (
                <span className="text-[11px] text-muted-foreground">
                  — {entry.changed_by_name}
                </span>
              )}
            </div>

            {entry.notes && (
              <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
