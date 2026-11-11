import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMinutes, type TimeEntry, type WeekSummary } from '@/utils/timesheet';

interface WeekTableProps {
  summary: WeekSummary;
  now: Date;
  canEdit: boolean;
  onEdit: (e: TimeEntry) => void;
  onDelete: (e: TimeEntry) => void;
  nameById: Record<string, string>;
}

function entryLabel(e: TimeEntry, now: Date): string {
  const inAt = new Date(e.clock_in);
  const start = format(inAt, 'HH:mm');
  if (!e.clock_out) return `${start} → ${isSameDay(inAt, now) ? 'agora' : 'aberto'}`;
  const outAt = new Date(e.clock_out);
  const end = format(outAt, 'HH:mm');
  return isSameDay(inAt, outAt) ? `${start} → ${end}` : `${start} → ${end} (${format(outAt, 'dd/MM')})`;
}

export function WeekTable({ summary, now, canEdit, onEdit, onDelete, nameById }: WeekTableProps) {
  return (
    <div className="rounded-lg border divide-y bg-white">
      {summary.days.map(day => (
        <div key={day.date.toISOString()} className="flex flex-col sm:flex-row sm:items-start gap-2 p-3">
          <div className="sm:w-32 shrink-0">
            <p className="font-medium capitalize">{format(day.date, 'EEEE', { locale: ptBR })}</p>
            <p className="text-xs text-muted-foreground">{format(day.date, 'dd/MM')}</p>
          </div>
          <div className="flex-1 space-y-1">
            {day.entries.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
            {day.entries.map(e => {
              const edited = e.updated_by && e.created_by && e.updated_by !== e.created_by;
              return (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <span className={!e.clock_out && !isSameDay(new Date(e.clock_in), now) ? 'text-amber-700 font-medium' : ''}>
                    {entryLabel(e, now)}
                  </span>
                  {edited && (
                    <span className="text-xs text-muted-foreground">
                      (alterado por {nameById[e.updated_by!] || 'admin'} em {format(new Date(e.updated_at), 'dd/MM HH:mm')})
                    </span>
                  )}
                  {canEdit && (
                    <span className="ml-auto flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(e)} aria-label="Editar registro">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(e)} aria-label="Apagar registro">
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </Button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="sm:w-20 text-right font-semibold tabular-nums">
            {day.minutes > 0 ? formatMinutes(day.minutes) : ''}
          </div>
        </div>
      ))}
    </div>
  );
}
