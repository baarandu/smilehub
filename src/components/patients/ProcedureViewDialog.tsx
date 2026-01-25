import { Calendar, MapPin, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Procedure } from '@/types/database';

interface ProcedureViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedure: Procedure | null;
  onEdit?: () => void;
}

export function ProcedureViewDialog({
  open,
  onOpenChange,
  procedure,
  onEdit,
}: ProcedureViewDialogProps) {
  if (!procedure) return null;

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusInfo = (status: string | null) => {
    switch (status) {
      case 'pending': return { label: 'Pendente', className: 'bg-amber-100 text-amber-700' };
      case 'in_progress': return { label: 'Em Progresso', className: 'bg-blue-100 text-blue-700' };
      case 'completed': return { label: 'Finalizado', className: 'bg-green-100 text-green-700' };
      default: return { label: 'Em Progresso', className: 'bg-blue-100 text-blue-700' };
    }
  };

  const parseDescription = (description: string) => {
    const parts = description.split('\n\nObs: ');
    const itemsPart = parts[0];
    const obsPart = parts.length > 1 ? parts[1] : (itemsPart.startsWith('Obs: ') ? itemsPart.replace('Obs: ', '') : null);

    const lines = itemsPart.split('\n');
    const structuredItems: { treatment: string; tooth: string; value: string }[] = [];
    const unstructuredLines: string[] = [];

    lines.forEach(line => {
      const cleanLine = line.trim().replace(/^•\s*/, '');
      if (!cleanLine) return;

      let sections = cleanLine.split(' | ');
      if (sections.length < 3) {
        sections = cleanLine.split(' - ');
      }

      if (sections.length >= 3) {
        structuredItems.push({
          treatment: sections[0].trim(),
          tooth: sections[1].trim(),
          value: sections.slice(2).join(' - ').trim()
        });
      } else if (!cleanLine.startsWith('Obs:')) {
        unstructuredLines.push(line);
      }
    });

    return { structuredItems, unstructuredLines, obsPart };
  };

  const statusInfo = getStatusInfo(procedure.status);
  const { structuredItems, unstructuredLines, obsPart } = procedure.description
    ? parseDescription(procedure.description)
    : { structuredItems: [], unstructuredLines: [], obsPart: null };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            Detalhes do Procedimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Date and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="font-medium text-foreground">{formatDate(procedure.date)}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Location */}
          {procedure.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{procedure.location}</span>
            </div>
          )}

          {/* Value */}
          {procedure.value && (
            <div className="bg-primary/5 rounded-lg p-3">
              <span className="text-sm text-muted-foreground">Valor</span>
              <p className="text-xl font-bold text-primary">{formatCurrency(procedure.value)}</p>
            </div>
          )}

          {/* Description / Details */}
          {procedure.description && (
            <div className="space-y-3">
              {/* Structured Items */}
              {structuredItems.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-3">Detalhamento</h4>
                  <div className="space-y-3">
                    {structuredItems.map((item, idx) => (
                      <div key={idx} className="border-b border-border pb-2 last:border-0 last:pb-0">
                        <p className="font-semibold text-foreground">{item.tooth}</p>
                        <p className="text-sm text-muted-foreground">{item.treatment}</p>
                        {item.value && (
                          <p className="text-sm font-medium text-primary mt-1">{item.value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unstructured Lines */}
              {structuredItems.length === 0 && unstructuredLines.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Descrição</h4>
                  {unstructuredLines.map((line, idx) => (
                    <p key={idx} className="text-sm text-foreground">{line}</p>
                  ))}
                </div>
              )}

              {/* Observations */}
              {obsPart && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h4 className="text-xs font-bold text-amber-700 uppercase mb-2">Observações</h4>
                  <p className="text-sm text-amber-900">{obsPart}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
          {onEdit && (
            <Button
              className="flex-1 bg-[#a03f3d] hover:bg-[#8b3634]"
              onClick={() => {
                onOpenChange(false);
                onEdit();
              }}
            >
              Editar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
