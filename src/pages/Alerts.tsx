import { Bell, MessageCircle, Phone, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useReturnAlerts } from '@/hooks/useConsultations';
import { useAppointmentsByDate } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';

export default function Alerts() {
  // Get tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: returnAlerts, isLoading: loadingAlerts } = useReturnAlerts();
  const { data: tomorrowAppointments, isLoading: loadingTomorrow } = useAppointmentsByDate(tomorrowStr);

  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${name}! Estamos entrando em contato para lembrar sobre sua consulta de retorno na clínica. Podemos agendar um horário conveniente para você?`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 7) return { text: 'Urgente', class: 'bg-destructive text-destructive-foreground', icon: AlertTriangle };
    if (days <= 14) return { text: 'Em breve', class: 'bg-warning text-warning-foreground', icon: Clock };
    return { text: 'Próximo', class: 'bg-muted text-muted-foreground', icon: CheckCircle };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Alertas e Lembretes</h1>
        <p className="text-muted-foreground mt-1">Gerencie retornos e lembretes de consultas</p>
      </div>

      {/* Tomorrow's Appointments */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border bg-accent/30">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Consultas de Amanhã
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {loadingTomorrow ? '...' : `${tomorrowAppointments?.length || 0} consulta(s) agendada(s)`}
          </p>
        </div>
        {loadingTomorrow ? (
          <div className="p-4 space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : !tomorrowAppointments?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Nenhuma consulta agendada para amanhã</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tomorrowAppointments.map((appointment, index) => (
              <div
                key={appointment.id}
                className="p-4 hover:bg-muted/30 transition-colors animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[50px]">
                      <p className="text-lg font-bold text-primary">{appointment.time.slice(0, 5)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{appointment.patients?.name}</p>
                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      const phone = appointment.patients?.phone || '';
                      const cleanPhone = phone.replace(/\D/g, '');
                      const message = encodeURIComponent(
                        `Olá ${appointment.patients?.name?.split(' ')[0]}! Lembrando que sua consulta está agendada para amanhã às ${appointment.time.slice(0, 5)}. Confirmamos sua presença?`
                      );
                      window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Lembrar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Return Alerts */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Retornos Pendentes
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Pacientes para agendar retorno (próximos 30 dias)
          </p>
        </div>
        {loadingAlerts ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : !returnAlerts?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Nenhum retorno pendente</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {returnAlerts
              .sort((a, b) => a.days_until_return - b.days_until_return)
              .map((alert, index) => {
                const badge = getUrgencyBadge(alert.days_until_return);
                const BadgeIcon = badge.icon;
                return (
                  <div
                    key={alert.patient_id}
                    className="p-4 hover:bg-muted/30 transition-colors animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{alert.patient_name}</p>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1", badge.class)}>
                            <BadgeIcon className="w-3 h-3" />
                            {badge.text}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{alert.phone}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Data sugerida: {new Date(alert.suggested_return_date).toLocaleDateString('pt-BR')}
                          <span className="ml-2 font-medium">({alert.days_until_return} dias)</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => window.open(`tel:${alert.phone.replace(/\D/g, '')}`)}
                        >
                          <Phone className="w-4 h-4" />
                          Ligar
                        </Button>
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => handleWhatsApp(alert.phone, alert.patient_name.split(' ')[0])}
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
