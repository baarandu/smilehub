import { Calendar, MapPin, FileText, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Procedure } from '@/types/database';
import type { BudgetLink } from '@/services/procedures';
import { useBudgetPlanItems } from '@/hooks/useBudgetProcedures';

interface ProcedureViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedure: Procedure | null;
  patientId: string;
  onEdit?: () => void;
}

export function ProcedureViewDialog({
  open,
  onOpenChange,
  procedure,
  patientId,
  onEdit,
}: ProcedureViewDialogProps) {
  const { planItems } = useBudgetPlanItems(patientId);

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

  const budgetLinks = (procedure as any).budget_links as BudgetLink[] | null;
  const statusInfo = getStatusInfo(procedure.status);

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

          {/* Linked Budget Items */}
          {budgetLinks && budgetLinks.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <h4 className="text-xs font-bold text-purple-700 uppercase mb-2 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                Itens do Orçamento Vinculados
              </h4>
              <div className="space-y-2">
                {budgetLinks.map((link, idx) => {
                  const planItem = planItems.find(
                    (item) => item.budgetId === link.budgetId && item.toothIndex === link.toothIndex
                  );
                  return (
                    <div key={idx} className="text-sm text-purple-900">
                      {planItem ? (
                        <p>{planItem.label}</p>
                      ) : (
                        <p>Item {idx + 1}</p>
                      )}
                    </div>
                  );
                })}
              </div>
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
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Descrição do Procedimento</h4>
              <p className="text-sm text-foreground whitespace-pre-line">{procedure.description}</p>
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
