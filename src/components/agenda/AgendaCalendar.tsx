import { useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import type { AgendaCalendarProps } from './types';

interface ExtendedAgendaCalendarProps extends AgendaCalendarProps {
  onDayDoubleClick?: (date: Date) => void;
}

export function AgendaCalendar({
  selectedDate,
  calendarMonth,
  datesWithAppointments,
  onDateSelect,
  onMonthChange,
  onDayDoubleClick,
}: ExtendedAgendaCalendarProps) {
  const hasAppointments = (date: Date) => {
    return datesWithAppointments.some(
      d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  // Track last click for double-click detection (persisted with useRef)
  const lastClickRef = useRef({ time: 0, date: null as Date | null });

  const handleDayClick = (date: Date | undefined) => {
    if (!date) return;

    const now = Date.now();
    const isSameDay = lastClickRef.current.date &&
      format(lastClickRef.current.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    const timeDiff = now - lastClickRef.current.time;

    // Double-click: same day clicked within 500ms
    if (isSameDay && timeDiff < 500 && onDayDoubleClick) {
      onDayDoubleClick(date);
      // Reset to prevent triple-click triggering
      lastClickRef.current = { time: 0, date: null };
    } else {
      // Single click: just select the date
      onDateSelect(date);
      lastClickRef.current = { time: now, date };
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDayClick}
        month={calendarMonth}
        onMonthChange={onMonthChange}
        locale={ptBR}
        className="w-full"
        classNames={{
          months: "flex flex-col w-full",
          month: "space-y-6 w-full",
          caption: "flex justify-center pt-2 pb-4 relative items-center",
          caption_label: "text-lg font-semibold",
          nav_button: "h-9 w-9 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-accent rounded-lg transition-colors",
          nav_button_previous: "absolute left-2",
          nav_button_next: "absolute right-2",
          table: "w-full border-collapse",
          head_row: "flex w-full justify-between mb-2",
          head_cell: "text-muted-foreground rounded-md flex-1 font-medium text-sm text-center py-2",
          row: "flex w-full justify-between mt-1",
          cell: "flex-1 text-center text-sm p-1 relative [&:has([aria-selected])]:bg-accent rounded-lg",
          day: "h-12 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-lg transition-colors flex items-center justify-center cursor-pointer",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg",
          day_today: "bg-accent text-accent-foreground font-semibold",
          day_outside: "text-muted-foreground opacity-40",
          day_disabled: "text-muted-foreground opacity-50",
        }}
        modifiers={{
          hasAppointment: (date) => hasAppointments(date),
        }}
        modifiersClassNames={{
          hasAppointment: 'relative',
        }}
        components={{
          DayContent: ({ date }) => (
            <div className="relative w-full h-full flex items-center justify-center">
              <span className="text-base">{date.getDate()}</span>
              {hasAppointments(date) && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </div>
          ),
        }}
      />
    </div>
  );
}





