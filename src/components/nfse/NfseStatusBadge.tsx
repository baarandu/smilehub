import { Badge } from '@/components/ui/badge';
import { FileCheck2, FileX2, FileWarning } from 'lucide-react';
import type { NfseStatus } from '@/types/nfseDocument';

interface Props {
  status: NfseStatus;
  invoiceNumber?: string;
  className?: string;
}

const CONFIG: Record<NfseStatus, { label: string; cls: string; Icon: typeof FileCheck2 }> = {
  issued: {
    label: 'Emitida',
    cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    Icon: FileCheck2,
  },
  canceled: {
    label: 'Cancelada',
    cls: 'bg-red-100 text-red-700 hover:bg-red-100',
    Icon: FileX2,
  },
  substituted: {
    label: 'Substituída',
    cls: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    Icon: FileWarning,
  },
};

export function NfseStatusBadge({ status, invoiceNumber, className }: Props) {
  const cfg = CONFIG[status];
  const Icon = cfg.Icon;
  return (
    <Badge className={`text-[10px] h-5 gap-1 ${cfg.cls} ${className || ''}`}>
      <Icon className="w-3 h-3" />
      NFS-e {invoiceNumber ? `#${invoiceNumber}` : cfg.label}
    </Badge>
  );
}
