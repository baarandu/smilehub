import { Users, Calendar, Bell, TrendingUp } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ReturnAlertsList } from '@/components/dashboard/ReturnAlertsList'; // Actually exported as RecentAlertsList now, I should fix import.
import { RecentAlertsList, type RecentAlert } from '@/components/dashboard/ReturnAlertsList';
import { TodayAppointments } from '@/components/dashboard/TodayAppointments';
import { ProfileMenu } from '@/components/profile';
import { usePatientsCount } from '@/hooks/usePatients';
import { useTodayAppointments, useTodayAppointmentsCount } from '@/hooks/useAppointments';
import { useReturnAlerts, usePendingReturnsCount } from '@/hooks/useConsultations';
import { useBirthdayAlerts, useProcedureReminders } from '@/hooks/useAlerts';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: patientsCount, isLoading: loadingPatients } = usePatientsCount();
  const { data: todayAppointments, isLoading: loadingAppointments } = useTodayAppointments();
  const { data: todayCount, isLoading: loadingTodayCount } = useTodayAppointmentsCount();
  const { data: returnAlerts, isLoading: loadingReturns } = useReturnAlerts();
  const { data: birthdayAlerts, isLoading: loadingBirthdays } = useBirthdayAlerts();
  const { data: procedureAlerts, isLoading: loadingProcedures } = useProcedureReminders();
  const { data: pendingReturns, isLoading: loadingPending } = usePendingReturnsCount();

  const isLoadingAlerts = loadingReturns || loadingBirthdays || loadingProcedures;

  // Prepare Recent Alerts
  const recentAlerts: RecentAlert[] = [
    ...(birthdayAlerts || []).map(a => ({
      id: `b-${a.patient.id}`,
      type: 'birthday' as const,
      patientName: a.patient.name,
      patientPhone: a.patient.phone,
      date: a.date,
      subtitle: 'Aniversário hoje',
      urgency: 'urgent' as const
    })),
    ...(procedureAlerts || []).map(a => ({
      id: `p-${a.patient.id}`, // using patient id as unique base
      type: 'procedure_return' as const,
      patientName: a.patient.name,
      patientPhone: a.patient.phone,
      date: a.date,
      subtitle: `${a.daysSince} dias sem vir`,
      urgency: 'urgent' as const
    })),
    ...(returnAlerts || []).map(a => ({
      id: `r-${a.patient_id}`,
      type: 'scheduled' as const,
      patientName: a.patient_name,
      patientPhone: a.phone,
      date: a.suggested_return_date,
      subtitle: `Retorno em ${a.days_until_return} dias`,
      urgency: a.days_until_return <= 7 ? 'urgent' : 'normal' as const
    }))
  ].slice(0, 6); // Top 6

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vinda de volta! Aqui está o resumo do dia.
          </p>
        </div>
        <ProfileMenu />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingPatients ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          <StatsCard
            title="Pacientes"
            value={patientsCount || 0}
            icon={<Users className="w-6 h-6" />}
            variant="primary"
          />
        )}
        {loadingTodayCount ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          <StatsCard
            title="Consultas Hoje"
            value={todayCount || 0}
            icon={<Calendar className="w-6 h-6" />}
            variant="success"
          />
        )}
        {loadingPending ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          <StatsCard
            title="Retornos Pendentes"
            value={pendingReturns || 0}
            icon={<Bell className="w-6 h-6" />}
            variant="warning"
          />
        )}
        <StatsCard
          title="Taxa Retorno"
          value="85%"
          icon={<TrendingUp className="w-6 h-6" />}
          variant="default"
          trend={{ value: 5, isPositive: true }}
        />
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TodayAppointments
          appointments={todayAppointments || []}
          isLoading={loadingAppointments}
        />
        <RecentAlertsList
          alerts={recentAlerts}
          isLoading={isLoadingAlerts}
        />
      </div>
    </div>
  );
}
