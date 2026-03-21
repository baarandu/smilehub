import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MessageCircle, User, ChevronRight } from 'lucide-react';
import type { ClinicProfessional, CustomMessage } from '@/services/secretary';

interface QuickAccessCardsProps {
  professionals: ClinicProfessional[];
  customMessages: CustomMessage[];
  onNavigate: (section: string) => void;
}

export function QuickAccessCards({ professionals, customMessages, onNavigate }: QuickAccessCardsProps) {
  const navigate = useNavigate();

  const profSummary = () => {
    if (professionals.length === 0) return 'Nenhum cadastrado';
    if (professionals.length === 1) return `${professionals[0].title} ${professionals[0].name}`;
    return `${professionals.length} profissionais`;
  };

  const activeMessages = customMessages.filter(m => m.is_active).length;

  const cards = [
    {
      id: 'schedule',
      icon: Clock,
      label: 'Horários',
      summary: 'Configurar na Agenda',
      color: 'text-blue-600 bg-blue-50',
      action: () => navigate('/agenda?openSettings=true'),
    },
    {
      id: 'professionals',
      icon: User,
      label: 'Profissionais',
      summary: profSummary(),
      color: 'text-violet-600 bg-violet-50',
      action: () => onNavigate('professionals'),
    },
    {
      id: 'messages',
      icon: MessageCircle,
      label: 'Mensagens',
      summary: activeMessages > 0 ? `${activeMessages} ativas` : 'Nenhuma configurada',
      color: 'text-emerald-600 bg-emerald-50',
      action: () => onNavigate('messages'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(card => (
        <Card
          key={card.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={card.action}
        >
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{card.label}</p>
                  <p className="text-xs text-muted-foreground">{card.summary}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
