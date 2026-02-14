import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ArrowRight, Pencil, Trash2, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ProsthesisOrder } from '@/types/prosthesis';
import { PROSTHESIS_TYPE_LABELS, PROSTHESIS_MATERIAL_LABELS } from '@/types/prosthesis';
import { getStatusLabel, getNextStatus, getPreviousStatus } from '@/utils/prosthesis';
import { useUpdateOrder, useDeleteOrder } from '@/hooks/useProsthesis';
import { StatusTimeline } from './StatusTimeline';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { budgetsService } from '@/services/budgets';
import { getToothDisplayName, formatMoney, formatDisplayDate, type ToothEntry } from '@/utils/budgetUtils';

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProsthesisOrder | null;
  onEdit: (order: ProsthesisOrder) => void;
  onAdvanceStatus: (order: ProsthesisOrder) => void;
  onRetreatStatus: (order: ProsthesisOrder) => void;
}

export function OrderDetailDialog({
  open,
  onOpenChange,
  order,
  onEdit,
  onAdvanceStatus,
  onRetreatStatus,
}: OrderDetailDialogProps) {
  const { toast } = useToast();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch linked budget if exists
  const budgetQuery = useQuery({
    queryKey: ['budget', order?.budget_id],
    queryFn: () => budgetsService.getById(order!.budget_id!),
    enabled: !!order?.budget_id,
  });

  if (!order) return null;

  const nextStatus = getNextStatus(order.status);
  const prevStatus = getPreviousStatus(order.status);


  // Parse linked budget item info
  let linkedBudgetInfo: { toothName: string; treatments: string; value: string; date: string } | null = null;
  if (order.budget_id && order.budget_tooth_index != null && budgetQuery.data) {
    try {
      const parsed = JSON.parse(budgetQuery.data.notes || '{}');
      const teeth = parsed.teeth as ToothEntry[];
      if (teeth && teeth[order.budget_tooth_index]) {
        const tooth = teeth[order.budget_tooth_index];
        const itemValue = Object.values(tooth.values).reduce(
          (sum, val) => sum + (parseInt(val as string) || 0) / 100, 0
        );
        linkedBudgetInfo = {
          toothName: getToothDisplayName(tooth.tooth, false),
          treatments: tooth.treatments.join(', '),
          value: formatMoney(itemValue),
          date: formatDisplayDate(budgetQuery.data.date),
        };
      }
    } catch { /* ignore parse errors */ }
  }

  const handleDelete = async () => {
    try {
      await deleteOrder.mutateAsync(order.id);
      toast({ title: 'Ordem excluída' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao excluir ordem', variant: 'destructive' });
    }
    setShowDeleteConfirm(false);
  };

  const formatCurrency = (val: number | null) =>
    val != null ? `R$ ${val.toFixed(2).replace('.', ',')}` : '—';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-lg">{order.patient_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{getStatusLabel(order.status)}</Badge>
                  <Badge variant="outline">{PROSTHESIS_TYPE_LABELS[order.type] || order.type}</Badge>
                  {order.material && (
                    <Badge variant="outline">{PROSTHESIS_MATERIAL_LABELS[order.material] || order.material}</Badge>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                className="bg-[#a03f3d] hover:bg-[#8b3634] text-white mr-6"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(order);
                }}
              >
                <Pencil className="w-4 h-4 mr-1" />
                Editar
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-140px)]">
            <div className="px-6 pb-6 space-y-5">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Dentista</p>
                  <p className="font-medium">{order.dentist_name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Laboratório</p>
                  <p className="font-medium">{order.lab_name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Dentes</p>
                  <p className="font-medium">
                    {order.tooth_numbers?.length > 0 ? order.tooth_numbers.join(', ') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cor</p>
                  <p className="font-medium">{order.color || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Previsão de Entrega</p>
                  <p className="font-medium">
                    {order.estimated_delivery_date
                      ? new Date(order.estimated_delivery_date + 'T00:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </p>
                </div>
              </div>

              {(order.notes || order.special_instructions) && (
                <>
                  <Separator />
                  {order.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm">{order.notes}</p>
                    </div>
                  )}
                  {order.special_instructions && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Instruções Especiais</p>
                      <p className="text-sm">{order.special_instructions}</p>
                    </div>
                  )}
                </>
              )}

              {/* Financial */}
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Financeiro</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Custo Lab</p>
                    <p className="font-semibold text-sm">{formatCurrency(order.lab_cost)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Valor Paciente</p>
                    <p className="font-semibold text-sm">{formatCurrency(order.patient_price)}</p>
                  </div>
                </div>
              </div>

              {/* Linked Budget */}
              {linkedBudgetInfo && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" />
                      Orçamento Vinculado
                    </h4>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-purple-600 text-xs">Dente</span>
                          <p className="font-medium">{linkedBudgetInfo.toothName}</p>
                        </div>
                        <div>
                          <span className="text-purple-600 text-xs">Tratamentos</span>
                          <p className="font-medium">{linkedBudgetInfo.treatments}</p>
                        </div>
                        <div>
                          <span className="text-purple-600 text-xs">Valor</span>
                          <p className="font-medium">R$ {linkedBudgetInfo.value}</p>
                        </div>
                        <div>
                          <span className="text-purple-600 text-xs">Data</span>
                          <p className="font-medium">{linkedBudgetInfo.date}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Timeline */}
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Histórico</h4>
                <StatusTimeline orderId={order.id} />
              </div>

              {/* Actions */}
              <Separator />
              <div className="flex flex-wrap gap-2">
                {prevStatus && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetreatStatus(order)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    {getStatusLabel(prevStatus)}
                  </Button>
                )}
                {nextStatus && (
                  <Button
                    size="sm"
                    onClick={() => onAdvanceStatus(order)}
                  >
                    {getStatusLabel(nextStatus)}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ordem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todo o histórico será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
