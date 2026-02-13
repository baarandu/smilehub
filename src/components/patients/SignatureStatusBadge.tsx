import { Badge } from '@/components/ui/badge';
import type { SignatureStatus, SignatoryStatus } from '@/types/digitalSignature';

const STATUS_CONFIG: Record<SignatureStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  PENDING_UPLOAD: { label: 'Preparando', variant: 'secondary' },
  DRAFT: { label: 'Rascunho', variant: 'secondary' },
  PROCESSING: { label: 'Processando', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  SENT: { label: 'Aguardando', variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  SEALING: { label: 'Finalizando', variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  COMPLETED: { label: 'Assinado', variant: 'default', className: 'bg-green-100 text-green-800 border-green-300' },
  EXPIRED: { label: 'Expirado', variant: 'destructive' },
  VOIDED: { label: 'Cancelado', variant: 'destructive' },
  ERROR: { label: 'Erro', variant: 'destructive' },
};

const SIGNATORY_STATUS_CONFIG: Record<SignatoryStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'text-gray-500' },
  WAITING_TURN: { label: 'Aguardando vez', className: 'text-yellow-600' },
  VIEWED: { label: 'Visualizado', className: 'text-blue-600' },
  SIGNED: { label: 'Assinado', className: 'text-green-600' },
  REJECTED: { label: 'Rejeitado', className: 'text-red-600' },
};

interface SignatureStatusBadgeProps {
  status: SignatureStatus;
}

export function SignatureStatusBadge({ status }: SignatureStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.ERROR;

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

interface SignatoryStatusLabelProps {
  status: SignatoryStatus | null;
  label: string;
}

export function SignatoryStatusLabel({ status, label }: SignatoryStatusLabelProps) {
  if (!status) return null;
  const config = SIGNATORY_STATUS_CONFIG[status] || SIGNATORY_STATUS_CONFIG.PENDING;

  return (
    <span className={`text-xs ${config.className}`}>
      {label}: {config.label}
    </span>
  );
}
