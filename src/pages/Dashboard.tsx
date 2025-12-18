import { useState, useEffect } from 'react';
import { Users, Calendar, Bell, FileText } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentAlertsList, type RecentAlert } from '@/components/dashboard/ReturnAlertsList';
import { TodayAppointments } from '@/components/dashboard/TodayAppointments';
import { ProfileMenu } from '@/components/profile';
import { usePatientsCount } from '@/hooks/usePatients';
import { useTodayAppointments, useTodayAppointmentsCount } from '@/hooks/useAppointments';
import { useReturnAlerts, usePendingReturnsCount } from '@/hooks/useConsultations';
import { useBirthdayAlerts, useProcedureReminders } from '@/hooks/useAlerts';
import { Skeleton } from '@/components/ui/skeleton';
import { budgetsService } from '@/services/budgets';
import type { BudgetWithItems } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

// Helper functions
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR');
};

type PendingBudget = BudgetWithItems & { patient_name: string };

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: patientsCount, isLoading: loadingPatients } = usePatientsCount();
  const { data: todayAppointments, isLoading: loadingAppointments } = useTodayAppointments();
  const { data: todayCount, isLoading: loadingTodayCount } = useTodayAppointmentsCount();
  const { data: returnAlerts, isLoading: loadingReturns } = useReturnAlerts();
  const { data: birthdayAlerts, isLoading: loadingBirthdays } = useBirthdayAlerts();
  const { data: procedureAlerts, isLoading: loadingProcedures } = useProcedureReminders();
  const { data: pendingReturns, isLoading: loadingPending } = usePendingReturnsCount();

  // Pending Budgets State
  const [pendingBudgetsCount, setPendingBudgetsCount] = useState(0);
  const [pendingBudgets, setPendingBudgets] = useState<PendingBudget[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [showBudgetsModal, setShowBudgetsModal] = useState(false);

  useEffect(() => {
    loadPendingBudgets();
  }, []);

  const loadPendingBudgets = async () => {
    try {
      setLoadingBudgets(true);
      const [count, budgets] = await Promise.all([
        budgetsService.getPendingCount(),
        budgetsService.getAllPending()
      ]);
      setPendingBudgetsCount(count);
      setPendingBudgets(budgets);
    } catch (error) {
      console.error('Error loading pending budgets:', error);
    } finally {
      setLoadingBudgets(false);
    }
  };

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
        {loadingBudgets ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          <div onClick={() => setShowBudgetsModal(true)} className="cursor-pointer">
            <StatsCard
              title="Orçamentos Pendentes"
              value={pendingBudgetsCount}
              icon={<FileText className="w-6 h-6" />}
              variant="default"
            />
          </div>
        )}
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

      {/* Pending Budgets Modal */}
      <Dialog open={showBudgetsModal} onOpenChange={setShowBudgetsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Orçamentos Pendentes ({pendingBudgetsCount})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {pendingBudgets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg">
                Nenhum orçamento pendente
              </div>
            ) : (
              pendingBudgets.map(budget => (
                <div
                  key={budget.id}
                  onClick={() => {
                    setShowBudgetsModal(false);
                    navigate(`/pacientes/${budget.patient_id}`);
                  }}
                  className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{budget.patient_name}</p>
                      <p className="text-sm text-gray-500">{budget.treatment}</p>
                    </div>
                    <span className="text-lg font-bold text-teal-600">
                      {formatCurrency(budget.value)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">
                      Criado em {formatDate(budget.created_at)}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      Pendente
                    </span>
                  </div>
                  {budget.budget_items && budget.budget_items.length > 0 && (
                    <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                      {budget.budget_items.length} procedimento(s) incluído(s)
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
