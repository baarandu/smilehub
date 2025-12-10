import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import type { AgendaCalendarProps } from './types';

export function AgendaCalendar({
  selectedDate,
  calendarMonth,
  datesWithAppointments,
  onDateSelect,
  onMonthChange,
}: AgendaCalendarProps) {
  const hasAppointments = (date: Date) => {
    return datesWithAppointments.some(
      d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  return (
    <div className="bg-card rounded-xl p-4 shadow-card border border-border">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onDateSelect}
        month={calendarMonth}
        onMonthChange={onMonthChange}
        locale={ptBR}
        className="mx-auto"
        modifiers={{
          hasAppointment: (date) => hasAppointments(date),
        }}
        modifiersClassNames={{
          hasAppointment: 'relative',
        }}
        components={{
          DayContent: ({ date }) => (
            <div className="relative w-full h-full flex items-center justify-center">
              {date.getDate()}
              {hasAppointments(date) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full" />
              )}
            </div>
          ),
        }}
      />
    </div>
  );
}

