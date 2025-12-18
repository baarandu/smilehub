import { useState, useEffect } from 'react';
import { Bell, MessageCircle, Phone, Clock, AlertTriangle, CheckCircle, Gift, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useReturnAlerts } from '@/hooks/useConsultations';
import { useAppointmentsByDate } from '@/hooks/useAppointments';
import { useBirthdayAlerts, useProcedureReminders } from '@/hooks/useAlerts';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    const loadedBirthday = localStorage.getItem('birthdayTemplate');
    const loadedReturn = localStorage.getItem('returnTemplate');
    const loadedConfirmation = localStorage.getItem('confirmationTemplate');
    setBirthdayTemplate(loadedBirthday || "Parabéns {name}! 🎉\n\nNós do Smile Care Hub desejamos a você um feliz aniversário, muita saúde e alegria!\n\nConte sempre conosco para cuidar do seu sorriso.");
    setReturnTemplate(loadedReturn || "Olá {name}, tudo bem?\n\nNotamos que já se passaram 6 meses desde seu último procedimento conosco. Que tal agendar uma avaliação de retorno para garantir que está tudo certo com seu sorriso?");
    setConfirmationTemplate(loadedConfirmation || "Olá {name}! 👋\n\nPassando para confirmar sua consulta agendada para amanhã.\n\nPodemos contar com sua presença? Por favor, confirme respondendo esta mensagem.");
  }, []);

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
      // Confirmation for tomorrow's appointments
      message = confirmationTemplate.replace('{name}', name);
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
  };

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
          <p className="text-muted-foreground mt-1">Gerencie retornos e lembretes de consultas</p>
        </div>
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
                <Label>Mensagem de Retorno (6 meses)</Label>
                <Textarea
                  value={returnTemplate}
                  onChange={(e) => setReturnTemplate(e.target.value)}
                  rows={3}
                  placeholder="Use {name} para o nome do paciente"
                />
                <p className="text-xs text-muted-foreground">Use {'{name}'} para substituir pelo nome do paciente.</p>
              </div>
              <div className="space-y-2">
                <Label>Mensagem de Confirmação de Consulta</Label>
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
            <p>Nenhum aniversariante hoje.</p>
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
    </div>
  );
}

