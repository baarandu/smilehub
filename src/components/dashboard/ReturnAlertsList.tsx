import { Phone, MessageCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReturnAlert } from '@/types/database';

interface ReturnAlertsListProps {
  alerts: ReturnAlert[];
  isLoading?: boolean;
}

export function ReturnAlertsList({ alerts, isLoading }: ReturnAlertsListProps) {
  const handleWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${name}! Estamos entrando em contato para lembrar sobre sua consulta de retorno. Podemos agendar um horário?`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return 'border-l-destructive bg-destructive/5';
    if (days <= 14) return 'border-l-warning bg-warning/5';
    return 'border-l-primary bg-card';
  };

  const getUrgencyBadge = (days: number) => {
    if (days <= 7) return { text: 'Urgente', class: 'bg-destructive text-destructive-foreground' };
    if (days <= 14) return { text: 'Em breve', class: 'bg-warning text-warning-foreground' };
    return { text: 'Próximo', class: 'bg-muted text-muted-foreground' };
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24 mt-2" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Retornos Próximos
        </h3>
        <p className="text-sm text-muted-foreground mt-1">Pacientes para contatar</p>
      </div>
      <div className="divide-y divide-border">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Nenhum retorno pendente</p>
          </div>
        ) : (
          alerts.map((alert, index) => {
            const badge = getUrgencyBadge(alert.days_until_return);
            return (
              <div
                key={alert.patient_id}
                className={cn(
                  "p-4 border-l-4 transition-colors hover:bg-muted/30",
                  getUrgencyColor(alert.days_until_return),
                  "animate-slide-up"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{alert.patient_name}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", badge.class)}>
                        {badge.text}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{alert.phone}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Retorno: {new Date(alert.suggested_return_date).toLocaleDateString('pt-BR')} 
                      <span className="ml-1">({alert.days_until_return} dias)</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9"
                      onClick={() => window.open(`tel:${alert.phone.replace(/\D/g, '')}`)}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleWhatsApp(alert.phone, alert.patient_name.split(' ')[0])}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
