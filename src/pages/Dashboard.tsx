import { useState, useEffect } from 'react';
import { Calendar, Bell, FileText, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentAlertsList, type RecentAlert } from '@/components/dashboard/ReturnAlertsList';
import { TodayAppointments } from '@/components/dashboard/TodayAppointments';
import { ProfileMenu } from '@/components/profile';
import { useTodayAppointments, useTodayAppointmentsCount } from '@/hooks/useAppointments';
import { useReturnAlerts, usePendingReturnsCount } from '@/hooks/useConsultations';
import { useBirthdayAlerts, useProcedureReminders } from '@/hooks/useAlerts';
import { usePendingReturnsList, useMarkProcedureCompleted } from '@/hooks/usePendingReturns';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { budgetsService } from '@/services/budgets';
import { remindersService, type Reminder } from '@/services/reminders';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { PendingBudgetsDialog } from '@/components/patients/PendingBudgetsDialog';
import { OnboardingModal, OnboardingFloatingButton } from '@/components/onboarding';
import { ProfileSettingsModal } from '@/components/profile/ProfileSettingsModal';
import { useOnboarding } from '@/contexts/OnboardingContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { returnToOnboardingIfNeeded } = useOnboarding();

  // const { data: patientsCount, isLoading: loadingPatients } = usePatientsCount(); // Removing patients stats
  const { data: todayAppointments, isLoading: loadingAppointments } = useTodayAppointments();
  const { data: todayCount, isLoading: loadingTodayCount } = useTodayAppointmentsCount();
  const { data: returnAlerts, isLoading: loadingReturns } = useReturnAlerts();
  const { data: birthdayAlerts, isLoading: loadingBirthdays } = useBirthdayAlerts();
  const { data: procedureAlerts, isLoading: loadingProcedures } = useProcedureReminders();
  const { data: pendingReturns, isLoading: loadingPending } = usePendingReturnsCount();

  // Pending Returns (Procedures) Hooks
  const { data: pendingReturnsList, isLoading: loadingPendingList, refetch: refetchPendingReturns } = usePendingReturnsList();
  const markCompleted = useMarkProcedureCompleted();
  const [showPendingReturnsModal, setShowPendingReturnsModal] = useState(false);

  // Profile Settings Modal (for onboarding)
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileSettingsFromOnboarding, setProfileSettingsFromOnboarding] = useState(false);

  // Reminders Count
  const [activeRemindersCount, setActiveRemindersCount] = useState(0);
  const [activeRemindersList, setActiveRemindersList] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);

  // Pending Budgets State
  const [pendingBudgetsCount, setPendingBudgetsCount] = useState(0);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [showBudgetsModal, setShowBudgetsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Parallel loading
    loadPendingBudgets();

    // Load Reminders
    try {
      // Dynamic import to avoid circular dependencies if any, though likely safe to import normally
      const [count, list] = await Promise.all([
        remindersService.getActiveCount(),
        remindersService.getActive()
      ]);
      setActiveRemindersCount(count);
      setActiveRemindersList(list);
    } catch (err) {
      console.error("Failed to load reminders count", err);
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    // The React Query hooks will auto-refresh on window focus, but we can manually refetch
    refetchPendingReturns();
    setIsRefreshing(false);
  };

  const loadPendingBudgets = async () => {
    try {
      setLoadingBudgets(true);
      const count = await budgetsService.getPendingPatientsCount();
      setPendingBudgetsCount(count);
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
      urgency: (a.days_until_return <= 7 ? 'urgent' : 'normal') as 'urgent' | 'normal'
    })),
    ...(activeRemindersList || []).map(r => ({
      id: `rem-${r.id}`,
      type: 'reminder' as const,
      patientName: r.title,
      patientPhone: '',
      date: r.created_at,
      subtitle: r.description || 'Lembrete',
      urgency: 'normal' as const
    }))
  ].slice(0, 6); // Top 6

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-transparent rounded-2xl p-6 mb-6 border border-red-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2.5 rounded-xl shadow-sm border border-red-50">
              <img src="/logo-login.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Painel de Controle</h1>
              <p className="text-[#a03f3d]/80 mt-1 font-medium">
                Bem-vinda de volta! Aqui está o resumo do dia.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-10 w-10 bg-white border-red-100 hover:bg-red-50 hover:text-[#a03f3d]"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <div className="bg-white rounded-xl shadow-sm border border-red-100">
              <ProfileMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingReminders ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : (
          <div onClick={() => navigate('/alertas')} className="cursor-pointer">
            <StatsCard
              title="Lembretes Ativos"
              value={activeRemindersCount}
              icon={<Bell className="w-6 h-6" />}
              variant="primary" // Keeping primary color but changing icon/title
            />
          </div>
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
          <div onClick={() => setShowPendingReturnsModal(true)} className="cursor-pointer">
            <StatsCard
              title="Retornos Pendentes"
              value={pendingReturnsList?.length || pendingReturns || 0}
              icon={<AlertTriangle className="w-6 h-6" />}
              variant="warning"
            />
          </div>
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
      <PendingBudgetsDialog
        open={showBudgetsModal}
        onClose={() => {
          setShowBudgetsModal(false);
          loadPendingBudgets();
        }}
      />

      {/* Pending Returns Modal */}
      <Dialog open={showPendingReturnsModal} onOpenChange={setShowPendingReturnsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Retornos Pendentes ({pendingReturnsList?.length || 0})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div className="bg-amber-50 text-amber-800 p-4 rounded-lg text-sm border border-amber-100 mb-4">
              <p className="font-semibold mb-1">Como funciona esta lista?</p>
              Ela exibe procedimentos que estão <strong>Em andamento</strong> mas não tiveram nenhuma atualização nos últimos <strong>30 dias</strong>.
              O objetivo é lembrar de pacientes que podem ter "sumido" antes de concluir o tratamento.
            </div>
            {loadingPendingList ? (
              <div className="py-8 text-center">
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ) : (pendingReturnsList || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-lg">
                Nenhum tratamento com retorno pendente
              </div>
            ) : (
              (pendingReturnsList || []).map(item => (
                <div
                  key={item.procedure.id}
                  className="p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.patient?.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{item.procedure.description}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      {item.daysSinceUpdate} dias
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <div className="flex gap-2">
                      {item.patient?.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                          onClick={() => {
                            const phone = item.patient.phone.replace(/\D/g, '');
                            const message = encodeURIComponent(`Olá ${item.patient.name}, tudo bem? Estamos entrando em contato sobre seu tratamento.`);
                            window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
                          }}
                        >
                          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          Mensagem
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowPendingReturnsModal(false);
                          navigate('/agenda');
                        }}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Agendar
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={async () => {
                        await markCompleted.mutateAsync(item.procedure.id);
                        refetchPendingReturns();
                      }}
                      disabled={markCompleted.isPending}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Marcar OK
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Components */}
      <OnboardingModal
        onOpenClinicSettings={() => setShowProfileSettings(true)}
      />
      <OnboardingFloatingButton />

      {/* Profile Settings Modal (triggered from onboarding) */}
      <ProfileSettingsModal
        open={showProfileSettings}
        onOpenChange={(open) => {
          setShowProfileSettings(open);
          // Return to onboarding if it was opened from there
          if (!open) {
            returnToOnboardingIfNeeded();
          }
        }}
      />
    </div>
  );
}
