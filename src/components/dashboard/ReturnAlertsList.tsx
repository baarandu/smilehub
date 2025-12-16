import { Phone, MessageCircle, Clock, Gift, AlertTriangle, Bell, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export interface RecentAlert {
  id: string;
  type: 'birthday' | 'procedure_return' | 'scheduled';
  patientName: string;
  patientPhone: string;
  date: string;
  subtitle: string;
  urgency?: 'urgent' | 'soon' | 'normal';
}

interface RecentAlertsListProps {
  alerts: RecentAlert[];
  isLoading?: boolean;
}

export function RecentAlertsList({ alerts, isLoading }: RecentAlertsListProps) {
  const navigate = useNavigate();

  const handleWhatsApp = (phone: string, name: string, type: RecentAlert['type']) => {
    const cleanPhone = phone.replace(/\D/g, '');
    let message = '';

    // Default messages (should ideally come from settings context)
    if (type === 'birthday') {
      message = `Parabéns ${name}! 🎉\n\nNós do Smile Care Hub desejamos a você um feliz aniversário, muita saúde e alegria!\n\nConte sempre conosco para cuidar do seu sorriso.`;
    } else if (type === 'procedure_return') {
      message = `Olá ${name}, tudo bem?\n\nNotamos que já se passaram 6 meses desde seu último procedimento conosco. Que tal agendar uma avaliação de retorno para garantir que está tudo certo com seu sorriso?`;
    } else {
      message = `Olá ${name}! Estamos entrando em contato para lembrar sobre sua consulta de retorno. Podemos agendar um horário?`;
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
  };

  const getTypeConfig = (type: RecentAlert['type']) => {
    switch (type) {
      case 'birthday':
        return { icon: Gift, color: 'text-pink-600', bg: 'bg-pink-50 border-pink-100' };
      case 'procedure_return':
        return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' };
      default:
        return { icon: Bell, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-100' };
    }
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
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden h-full flex flex-col">
      <div className="p-5 border-b border-border flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Alertas Recentes
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Lembretes e notificações</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/alerts')} className="text-primary hover:text-primary/80">
          Ver todos
        </Button>
      </div>
      <div className="divide-y divide-border flex-1 overflow-auto">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-40">
            <Bell className="w-10 h-10 mb-2 opacity-40" />
            <p>Nenhum alerta recente</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const config = getTypeConfig(alert.type);
            const Icon = config.icon;

            return (
              <div
                key={`${alert.type}-${alert.id}`}
                className="p-4 hover:bg-muted/30 transition-colors animate-slide-up"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn("p-2 rounded-full shrink-0", config.bg)}>
                      <Icon className={cn("w-5 h-5", config.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{alert.patientName}</p>
                      <p className="text-sm text-muted-foreground truncate">{alert.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => window.open(`tel:${alert.patientPhone.replace(/\D/g, '')}`)}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handleWhatsApp(alert.patientPhone, alert.patientName.split(' ')[0], alert.type)}
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

