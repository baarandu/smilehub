import { Users, Calendar, Bell, TrendingUp } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ReturnAlertsList } from '@/components/dashboard/ReturnAlertsList';
import { TodayAppointments } from '@/components/dashboard/TodayAppointments';
import { ProfileMenu } from '@/components/profile';
import { usePatientsCount } from '@/hooks/usePatients';
import { useTodayAppointments, useTodayAppointmentsCount } from '@/hooks/useAppointments';
import { useReturnAlerts, usePendingReturnsCount } from '@/hooks/useConsultations';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: patientsCount, isLoading: loadingPatients } = usePatientsCount();
  const { data: todayAppointments, isLoading: loadingAppointments } = useTodayAppointments();
  const { data: todayCount, isLoading: loadingTodayCount } = useTodayAppointmentsCount();
  const { data: returnAlerts, isLoading: loadingAlerts } = useReturnAlerts();
  const { data: pendingReturns, isLoading: loadingPending } = usePendingReturnsCount();

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
        <ReturnAlertsList 
          alerts={returnAlerts || []} 
          isLoading={loadingAlerts}
        />
      </div>
    </div>
  );
}
