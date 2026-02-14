import { useState, useEffect, useMemo } from 'react';
import { Bell, MessageCircle, Clock, CheckCircle, Gift, Settings, Plus, Trash2, Edit2, Search, X, Calendar, Filter, MessageSquare, CalendarClock } from 'lucide-react';
import { useClinic } from '@/contexts/ClinicContext';
import { subscriptionService } from '@/services/subscription';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useReturnAlerts } from '@/hooks/useConsultations';
import { useAppointmentsByDate, useUpdateAppointmentStatus } from '@/hooks/useAppointments';
import { useBirthdayAlerts, useProcedureReminders, useDismissAlert, useProsthesisSchedulingAlerts } from '@/hooks/useAlerts';
import { PROSTHESIS_TYPE_LABELS } from '@/types/prosthesis';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { useReminders, useTemplates, useWhatsAppMessaging, AlertAccordion } from './alerts/index';

// Beta testers emails loaded from environment variable
const AI_SECRETARY_ALLOWED_EMAILS = (import.meta.env.VITE_AI_SECRETARY_BETA_EMAILS || '')
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

// Plan slugs that have access to AI Secretary
const AI_SECRETARY_ALLOWED_PLANS = ['enterprise'];

export default function Alerts() {
  const navigate = useNavigate();
  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Data hooks
  const { data: returnAlerts, isLoading: loadingReturns } = useReturnAlerts();
  const { data: birthdayAlerts, isLoading: loadingBirthdays } = useBirthdayAlerts();
  const { data: procedureAlerts, isLoading: loadingProcedures } = useProcedureReminders();
  const { data: prosthesisAlerts, isLoading: loadingProsthesis } = useProsthesisSchedulingAlerts();
  const dismissAlert = useDismissAlert();
  const { data: tomorrowAppointments, isLoading: loadingTomorrow } = useAppointmentsByDate(tomorrowStr);
  const updateAppointmentStatus = useUpdateAppointmentStatus();

  // Custom hooks
  const reminders = useReminders();
  const templates = useTemplates();
  const whatsapp = useWhatsAppMessaging({
    getTemplateByType: templates.getTemplateByType,
    dismissAlert,
  });

  // Accordion State (persisted)
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('alertAccordionState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { birthdays: true, procedures: true, confirmations: true };
      }
    }
    return { birthdays: true, procedures: true, confirmations: true };
  });

  // AI Secretary Access Control
  const { clinicId } = useClinic();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [planSlug, setPlanSlug] = useState<string | null>(null);

  const hasEnterprisePlan = planSlug && AI_SECRETARY_ALLOWED_PLANS.includes(planSlug.toLowerCase());
  const isInBetaList = userEmail && AI_SECRETARY_ALLOWED_EMAILS.includes(userEmail.toLowerCase());
  const hasAISecretaryAccess = hasEnterprisePlan || isInBetaList || isSuperAdmin;

  // Persist accordion state
  useEffect(() => {
    localStorage.setItem('alertAccordionState', JSON.stringify(openAccordions));
  }, [openAccordions]);

  // Load reminders on mount
  useEffect(() => {
    reminders.loadReminders();
  }, []);

  // Fetch subscription plan when clinicId is available
  useEffect(() => {
    if (clinicId) {
      subscriptionService.getCurrentSubscription(clinicId).then(({ plan }) => {
        setPlanSlug(plan?.slug || null);
      }).catch(console.error);
    }
  }, [clinicId]);

  // Check if user is super admin and get email
  useEffect(() => {
    const checkUserAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', user.id)
          .single();
        setIsSuperAdmin((profile as any)?.is_super_admin || false);
      }
    };
    checkUserAccess();
  }, []);

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDismissAlert = (
    type: 'birthday' | 'procedure_return',
    patientId: string,
    alertDate: string
  ) => {
    dismissAlert.mutate({
      alertType: type,
      patientId,
      alertDate,
      action: 'dismissed'
    });
    toast.success('Alerta dispensado');
  };

  // KPI calculations
  const pendingCount = useMemo(() => {
    const birthdayCount = birthdayAlerts?.length || 0;
    const procedureCount = procedureAlerts?.length || 0;
    const tomorrowCount = tomorrowAppointments?.filter(a => a.status !== 'confirmed').length || 0;
    return birthdayCount + procedureCount + tomorrowCount;
  }, [birthdayAlerts, procedureAlerts, tomorrowAppointments]);

  const completedTodayCount = useMemo(() => {
    return tomorrowAppointments?.filter(a => a.status === 'confirmed').length || 0;
  }, [tomorrowAppointments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Alertas e lembretes</h1>
          <p className="text-muted-foreground mt-1">
            Uma visão clara do que exige atenção hoje — com filtros, busca e status.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Settings Dialog */}
          <Dialog open={templates.showSettings} onOpenChange={templates.setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                Configurar mensagens
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Modelos de Mensagem</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4 max-h-[500px] overflow-y-auto pr-2">
                {/* Custom Templates */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="text-base font-semibold">Mensagens Personalizadas</Label>
                      <p className="text-xs text-muted-foreground">Crie seus próprios modelos de mensagem</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-2 h-8 border-red-200 text-[#8b3634] hover:bg-red-50" onClick={templates.handleAddCustomTemplate}>
                      <Plus className="w-4 h-4" /> Novo Modelo
                    </Button>
                  </div>

                  {templates.customTemplates.length === 0 ? (
                    <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">Nenhuma mensagem personalizada.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {templates.customTemplates.map((template) => (
                        <div key={template.id} className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50 transition-colors hover:border-red-200/50">
                          <div className="flex justify-between items-center gap-2">
                            <Input
                              placeholder="Título (ex: Pós-operatório)"
                              value={template.title}
                              onChange={(e) => templates.handleUpdateCustomTemplate(template.id, { title: e.target.value })}
                              className="h-9 text-sm font-semibold bg-background"
                            />
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-[#a03f3d] hover:text-[#8b3634] hover:bg-red-50"
                                onClick={() => whatsapp.initiateSendMessage(template.message, () => templates.setShowSettings(false))}
                                title="Enviar para um paciente"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50"
                                onClick={() => templates.handleDeleteCustomTemplate(template.id)}
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            value={template.message}
                            onChange={(e) => templates.handleUpdateCustomTemplate(template.id, { message: e.target.value })}
                            rows={3}
                            className="bg-background text-sm resize-none"
                            placeholder="Sua mensagem aqui... Use {name} para o nome do paciente."
                          />
                          <p className="text-[10px] text-muted-foreground font-medium">Variável disponível: {'{name}'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-border" />

                {/* Standard Templates */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mensagem de Aniversário</Label>
                    <Textarea
                      value={templates.birthdayTemplate}
                      onChange={(e) => templates.setBirthdayTemplate(e.target.value)}
                      rows={3}
                      placeholder="Use {name} para o nome do paciente"
                    />
                    <p className="text-xs text-muted-foreground">Use {'{name}'} para substituir pelo nome do paciente.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Mensagem de Retorno (6 meses)</Label>
                      <Button size="sm" variant="ghost" className="h-6 text-[#a03f3d]" onClick={() => whatsapp.initiateSendMessage(templates.returnTemplate, () => templates.setShowSettings(false))}>
                        <MessageCircle className="w-4 h-4 mr-1" /> Enviar
                      </Button>
                    </div>
                    <Textarea
                      value={templates.returnTemplate}
                      onChange={(e) => templates.setReturnTemplate(e.target.value)}
                      rows={3}
                      placeholder="Use {name} para o nome do paciente"
                    />
                    <p className="text-xs text-muted-foreground">Use {'{name}'} para substituir pelo nome do paciente.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Mensagem de Confirmação de Consulta</Label>
                      <Button size="sm" variant="ghost" className="h-6 text-[#a03f3d]" onClick={() => whatsapp.initiateSendMessage(templates.confirmationTemplate, () => templates.setShowSettings(false))}>
                        <MessageCircle className="w-4 h-4 mr-1" /> Enviar
                      </Button>
                    </div>
                    <Textarea
                      value={templates.confirmationTemplate}
                      onChange={(e) => templates.setConfirmationTemplate(e.target.value)}
                      rows={3}
                      placeholder="Use {name} para o nome do paciente"
                    />
                    <p className="text-xs text-muted-foreground">Usada para confirmar consultas de amanhã. Use {'{name}'} para o nome.</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={templates.saveTemplates}>Salvar Alterações</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reminder Dialog */}
          <Dialog open={reminders.showReminderDialog} onOpenChange={(open) => {
            if (open) {
              reminders.setShowReminderDialog(true);
            } else {
              reminders.closeDialog();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#a03f3d] hover:bg-[#8b3634] gap-2">
                <Plus className="w-4 h-4" />
                Novo lembrete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{reminders.editingReminder ? 'Editar Lembrete' : 'Novo Lembrete'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="Ex: Enviar exame para laboratório"
                    value={reminders.reminderForm.title}
                    onChange={e => reminders.setReminderForm({ ...reminders.reminderForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (Opcional)</Label>
                  <Textarea
                    placeholder="Detalhes adicionais..."
                    value={reminders.reminderForm.description}
                    onChange={e => reminders.setReminderForm({ ...reminders.reminderForm, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data (Opcional)</Label>
                  <Input
                    type="date"
                    value={reminders.reminderForm.due_date}
                    onChange={e => reminders.setReminderForm({ ...reminders.reminderForm, due_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Defina uma data para o lembrete aparecer</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={reminders.handleCreateReminder}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <TooltipProvider>
        <div className={cn(
          "grid grid-cols-1 gap-4",
          hasAISecretaryAccess ? "md:grid-cols-3" : "md:grid-cols-2"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm cursor-help">
                <div className="w-12 h-12 rounded-full bg-[#fdf2f2] flex items-center justify-center">
                  <Bell className="w-5 h-5 text-[#a03f3d]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendências</p>
                  <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[250px] text-center">
              <p>Soma de aniversariantes do dia, pacientes sem procedimento há 6 meses e consultas de amanhã não confirmadas</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm cursor-help">
                <div className="w-12 h-12 rounded-full bg-[#fdf2f2] flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-[#a03f3d]" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Concluídos hoje</p>
                  <p className="text-2xl font-bold text-foreground">{completedTodayCount}</p>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[250px] text-center">
              <p>Consultas de amanhã que já foram confirmadas</p>
            </TooltipContent>
          </Tooltip>

          {hasAISecretaryAccess && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm cursor-help">
                  <div className="w-12 h-12 rounded-full bg-[#fdf2f2] flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-[#a03f3d]" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mensagens</p>
                    <p className="text-2xl font-bold text-foreground">{whatsapp.whatsappConnected ? 'Ativas' : 'Offline'}</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px] text-center">
                <p>Status da conexão com WhatsApp (Evolution API) para envio automático de mensagens</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Meus Lembretes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Meus lembretes</h2>
              <p className="text-sm text-muted-foreground">Pessoais e internos — ligue/desligue em um clique.</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuCheckboxItem
                  checked={reminders.reminderFilter === 'all'}
                  onCheckedChange={() => reminders.setReminderFilter('all')}
                >
                  Todos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={reminders.reminderFilter === 'active'}
                  onCheckedChange={() => reminders.setReminderFilter('active')}
                >
                  Apenas ativos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={reminders.reminderFilter === 'paused'}
                  onCheckedChange={() => reminders.setReminderFilter('paused')}
                >
                  Apenas pausados
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lembretes (nome, assunto, data...)"
              value={reminders.reminderSearch}
              onChange={(e) => reminders.setReminderSearch(e.target.value)}
              className="pl-9 pr-12 bg-white"
            />
            {reminders.reminderSearch && (
              <button
                onClick={() => reminders.setReminderSearch('')}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {reminders.filteredReminders.length}
            </span>
          </div>

          {/* Reminders List */}
          <div className="space-y-3">
            {reminders.loadingReminders ? (
              <>
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </>
            ) : reminders.filteredReminders.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-200">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {reminders.reminders.length === 0 ? 'Você não possui lembretes cadastrados.' : 'Nenhum lembrete encontrado.'}
                </p>
                {reminders.reminders.length === 0 && (
                  <Button variant="link" className="text-[#a03f3d]" onClick={() => reminders.setShowReminderDialog(true)}>
                    Criar o primeiro
                  </Button>
                )}
              </div>
            ) : (
              reminders.filteredReminders.map(reminder => (
                <div
                  key={reminder.id}
                  className={cn(
                    "group relative p-4 rounded-xl border bg-white transition-all duration-200",
                    reminder.is_active
                      ? "border-red-100 shadow-sm hover:shadow-md hover:border-red-200"
                      : "border-gray-200 opacity-75"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      reminder.is_active ? "bg-red-50" : "bg-gray-100"
                    )}>
                      <Bell className={cn(
                        "w-5 h-5",
                        reminder.is_active ? "text-[#a03f3d]" : "text-gray-400"
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          "font-medium truncate",
                          reminder.is_active ? "text-foreground" : "text-muted-foreground line-through"
                        )}>
                          {reminder.title}
                        </h3>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0",
                          reminder.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        )}>
                          {reminder.is_active ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>

                      {reminder.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {reminder.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{reminders.formatReminderDate(reminder.due_date, reminder.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={reminder.is_active}
                        onCheckedChange={() => reminders.handleToggleActive(reminder.id, reminder.is_active)}
                      />
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => reminders.openEdit(reminder)}>
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => reminders.handleDeleteReminder(reminder.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Alertas */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Alertas</h2>
            <p className="text-sm text-muted-foreground">Agrupados por tipo — para você priorizar com rapidez.</p>
          </div>

          {/* Birthdays Accordion */}
          <AlertAccordion
            open={openAccordions.birthdays}
            onToggle={() => toggleAccordion('birthdays')}
            icon={<Gift className="w-5 h-5 text-pink-500" />}
            title="Aniversariantes do dia"
            description="Lista de pacientes que fazem aniversário hoje"
            count={birthdayAlerts?.length || 0}
            loading={loadingBirthdays}
            colorScheme="pink"
          >
            {birthdayAlerts?.map((alert) => {
              const todayStr = new Date().toISOString().split('T')[0];
              return (
                <div key={alert.patient.id} className="p-4 hover:bg-pink-50/30 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{alert.patient.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Fazendo {new Date().getFullYear() - new Date(alert.date).getFullYear()} anos
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-pink-500 hover:bg-pink-600 gap-2 text-white"
                        onClick={() => whatsapp.handleWhatsApp(
                          alert.patient.phone,
                          alert.patient.name.split(' ')[0],
                          'birthday',
                          { patientId: alert.patient.id, alertDate: todayStr }
                        )}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Parabenizar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDismissAlert('birthday', alert.patient.id, todayStr)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </AlertAccordion>

          {/* Procedure Reminders Accordion */}
          <AlertAccordion
            open={openAccordions.procedures}
            onToggle={() => toggleAccordion('procedures')}
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            title="Revisão pendente (6 meses)"
            description="Pacientes sem procedimentos há mais de 6 meses"
            count={procedureAlerts?.length || 0}
            loading={loadingProcedures}
            colorScheme="amber"
          >
            {procedureAlerts?.map((alert) => (
              <div key={alert.patient.id} className="p-4 hover:bg-amber-50/30 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{alert.patient.name}</p>
                    <p className="text-sm text-muted-foreground">{alert.daysSince} dias desde o último procedimento</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 gap-2 text-white"
                      onClick={() => whatsapp.handleWhatsApp(
                        alert.patient.phone,
                        alert.patient.name.split(' ')[0],
                        'return',
                        { patientId: alert.patient.id, alertDate: alert.date }
                      )}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Agendar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDismissAlert('procedure_return', alert.patient.id, alert.date)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </AlertAccordion>

          {/* Tomorrow's Appointments Accordion */}
          <AlertAccordion
            open={openAccordions.confirmations}
            onToggle={() => toggleAccordion('confirmations')}
            icon={<Calendar className="w-5 h-5 text-[#a03f3d]" />}
            title="Confirmar consultas de amanhã"
            description="Consultas que precisam de confirmação"
            count={tomorrowAppointments?.filter(a => a.status !== 'confirmed').length || 0}
            loading={loadingTomorrow}
            colorScheme="red"
          >
            {tomorrowAppointments?.map((appointment) => (
              <div key={appointment.id} className="p-4 hover:bg-red-50/30 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#a03f3d] text-white px-3 py-1.5 rounded-lg font-bold text-sm">
                      {appointment.time.slice(0, 5)}
                    </div>
                    <div>
                      <p className="font-medium">{appointment.patients?.name}</p>
                      <p className="text-sm text-muted-foreground">{appointment.patients?.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-[#8b3634] hover:bg-red-50 gap-2"
                      onClick={() => whatsapp.handleWhatsApp(appointment.patients?.phone || '', appointment.patients?.name?.split(' ')[0] || '', 'reminder')}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Mensagem</span>
                    </Button>
                    {appointment.status !== 'confirmed' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 gap-2 text-white"
                        onClick={() => {
                          if (confirm(`Deseja confirmar a consulta de ${appointment.patients?.name}?`)) {
                            updateAppointmentStatus.mutate({ id: appointment.id, status: 'confirmed' }, {
                              onSuccess: () => toast.success('Consulta confirmada!')
                            });
                          }
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Confirmar</span>
                      </Button>
                    )}
                    {appointment.status === 'confirmed' && (
                      <span className="text-xs font-semibold text-green-600 px-2 py-1 bg-green-50 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Confirmada
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </AlertAccordion>

          {/* Scheduled Returns */}
          {returnAlerts && returnAlerts.length > 0 && (
            <AlertAccordion
              open={openAccordions.returns}
              onToggle={() => toggleAccordion('returns')}
              icon={<Clock className="w-5 h-5 text-blue-600" />}
              title="Retornos agendados"
              description="Pacientes com retorno sugerido para breve"
              count={returnAlerts?.length || 0}
              loading={loadingReturns}
              colorScheme="blue"
            >
              {returnAlerts?.map((alert) => {
                const getUrgencyBadge = (days: number) => {
                  if (days <= 7) return { text: 'Urgente', class: 'bg-red-100 text-red-700' };
                  if (days <= 14) return { text: 'Em breve', class: 'bg-amber-100 text-amber-700' };
                  return { text: 'Próximo', class: 'bg-gray-100 text-gray-600' };
                };
                const badge = getUrgencyBadge(alert.days_until_return);
                return (
                  <div key={alert.patient_id} className="p-4 hover:bg-blue-50/30 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{alert.patient_name}</p>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", badge.class)}>
                          {badge.text}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => whatsapp.handleWhatsApp(alert.phone, alert.patient_name.split(' ')[0], 'reminder')}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </AlertAccordion>
          )}

          {/* Prosthesis Scheduling Alerts */}
          {prosthesisAlerts && prosthesisAlerts.length > 0 && (
            <AlertAccordion
              open={openAccordions.prosthesis}
              onToggle={() => toggleAccordion('prosthesis')}
              icon={<CalendarClock className="w-5 h-5 text-purple-600" />}
              title="Próteses aguardando agendamento"
              description="Pacientes com prótese pronta para prova"
              count={prosthesisAlerts.length}
              loading={loadingProsthesis}
              colorScheme="pink"
            >
              {prosthesisAlerts.map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-purple-50/30 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{alert.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {PROSTHESIS_TYPE_LABELS[alert.type] || alert.type}
                        {alert.toothNumbers.length > 0 && ` — Dentes: ${alert.toothNumbers.join(', ')}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-200 text-purple-700 hover:bg-purple-50"
                      onClick={() => navigate('/agenda')}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Agendar
                    </Button>
                  </div>
                </div>
              ))}
            </AlertAccordion>
          )}
        </div>
      </div>

      {/* Patient Select Dialog */}
      <Dialog open={whatsapp.showPatientSelect} onOpenChange={whatsapp.setShowPatientSelect}>
        <DialogContent className="sm:max-w-[400px] h-[500px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Paciente</DialogTitle>
          </DialogHeader>

          <div className="relative mb-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={whatsapp.searchQuery}
              onChange={(e) => whatsapp.setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {whatsapp.filteredPatients.map(patient => (
              <button
                key={patient.id}
                onClick={() => whatsapp.handleSelectPatient(patient)}
                className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">{patient.name}</p>
                  <p className="text-xs text-muted-foreground">{patient.phone}</p>
                </div>
                <MessageCircle className="w-4 h-4 text-[#a03f3d] opacity-0 group-hover:opacity-100" />
              </button>
            ))}
            {whatsapp.filteredPatients.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">Nenhum paciente encontrado.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
