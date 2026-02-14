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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ArrowRight, Trash2, FileText, Save, RotateCw, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ProsthesisOrder } from '@/types/prosthesis';
import { PROSTHESIS_TYPE_LABELS, PROSTHESIS_MATERIAL_LABELS } from '@/types/prosthesis';
import { getStatusLabel, getNextStatus, getPreviousStatus } from '@/utils/prosthesis';
import { useUpdateOrder, useDeleteOrder, useActiveProsthesisLabs, useOrderShipments } from '@/hooks/useProsthesis';
import { StatusTimeline } from './StatusTimeline';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { budgetsService } from '@/services/budgets';
import { getToothDisplayName, formatMoney, formatDisplayDate, type ToothEntry } from '@/utils/budgetUtils';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';

interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProsthesisOrder | null;
  onEdit: (order: ProsthesisOrder) => void;
  onAdvanceStatus: (order: ProsthesisOrder) => void;
  onRetreatStatus: (order: ProsthesisOrder) => void;
  onResendToLab?: (order: ProsthesisOrder) => void;
}

interface DentistOption {
  id: string;
  full_name: string;
}

export function OrderDetailDialog({
  open,
  onOpenChange,
  order,
  onEdit,
  onAdvanceStatus,
  onRetreatStatus,
  onResendToLab,
}: OrderDetailDialogProps) {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const { data: labs = [] } = useActiveProsthesisLabs();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dentists, setDentists] = useState<DentistOption[]>([]);

  // Editable fields
  const [dentistId, setDentistId] = useState('');
  const [labId, setLabId] = useState<string | null>(null);
  const [toothNumbers, setToothNumbers] = useState('');
  const [color, setColor] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [labCost, setLabCost] = useState('');
  const [patientPrice, setPatientPrice] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load dentists
  useEffect(() => {
    if (!clinicId || !open) return;
    const loadDentists = async () => {
      const { data, error } = await (supabase
        .from('clinic_users') as any)
        .select('user_id, role')
        .eq('clinic_id', clinicId);
      if (error || !data) return;
      const dentistUsers = (data as any[]).filter((d: any) =>
        ['admin', 'dentist'].includes(d.role)
      );
      if (dentistUsers.length === 0) { setDentists([]); return; }
      const userIds = dentistUsers.map((d: any) => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name; });
      setDentists(
        dentistUsers.map((d: any) => ({
          id: d.user_id,
          full_name: nameMap[d.user_id] || d.user_id,
        }))
      );
    };
    loadDentists();
  }, [clinicId, open]);

  // Sync form state from order
  useEffect(() => {
    if (open && order) {
      setDentistId(order.dentist_id || '');
      setLabId(order.lab_id);
      setToothNumbers(order.tooth_numbers?.join(', ') || '');
      setColor(order.color || '');
      setEstimatedDeliveryDate(order.estimated_delivery_date || '');
      setNotes(order.notes || '');
      setSpecialInstructions(order.special_instructions || '');
      setLabCost(order.lab_cost != null ? String(order.lab_cost) : '');
      setPatientPrice(order.patient_price != null ? String(order.patient_price) : '');
      setHasChanges(false);
    }
  }, [open, order]);

  // Fetch linked budget if exists
  const budgetQuery = useQuery({
    queryKey: ['budget', order?.budget_id],
    queryFn: () => budgetsService.getById(order!.budget_id!),
    enabled: !!order?.budget_id,
  });

  // Fetch shipments
  const { data: shipments = [] } = useOrderShipments(order?.id ?? null);

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

  const parseAmount = (val: string): number | null => {
    if (!val) return null;
    const cleaned = val.replace(/[^\d,.-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const handleSave = async () => {
    const toothArr = toothNumbers
      ? toothNumbers.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    try {
      await updateOrder.mutateAsync({
        id: order.id,
        updates: {
          dentist_id: dentistId,
          lab_id: labId || null,
          tooth_numbers: toothArr,
          color: color || null,
          estimated_delivery_date: estimatedDeliveryDate || null,
          notes: notes || null,
          special_instructions: specialInstructions || null,
          lab_cost: parseAmount(labCost),
          patient_price: parseAmount(patientPrice),
        },
      });
      toast({ title: 'Alterações salvas' });
      setHasChanges(false);
    } catch {
      toast({ title: 'Erro ao salvar alterações', variant: 'destructive' });
    }
  };

  const markChanged = () => { if (!hasChanges) setHasChanges(true); };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => {
        if (!v && hasChanges) {
          // Auto-save on close if there are changes
          handleSave();
        }
        onOpenChange(v);
      }}>
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
              {hasChanges && (
                <Button
                  size="sm"
                  className="bg-[#a03f3d] hover:bg-[#8b3634] text-white mr-6"
                  onClick={handleSave}
                  disabled={updateOrder.isPending}
                >
                  <Save className="w-4 h-4 mr-1" />
                  {updateOrder.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-140px)]">
            <div className="px-6 pb-6 space-y-5">
              {/* Editable Info Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Dentista</Label>
                  <Select value={dentistId} onValueChange={v => { setDentistId(v); markChanged(); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {dentists.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Laboratório</Label>
                  <Select value={labId || 'none'} onValueChange={v => { setLabId(v === 'none' ? null : v); markChanged(); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {labs.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Dentes</Label>
                  <Input
                    className="h-9"
                    placeholder="Ex: 11, 12, 21"
                    value={toothNumbers}
                    onChange={e => { setToothNumbers(e.target.value); markChanged(); }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cor</Label>
                  <Input
                    className="h-9"
                    placeholder="Ex: A2, B1"
                    value={color}
                    onChange={e => { setColor(e.target.value); markChanged(); }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Previsão de Entrega</Label>
                  <Input
                    className="h-9"
                    type="date"
                    value={estimatedDeliveryDate}
                    onChange={e => { setEstimatedDeliveryDate(e.target.value); markChanged(); }}
                  />
                </div>
              </div>

              <Separator />

              {/* Observações */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Observações</Label>
                <Textarea
                  placeholder="Observações gerais..."
                  value={notes}
                  onChange={e => { setNotes(e.target.value); markChanged(); }}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Instruções Especiais</Label>
                <Textarea
                  placeholder="Instruções para o laboratório..."
                  value={specialInstructions}
                  onChange={e => { setSpecialInstructions(e.target.value); markChanged(); }}
                  rows={2}
                />
              </div>

              {/* Financial */}
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Financeiro</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Custo Lab (R$)</Label>
                    <Input
                      className="h-9"
                      placeholder="0,00"
                      value={labCost}
                      onChange={e => { setLabCost(e.target.value); markChanged(); }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Valor Paciente (R$)</Label>
                    <Input
                      className="h-9"
                      placeholder="0,00"
                      value={patientPrice}
                      onChange={e => { setPatientPrice(e.target.value); markChanged(); }}
                    />
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

              {/* Shipments Timeline */}
              {shipments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-orange-600" />
                      Envios ({shipments.length})
                    </h4>
                    <div className="space-y-2">
                      {shipments.map(s => (
                        <div key={s.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-orange-800">{s.shipment_number}o Envio</span>
                            {s.returned_to_clinic_at ? (
                              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Retornou</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">No Lab</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-1.5 text-xs text-muted-foreground">
                            <div>
                              <span className="text-orange-600">Enviado:</span>{' '}
                              {new Date(s.sent_to_lab_at).toLocaleDateString('pt-BR')}
                            </div>
                            {s.returned_to_clinic_at && (
                              <div>
                                <span className="text-green-600">Retorno:</span>{' '}
                                {new Date(s.returned_to_clinic_at).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                          {s.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Actions */}
              <Separator />
              <div className="flex flex-wrap gap-2">
                {prevStatus && order.status !== 'in_clinic' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetreatStatus(order)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    {getStatusLabel(prevStatus)}
                  </Button>
                )}
                {order.status === 'in_clinic' && onResendToLab && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onResendToLab(order)}
                  >
                    <RotateCw className="w-4 h-4 mr-1" />
                    Reenviar ao Laboratório
                  </Button>
                )}
                {nextStatus ? (
                  <Button
                    size="sm"
                    onClick={() => onAdvanceStatus(order)}
                  >
                    {getStatusLabel(nextStatus)}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : null}
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
