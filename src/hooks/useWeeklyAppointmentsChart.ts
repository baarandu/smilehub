import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useClinic } from '@/contexts/ClinicContext';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  isSameWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function useWeeklyAppointmentsChart() {
  const { clinicId } = useClinic();
  const [referenceDate, setReferenceDate] = useState(new Date());

  const weekStart = useMemo(
    () => startOfWeek(referenceDate, { weekStartsOn: 1 }),
    [referenceDate]
  );
  const weekEnd = useMemo(
    () => endOfWeek(referenceDate, { weekStartsOn: 1 }),
    [referenceDate]
  );

  const isCurrentWeek = isSameWeek(referenceDate, new Date(), { weekStartsOn: 1 });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['weekly-appointments-chart', clinicId, weekStart.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('date, status')
        .eq('clinic_id', clinicId!)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .neq('status', 'cancelled');

      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const chartData = useMemo(() => {
    const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const dayCounts = new Array(7).fill(0);

    for (const appt of appointments || []) {
      const apptDate = new Date(appt.date + 'T00:00:00');
      let dayIndex = apptDate.getDay() - 1;
      if (dayIndex < 0) dayIndex = 6;
      dayCounts[dayIndex]++;
    }

    return dayLabels.map((day, i) => ({ day, count: dayCounts[i] }));
  }, [appointments]);

  const periodLabel = useMemo(() => {
    const start = format(weekStart, "dd/MM", { locale: ptBR });
    const end = format(weekEnd, "dd/MM", { locale: ptBR });
    return `${start} - ${end}`;
  }, [weekStart, weekEnd]);

  const goBack = () => setReferenceDate((prev) => subWeeks(prev, 1));
  const goForward = () => setReferenceDate((prev) => addWeeks(prev, 1));

  return { chartData, isLoading, periodLabel, goBack, goForward, isCurrentWeek };
}
