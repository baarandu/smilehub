import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Users,
  Calendar,
  FileText,
  DollarSign,
  Package,
  Bell,
  Plus,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateVariant =
  | 'patients'
  | 'appointments'
  | 'documents'
  | 'financial'
  | 'inventory'
  | 'alerts'
  | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: ReactNode;
  compact?: boolean;
}

const VARIANT_CONFIG: Record<EmptyStateVariant, {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  color: string;
  bgColor: string;
}> = {
  patients: {
    icon: Users,
    title: 'Nenhum paciente cadastrado',
    description: 'Comece cadastrando seu primeiro paciente para organizar sua clínica.',
    actionLabel: 'Cadastrar paciente',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  appointments: {
    icon: Calendar,
    title: 'Nenhum agendamento',
    description: 'Sua agenda está livre. Que tal agendar uma consulta?',
    actionLabel: 'Nova consulta',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  documents: {
    icon: FileText,
    title: 'Nenhum documento',
    description: 'Os documentos gerados aparecerão aqui.',
    actionLabel: 'Criar documento',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  financial: {
    icon: DollarSign,
    title: 'Nenhum registro financeiro',
    description: 'Seus pagamentos e recebimentos aparecerão aqui.',
    actionLabel: 'Registrar pagamento',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  inventory: {
    icon: Package,
    title: 'Estoque vazio',
    description: 'Adicione materiais para controlar seu estoque.',
    actionLabel: 'Adicionar material',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  alerts: {
    icon: Bell,
    title: 'Nenhum alerta',
    description: 'Você está em dia! Não há alertas pendentes.',
    actionLabel: 'Ver configurações',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  generic: {
    icon: Sparkles,
    title: 'Nada aqui ainda',
    description: 'Este conteúdo aparecerá quando houver dados.',
    actionLabel: 'Começar',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
};

export function EmptyState({
  variant = 'generic',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
  compact = false,
}: EmptyStateProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'rounded-2xl flex items-center justify-center mb-4',
          config.bgColor,
          compact ? 'w-14 h-14' : 'w-20 h-20'
        )}
      >
        {icon || (
          <Icon
            className={cn(
              config.color,
              compact ? 'w-7 h-7' : 'w-10 h-10'
            )}
          />
        )}
      </div>

      {/* Title */}
      <h3
        className={cn(
          'font-semibold text-gray-900',
          compact ? 'text-base mb-1' : 'text-lg mb-2'
        )}
      >
        {title || config.title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'text-muted-foreground max-w-sm',
          compact ? 'text-sm mb-4' : 'text-base mb-6'
        )}
      >
        {description || config.description}
      </p>

      {/* Actions */}
      {(onAction || onSecondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {onAction && (
            <Button
              onClick={onAction}
              size={compact ? 'sm' : 'default'}
              className="bg-[#a03f3d] hover:bg-[#8b3634]"
            >
              <Plus className="w-4 h-4 mr-2" />
              {actionLabel || config.actionLabel}
            </Button>
          )}
          {onSecondaryAction && secondaryActionLabel && (
            <Button
              variant="outline"
              onClick={onSecondaryAction}
              size={compact ? 'sm' : 'default'}
            >
              {secondaryActionLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Guided Card for setup pages
interface GuidedCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  children: ReactNode;
  helperText?: string;
}

export function GuidedCard({
  title,
  description,
  icon: Icon,
  children,
  helperText,
}: GuidedCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-white border-b">
        <div className="w-10 h-10 rounded-xl bg-[#a03f3d]/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-[#a03f3d]" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">{children}</div>

      {/* Helper */}
      {helperText && (
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <span className="font-medium text-amber-700">Dica:</span> {helperText}
          </p>
        </div>
      )}
    </div>
  );
}

// Section Header for configuration pages
interface SectionHeaderProps {
  title: string;
  description: string;
  icon?: React.ElementType;
}

export function SectionHeader({ title, description, icon: Icon }: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-6">
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-[#a03f3d]/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-[#a03f3d]" />
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
