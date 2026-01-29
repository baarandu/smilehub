import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, MessageCircle, Clock, CheckCircle, Gift, Settings, Plus, Trash2, Edit2, Search, X, Calendar, ChevronDown, Filter, MessageSquare } from 'lucide-react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useReturnAlerts } from '@/hooks/useConsultations';
import { useAppointmentsByDate, useUpdateAppointmentStatus } from '@/hooks/useAppointments';
import { useBirthdayAlerts, useProcedureReminders, useDismissAlert } from '@/hooks/useAlerts';
import { remindersService, Reminder } from '@/services/reminders';
import { getPatients } from '@/services/patients';
import { evolutionApi } from '@/services/evolutionApi';
import { Patient } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CustomTemplate {
  id: string;
  title: string;
  message: string;
}

type ReminderFilter = 'all' | 'active' | 'paused';

// Beta testers emails loaded from environment variable
const AI_SECRETARY_ALLOWED_EMAILS = (import.meta.env.VITE_AI_SECRETARY_BETA_EMAILS || '')
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

// Plan slugs that have access to AI Secretary
const AI_SECRETARY_ALLOWED_PLANS = ['enterprise'];

export default function Alerts() {
  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: returnAlerts, isLoading: loadingReturns } = useReturnAlerts();
  const { data: birthdayAlerts, isLoading: loadingBirthdays } = useBirthdayAlerts();
  const { data: procedureAlerts, isLoading: loadingProcedures } = useProcedureReminders();
  const dismissAlert = useDismissAlert();
  const { data: tomorrowAppointments, isLoading: loadingTomorrow } = useAppointmentsByDate(tomorrowStr);
  const updateAppointmentStatus = useUpdateAppointmentStatus();

  // Template State
  const [birthdayTemplate, setBirthdayTemplate] = useState('');
  const [returnTemplate, setReturnTemplate] = useState('');
  const [confirmationTemplate, setConfirmationTemplate] = useState('');
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Reminders State
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminderForm, setReminderForm] = useState({ title: '', description: '', scheduled_date: '' });

  // Search and Filter State
  const [reminderSearch, setReminderSearch] = useState('');
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all');

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

  // Message Sending
  const [showPatientSelect, setShowPatientSelect] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // WhatsApp Integration
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState<string | null>(null);

  // AI Secretary Access Control
  const { clinicId } = useClinic();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [planSlug, setPlanSlug] = useState<string | null>(null);

  // Check if user has access to AI Secretary features
  const hasEnterprisePlan = planSlug && AI_SECRETARY_ALLOWED_PLANS.includes(planSlug.toLowerCase());
  const isInBetaList = userEmail && AI_SECRETARY_ALLOWED_EMAILS.includes(userEmail.toLowerCase());
  const hasAISecretaryAccess = hasEnterprisePlan || isInBetaList || isSuperAdmin;

  // Persist accordion state
  useEffect(() => {
    localStorage.setItem('alertAccordionState', JSON.stringify(openAccordions));
  }, [openAccordions]);

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
        setIsSuperAdmin(profile?.is_super_admin || false);
      }
    };
    checkUserAccess();
  }, []);

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Check WhatsApp connection status
  const checkWhatsappStatus = useCallback(async () => {
    try {
      const isHealthy = await evolutionApi.healthCheck();
      if (!isHealthy) {
        setWhatsappConnected(false);
        return;
      }
      const state = await evolutionApi.getConnectionState();
      setWhatsappConnected(state.instance?.state === 'open');
    } catch {
      setWhatsappConnected(false);
    }
  }, []);

  useEffect(() => {
    checkWhatsappStatus();
    const interval = setInterval(checkWhatsappStatus, 30000);
    return () => clearInterval(interval);
  }, [checkWhatsappStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadReminders(), checkWhatsappStatus()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    const loadedBirthday = localStorage.getItem('birthdayTemplate');
    const loadedReturn = localStorage.getItem('returnTemplate');
    const loadedConfirmation = localStorage.getItem('confirmationTemplate');
    const loadedCustom = localStorage.getItem('customTemplates');

    setBirthdayTemplate(loadedBirthday || "Parabéns {name}! 🎉\n\nNós do Organiza Odonto desejamos a você um feliz aniversário, muita saúde e alegria!\n\nConte sempre conosco para cuidar do seu sorriso.");
    setReturnTemplate(loadedReturn || "Olá {name}, tudo bem?\n\nNotamos que já se passaram 6 meses desde seu último procedimento conosco. Que tal agendar uma avaliação de retorno para garantir que está tudo certo com seu sorriso?");
    setConfirmationTemplate(loadedConfirmation || "Olá {name}! 👋\n\nPassando para confirmar sua consulta agendada para amanhã.\n\nPodemos contar com sua presença? Por favor, confirme respondendo esta mensagem.");

    if (loadedCustom) {
      try {
        setCustomTemplates(JSON.parse(loadedCustom));
      } catch (e) {
        console.error('Error parsing custom templates:', e);
      }
    }

    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setLoadingReminders(true);
      const data = await remindersService.getAll();
      setReminders(data);
    } catch (error) {
      console.error('Error loading reminders:', error);
      toast.error('Erro ao carregar lembretes');
    } finally {
      setLoadingReminders(false);
    }
  };

  const handleCreateReminder = async () => {
    if (!reminderForm.title.trim()) {
      toast.error('O título é obrigatório');
      return;
    }

    try {
      if (editingReminder) {
        await remindersService.update(editingReminder.id, {
          title: reminderForm.title,
          description: reminderForm.description,
          scheduled_date: reminderForm.scheduled_date || null
        });
        toast.success('Lembrete atualizado!');
      } else {
        await remindersService.create({
          title: reminderForm.title,
          description: reminderForm.description,
          scheduled_date: reminderForm.scheduled_date || null,
          is_active: true
        });
        toast.success('Lembrete criado!');
      }
      setShowReminderDialog(false);
      setReminderForm({ title: '', description: '', scheduled_date: '' });
      setEditingReminder(null);
      loadReminders();
    } catch (error) {
      console.error(error);
      toast.error('Houve um erro ao salvar o lembrete');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return;
    try {
      await remindersService.delete(id);
      toast.success('Lembrete excluído');
      loadReminders();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      setReminders(reminders.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r));
      await remindersService.update(id, { is_active: !currentStatus });
    } catch (error) {
      loadReminders();
      toast.error('Erro ao atualizar status');
    }
  };

  const openEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setReminderForm({
      title: reminder.title,
      description: reminder.description || '',
      scheduled_date: reminder.scheduled_date || ''
    });
    setShowReminderDialog(true);
  };

  const saveTemplates = () => {
    localStorage.setItem('birthdayTemplate', birthdayTemplate);
    localStorage.setItem('returnTemplate', returnTemplate);
    localStorage.setItem('confirmationTemplate', confirmationTemplate);
    localStorage.setItem('customTemplates', JSON.stringify(customTemplates));
    setShowSettings(false);
    toast.success('Configurações salvas!');
  };

  const handleAddCustomTemplate = () => {
    setCustomTemplates([...customTemplates, { id: Date.now().toString(), title: '', message: '' }]);
  };

  const handleUpdateCustomTemplate = (id: string, updates: Partial<CustomTemplate>) => {
    setCustomTemplates(customTemplates.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleDeleteCustomTemplate = (id: string) => {
    if (confirm('Deseja excluir esta mensagem personalizada?')) {
      setCustomTemplates(customTemplates.filter(t => t.id !== id));
    }
  };

  const handleWhatsApp = async (
    phone: string,
    name: string,
    type: 'birthday' | 'return' | 'reminder',
    alertInfo?: { patientId: string; alertDate: string }
  ) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const firstName = name.split(' ')[0];
    let message = '';

    if (type === 'birthday') {
      message = birthdayTemplate.replace('{name}', firstName);
    } else if (type === 'return') {
      message = returnTemplate.replace('{name}', firstName);
    } else {
      message = confirmationTemplate.replace('{name}', firstName);
    }

    if (whatsappConnected) {
      const messageId = `${cleanPhone}-${Date.now()}`;
      setIsSendingWhatsapp(messageId);
      try {
        await evolutionApi.sendText(cleanPhone, message);
        toast.success('Mensagem enviada via WhatsApp!');

        if (alertInfo) {
          const alertType = type === 'birthday' ? 'birthday' : 'procedure_return';
          dismissAlert.mutate({
            alertType: alertType as 'birthday' | 'procedure_return',
            patientId: alertInfo.patientId,
            alertDate: alertInfo.alertDate,
            action: 'messaged'
          });
        }
      } catch (error) {
        console.error('Error sending WhatsApp:', error);
        toast.error('Falha ao enviar. Abrindo WhatsApp Web...');
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
      } finally {
        setIsSendingWhatsapp(null);
      }
    } else {
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');

      if (alertInfo) {
        const alertType = type === 'birthday' ? 'birthday' : 'procedure_return';
        dismissAlert.mutate({
          alertType: alertType as 'birthday' | 'procedure_return',
          patientId: alertInfo.patientId,
          alertDate: alertInfo.alertDate,
          action: 'messaged'
        });
      }
    }
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

  const loadPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (e) { console.error(e); }
  };

  const initiateSendMessage = (template: string) => {
    setSendingTemplate(template);
    setShowSettings(false);
    loadPatients();
    setTimeout(() => setShowPatientSelect(true), 200);
  };

  const handleSelectPatient = async (patient: Patient) => {
    if (!sendingTemplate) return;
    const cleanPhone = patient.phone.replace(/\D/g, '');
    const firstName = patient.name.split(' ')[0];
    const message = sendingTemplate.replace('{name}', firstName);

    if (whatsappConnected) {
      const messageId = `${cleanPhone}-${Date.now()}`;
      setIsSendingWhatsapp(messageId);
      try {
        await evolutionApi.sendText(cleanPhone, message);
        toast.success(`Mensagem enviada para ${firstName}!`);
      } catch (error) {
        console.error('Error sending WhatsApp:', error);
        toast.error('Falha ao enviar. Abrindo WhatsApp Web...');
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
      } finally {
        setIsSendingWhatsapp(null);
      }
    } else {
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
    }

    setShowPatientSelect(false);
    setSendingTemplate(null);
    setSearchQuery('');
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  // Filtered reminders based on search and filter
  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      const matchesSearch = reminderSearch === '' ||
        r.title.toLowerCase().includes(reminderSearch.toLowerCase()) ||
        (r.description?.toLowerCase().includes(reminderSearch.toLowerCase()));

      const matchesFilter =
        reminderFilter === 'all' ||
        (reminderFilter === 'active' && r.is_active) ||
        (reminderFilter === 'paused' && !r.is_active);

      return matchesSearch && matchesFilter;
    });
  }, [reminders, reminderSearch, reminderFilter]);

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

  // Format date for display
  const formatReminderDate = (dateStr: string | null, createdAt: string) => {
    if (dateStr) {
      const date = new Date(dateStr + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.getTime() === today.getTime()) {
        return 'Hoje';
      } else if (date.getTime() === tomorrow.getTime()) {
        return 'Amanhã';
      } else {
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    }
    return new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

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
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
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
                    <Button size="sm" variant="outline" className="gap-2 h-8 border-red-200 text-[#8b3634] hover:bg-red-50" onClick={handleAddCustomTemplate}>
                      <Plus className="w-4 h-4" /> Novo Modelo
                    </Button>
                  </div>

                  {customTemplates.length === 0 ? (
                    <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
                      <p className="text-sm text-muted-foreground">Nenhuma mensagem personalizada.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {customTemplates.map((template) => (
                        <div key={template.id} className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50 transition-colors hover:border-red-200/50">
                          <div className="flex justify-between items-center gap-2">
                            <Input
                              placeholder="Título (ex: Pós-operatório)"
                              value={template.title}
                              onChange={(e) => handleUpdateCustomTemplate(template.id, { title: e.target.value })}
                              className="h-9 text-sm font-semibold bg-background"
                            />
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-[#a03f3d] hover:text-[#8b3634] hover:bg-red-50"
                                onClick={() => initiateSendMessage(template.message)}
                                title="Enviar para um paciente"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50"
                                onClick={() => handleDeleteCustomTemplate(template.id)}
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <Textarea
                            value={template.message}
                            onChange={(e) => handleUpdateCustomTemplate(template.id, { message: e.target.value })}
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
                      value={birthdayTemplate}
                      onChange={(e) => setBirthdayTemplate(e.target.value)}
                      rows={3}
                      placeholder="Use {name} para o nome do paciente"
                    />
                    <p className="text-xs text-muted-foreground">Use {'{name}'} para substituir pelo nome do paciente.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Mensagem de Retorno (6 meses)</Label>
                      <Button size="sm" variant="ghost" className="h-6 text-[#a03f3d]" onClick={() => initiateSendMessage(returnTemplate)}>
                        <MessageCircle className="w-4 h-4 mr-1" /> Enviar
                      </Button>
                    </div>
                    <Textarea
                      value={returnTemplate}
                      onChange={(e) => setReturnTemplate(e.target.value)}
                      rows={3}
                      placeholder="Use {name} para o nome do paciente"
                    />
                    <p className="text-xs text-muted-foreground">Use {'{name}'} para substituir pelo nome do paciente.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Mensagem de Confirmação de Consulta</Label>
                      <Button size="sm" variant="ghost" className="h-6 text-[#a03f3d]" onClick={() => initiateSendMessage(confirmationTemplate)}>
                        <MessageCircle className="w-4 h-4 mr-1" /> Enviar
                      </Button>
                    </div>
                    <Textarea
                      value={confirmationTemplate}
                      onChange={(e) => setConfirmationTemplate(e.target.value)}
                      rows={3}
                      placeholder="Use {name} para o nome do paciente"
                    />
                    <p className="text-xs text-muted-foreground">Usada para confirmar consultas de amanhã. Use {'{name}'} para o nome.</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={saveTemplates}>Salvar Alterações</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showReminderDialog} onOpenChange={(open) => {
            setShowReminderDialog(open);
            if (!open) {
              setEditingReminder(null);
              setReminderForm({ title: '', description: '', scheduled_date: '' });
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
                <DialogTitle>{editingReminder ? 'Editar Lembrete' : 'Novo Lembrete'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="Ex: Enviar exame para laboratório"
                    value={reminderForm.title}
                    onChange={e => setReminderForm({ ...reminderForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (Opcional)</Label>
                  <Textarea
                    placeholder="Detalhes adicionais..."
                    value={reminderForm.description}
                    onChange={e => setReminderForm({ ...reminderForm, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data (Opcional)</Label>
                  <Input
                    type="date"
                    value={reminderForm.scheduled_date}
                    onChange={e => setReminderForm({ ...reminderForm, scheduled_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Defina uma data para o lembrete aparecer</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateReminder}>Salvar</Button>
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
                    <p className="text-2xl font-bold text-foreground">{whatsappConnected ? 'Ativas' : 'Offline'}</p>
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
                  checked={reminderFilter === 'all'}
                  onCheckedChange={() => setReminderFilter('all')}
                >
                  Todos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={reminderFilter === 'active'}
                  onCheckedChange={() => setReminderFilter('active')}
                >
                  Apenas ativos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={reminderFilter === 'paused'}
                  onCheckedChange={() => setReminderFilter('paused')}
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
              value={reminderSearch}
              onChange={(e) => setReminderSearch(e.target.value)}
              className="pl-9 pr-12 bg-white"
            />
            {reminderSearch && (
              <button
                onClick={() => setReminderSearch('')}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {filteredReminders.length}
            </span>
          </div>

          {/* Reminders List */}
          <div className="space-y-3">
            {loadingReminders ? (
              <>
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </>
            ) : filteredReminders.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-200">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {reminders.length === 0 ? 'Você não possui lembretes cadastrados.' : 'Nenhum lembrete encontrado.'}
                </p>
                {reminders.length === 0 && (
                  <Button variant="link" className="text-[#a03f3d]" onClick={() => setShowReminderDialog(true)}>
                    Criar o primeiro
                  </Button>
                )}
              </div>
            ) : (
              filteredReminders.map(reminder => (
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
                        <span>{formatReminderDate(reminder.scheduled_date, reminder.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={reminder.is_active}
                        onCheckedChange={() => handleToggleActive(reminder.id, reminder.is_active)}
                      />
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(reminder)}>
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteReminder(reminder.id)}>
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
          <Collapsible
            open={openAccordions.birthdays}
            onOpenChange={() => toggleAccordion('birthdays')}
            className="bg-white rounded-xl border border-pink-100 overflow-hidden"
          >
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-pink-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-pink-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">Aniversariantes do dia</h3>
                  <p className="text-sm text-muted-foreground">Lista de pacientes que fazem aniversário hoje</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium px-2.5 py-1 rounded-full",
                  (birthdayAlerts?.length || 0) > 0
                    ? "bg-pink-100 text-pink-700"
                    : "bg-gray-100 text-gray-500"
                )}>
                  {loadingBirthdays ? '...' : birthdayAlerts?.length || 0}
                </span>
                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  openAccordions.birthdays && "rotate-180"
                )} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-pink-100">
                {loadingBirthdays ? (
                  <div className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : birthdayAlerts?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhum item por enquanto.
                  </div>
                ) : (
                  <div className="divide-y divide-pink-50">
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
                                onClick={() => handleWhatsApp(
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
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Procedure Reminders Accordion */}
          <Collapsible
            open={openAccordions.procedures}
            onOpenChange={() => toggleAccordion('procedures')}
            className="bg-white rounded-xl border border-amber-100 overflow-hidden"
          >
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-amber-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">Revisão pendente (6 meses)</h3>
                  <p className="text-sm text-muted-foreground">Pacientes sem procedimentos há mais de 6 meses</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium px-2.5 py-1 rounded-full",
                  (procedureAlerts?.length || 0) > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-500"
                )}>
                  {loadingProcedures ? '...' : procedureAlerts?.length || 0}
                </span>
                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  openAccordions.procedures && "rotate-180"
                )} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-amber-100">
                {loadingProcedures ? (
                  <div className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : procedureAlerts?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhum item por enquanto.
                  </div>
                ) : (
                  <div className="divide-y divide-amber-50">
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
                              onClick={() => handleWhatsApp(
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
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Tomorrow's Appointments Accordion */}
          <Collapsible
            open={openAccordions.confirmations}
            onOpenChange={() => toggleAccordion('confirmations')}
            className="bg-white rounded-xl border border-red-100 overflow-hidden"
          >
            <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-red-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#a03f3d]" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">Confirmar consultas de amanhã</h3>
                  <p className="text-sm text-muted-foreground">Consultas que precisam de confirmação</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium px-2.5 py-1 rounded-full",
                  (tomorrowAppointments?.filter(a => a.status !== 'confirmed').length || 0) > 0
                    ? "bg-red-100 text-[#a03f3d]"
                    : "bg-gray-100 text-gray-500"
                )}>
                  {loadingTomorrow ? '...' : tomorrowAppointments?.filter(a => a.status !== 'confirmed').length || 0}
                </span>
                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  openAccordions.confirmations && "rotate-180"
                )} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-red-100">
                {loadingTomorrow ? (
                  <div className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : tomorrowAppointments?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhum item por enquanto.
                  </div>
                ) : (
                  <div className="divide-y divide-red-50">
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
                              onClick={() => handleWhatsApp(appointment.patients?.phone || '', appointment.patients?.name?.split(' ')[0] || '', 'reminder')}
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
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Scheduled Returns - Optional extra section */}
          {returnAlerts && returnAlerts.length > 0 && (
            <Collapsible
              open={openAccordions.returns}
              onOpenChange={() => toggleAccordion('returns')}
              className="bg-white rounded-xl border border-blue-100 overflow-hidden"
            >
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-blue-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">Retornos agendados</h3>
                    <p className="text-sm text-muted-foreground">Pacientes com retorno sugerido para breve</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium px-2.5 py-1 rounded-full",
                    (returnAlerts?.length || 0) > 0
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  )}>
                    {loadingReturns ? '...' : returnAlerts?.length || 0}
                  </span>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform",
                    openAccordions.returns && "rotate-180"
                  )} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-blue-100">
                  {loadingReturns ? (
                    <div className="p-4">
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : (
                    <div className="divide-y divide-blue-50">
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
                                onClick={() => handleWhatsApp(alert.phone, alert.patient_name.split(' ')[0], 'reminder')}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Patient Select Dialog */}
      <Dialog open={showPatientSelect} onOpenChange={setShowPatientSelect}>
        <DialogContent className="sm:max-w-[400px] h-[500px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Paciente</DialogTitle>
          </DialogHeader>

          <div className="relative mb-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {filteredPatients.map(patient => (
              <button
                key={patient.id}
                onClick={() => handleSelectPatient(patient)}
                className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">{patient.name}</p>
                  <p className="text-xs text-muted-foreground">{patient.phone}</p>
                </div>
                <MessageCircle className="w-4 h-4 text-[#a03f3d] opacity-0 group-hover:opacity-100" />
              </button>
            ))}
            {filteredPatients.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">Nenhum paciente encontrado.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
