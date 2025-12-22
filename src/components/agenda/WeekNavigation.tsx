import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WeekNavigationProps } from './types';

export function WeekNavigation({
  selectedDate,
  datesWithAppointments,
  onDateSelect,
  onWeekChange,
}: WeekNavigationProps) {
  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const hasAppointments = (date: Date) => {
    return datesWithAppointments.some(
      d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => onWeekChange(-7)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="font-medium text-foreground">
          {format(weekStart, "d MMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "d MMM", { locale: ptBR })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => onWeekChange(7)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const isSelected = format(day, 'yyyy-MM-dd') === dateString;
          const hasAppts = hasAppointments(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg transition-all relative",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <span className="text-xs uppercase opacity-70">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span className="text-lg font-semibold">{format(day, 'd')}</span>
              {hasAppts && (
                <span className={cn(
                  "absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full",
                  isSelected ? "bg-white" : "bg-green-500"
                )} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}





