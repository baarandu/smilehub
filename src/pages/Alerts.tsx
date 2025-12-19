import { useState, useEffect } from 'react';
import { Bell, MessageCircle, Phone, Clock, AlertTriangle, CheckCircle, Gift, Settings, Plus, Trash2, Edit2, RotateCcw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useReturnAlerts } from '@/hooks/useConsultations';
import { useAppointmentsByDate } from '@/hooks/useAppointments';
import { useBirthdayAlerts, useProcedureReminders } from '@/hooks/useAlerts';
import { remindersService, Reminder } from '@/services/reminders';
import { getPatients } from '@/services/patients';
import { Patient } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Alerts() {
  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: returnAlerts, isLoading: loadingReturns } = useReturnAlerts();
  const { data: birthdayAlerts, isLoading: loadingBirthdays } = useBirthdayAlerts();
  const { data: procedureAlerts, isLoading: loadingProcedures } = useProcedureReminders();
  const { data: tomorrowAppointments, isLoading: loadingTomorrow } = useAppointmentsByDate(tomorrowStr);

  // Template State
  const [birthdayTemplate, setBirthdayTemplate] = useState('');
  const [returnTemplate, setReturnTemplate] = useState('');
  const [confirmationTemplate, setConfirmationTemplate] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Reminders State
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminderForm, setReminderForm] = useState({ title: '', description: '' });

  // Message Sending
  const [showPatientSelect, setShowPatientSelect] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadedBirthday = localStorage.getItem('birthdayTemplate');
    const loadedReturn = localStorage.getItem('returnTemplate');
    const loadedConfirmation = localStorage.getItem('confirmationTemplate');
    setBirthdayTemplate(loadedBirthday || "Parabéns {name}! 🎉\n\nNós do Smile Care Hub desejamos a você um feliz aniversário, muita saúde e alegria!\n\nConte sempre conosco para cuidar do seu sorriso.");
    setReturnTemplate(loadedReturn || "Olá {name}, tudo bem?\n\nNotamos que já se passaram 6 meses desde seu último procedimento conosco. Que tal agendar uma avaliação de retorno para garantir que está tudo certo com seu sorriso?");
    setConfirmationTemplate(loadedConfirmation || "Olá {name}! 👋\n\nPassando para confirmar sua consulta agendada para amanhã.\n\nPodemos contar com sua presença? Por favor, confirme respondendo esta mensagem.");

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
        await remindersService.update(editingReminder.id, reminderForm);
        toast.success('Lembrete atualizado!');
      } else {
        await remindersService.create({
          title: reminderForm.title,
          description: reminderForm.description,
          is_active: true
        });
        toast.success('Lembrete criado!');
      }
      setShowReminderDialog(false);
      setReminderForm({ title: '', description: '' });
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
      // Optimistic update
      setReminders(reminders.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r));
      await remindersService.update(id, { is_active: !currentStatus });
    } catch (error) {
      // Revert on error
      loadReminders();
      toast.error('Erro ao atualizar status');
    }
  };

  const openEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setReminderForm({ title: reminder.title, description: reminder.description || '' });
    setShowReminderDialog(true);
  };

  const saveTemplates = () => {
    localStorage.setItem('birthdayTemplate', birthdayTemplate);
    localStorage.setItem('returnTemplate', returnTemplate);
    localStorage.setItem('confirmationTemplate', confirmationTemplate);
    setShowSettings(false);
  };

  const handleWhatsApp = (phone: string, name: string, type: 'birthday' | 'return' | 'reminder') => {
    const cleanPhone = phone.replace(/\D/g, '');
    let message = '';

    if (type === 'birthday') {
      message = birthdayTemplate.replace('{name}', name);
    } else if (type === 'return') {
      message = returnTemplate.replace('{name}', name);
    } else {
      message = confirmationTemplate.replace('{name}', name);
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
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

  const handleSelectPatient = (patient: Patient) => {
    if (!sendingTemplate) return;
    const cleanPhone = patient.phone.replace(/\D/g, '');
    const firstName = patient.name.split(' ')[0];
    const message = sendingTemplate.replace('{name}', firstName);

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');

    setShowPatientSelect(false);
    setSendingTemplate(null);
    setSearchQuery('');
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.phone.includes(searchQuery)
  );

  const getUrgencyBadge = (days: number) => {
    if (days <= 7) return { text: 'Urgente', class: 'bg-destructive text-destructive-foreground', icon: AlertTriangle };
    if (days <= 14) return { text: 'Em breve', class: 'bg-warning text-warning-foreground', icon: Clock };
    return { text: 'Próximo', class: 'bg-muted text-muted-foreground', icon: CheckCircle };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Alertas e Lembretes</h1>
          <p className="text-muted-foreground mt-1">Gerencie lembretes internos e retornos de pacientes</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showReminderDialog} onOpenChange={(open) => {
            setShowReminderDialog(open);
            if (!open) {
              setEditingReminder(null);
              setReminderForm({ title: '', description: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700 gap-2">
                <Plus className="w-4 h-4" />
                Novo Lembrete
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
              </div>
              <DialogFooter>
                <Button onClick={handleCreateReminder}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                Configurar Mensagens
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Modelos de Mensagem</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
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
                        <Button size="sm" variant="ghost" className="h-6 text-teal-600" onClick={() => initiateSendMessage(returnTemplate)}>
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
                        <Button size="sm" variant="ghost" className="h-6 text-teal-600" onClick={() => initiateSendMessage(confirmationTemplate)}>
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
              <DialogFooter>
                <Button onClick={saveTemplates}>Salvar Alterações</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reminders Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-teal-600" />
          Meus Lembretes
        </h2>
        {loadingReminders ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reminders.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-muted-foreground">Você não possui lembretes cadastrados.</p>
                <Button variant="link" onClick={() => setShowReminderDialog(true)}>Criar o primeiro</Button>
              </div>
            ) : (
              reminders.map(reminder => (
                <div key={reminder.id} className={cn(
                  "group relative p-4 rounded-xl border transition-all duration-200",
                  reminder.is_active
                    ? "bg-white border-teal-100 shadow-sm hover:shadow-md hover:border-teal-200"
                    : "bg-gray-50 border-gray-200 opacity-75"
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={cn("font-medium break-words pr-8", reminder.is_active ? "text-slate-900" : "text-gray-500 line-through")}>
                      {reminder.title}
                    </h3>
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(reminder)}>
                        <Edit2 className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteReminder(reminder.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {reminder.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3 break-words">
                      {reminder.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100/50">
                    <span className="text-xs text-muted-foreground">
                      {new Date(reminder.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`rem-${reminder.id}`} className="text-xs cursor-pointer">
                        {reminder.is_active ? 'Ativo' : 'Concluído'}
                      </Label>
                      <Switch
                        id={`rem-${reminder.id}`}
                        checked={reminder.is_active}
                        onCheckedChange={() => handleToggleActive(reminder.id, reminder.is_active)}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* Birthdays */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-pink-50/50">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-500" />
            Aniversariantes do Dia
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {loadingBirthdays ? '...' : `${birthdayAlerts?.length || 0} aniversariantes hoje`}
          </p>
        </div>
        {!loadingBirthdays && birthdayAlerts?.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <p>Nenhuma aniversariante hoje.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {birthdayAlerts?.map((alert) => (
              <div key={alert.patient.id} className="p-4 hover:bg-pink-50/30 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{alert.patient.name}</p>
                    <p className="text-sm text-muted-foreground">Fazendo {new Date().getFullYear() - new Date(alert.patient.birth_date!).getFullYear()} anos</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-pink-500 hover:bg-pink-600 border-pink-600 gap-2 text-white"
                    onClick={() => handleWhatsApp(alert.patient.phone, alert.patient.name.split(' ')[0], 'birthday')}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Parabenizar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Procedure Reminders (Returns) */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-amber-50/50">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Revisão Pendente (6 meses)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Pacientes sem procedimentos há mais de 6 meses
          </p>
        </div>
        {!loadingProcedures && procedureAlerts?.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <p>Nenhuma revisão pendente.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {procedureAlerts?.map((alert) => (
              <div key={alert.patient.id} className="p-4 hover:bg-amber-50/30 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{alert.patient.name}</p>
                    <p className="text-sm text-muted-foreground">{alert.daysSince} dias desde o último procedimento</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 border-amber-600 gap-2 text-white"
                    onClick={() => handleWhatsApp(alert.patient.phone, alert.patient.name.split(' ')[0], 'return')}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Agendar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tomorrow's Appointments - Confirmação de Consulta */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-teal-50/50">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-500" />
            Confirmar Consultas de Amanhã
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {loadingTomorrow ? '...' : `${tomorrowAppointments?.length || 0} consulta(s) para confirmar`}
          </p>
        </div>
        {!loadingTomorrow && tomorrowAppointments?.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <p>Nenhuma consulta agendada para amanhã.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tomorrowAppointments?.map((appointment) => (
              <div key={appointment.id} className="p-4 hover:bg-teal-50/30 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-teal-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm">
                      {appointment.time.slice(0, 5)}
                    </div>
                    <div>
                      <p className="font-medium">{appointment.patients?.name}</p>
                      <p className="text-sm text-muted-foreground">{appointment.patients?.phone}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-teal-500 hover:bg-teal-600 border-teal-600 gap-2 text-white"
                    onClick={() => handleWhatsApp(appointment.patients?.phone || '', appointment.patients?.name?.split(' ')[0] || '', 'reminder')}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Confirmar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Returns (Scheduled) */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Retornos Agendados
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Pacientes com retorno sugerido para breve
          </p>
        </div>
        {/* Logic for returnAlerts */}
        <div className="divide-y divide-border">
          {returnAlerts?.map((alert) => {
            const badge = getUrgencyBadge(alert.days_until_return);
            return (
              <div key={alert.patient_id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                <div>
                  <p className="font-medium">{alert.patient_name}</p>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", badge.class)}>{badge.text}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleWhatsApp(alert.phone, alert.patient_name.split(' ')[0], 'reminder')}
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
          {!loadingReturns && returnAlerts?.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">Nenhum retorno agendado</div>
          )}
        </div>
        </div>

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
                        <MessageCircle className="w-4 h-4 text-teal-600 opacity-0 group-hover:opacity-100" />
                    </button>
                ))}
                {filteredPatients.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">Nenhum paciente encontrado.</p>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
