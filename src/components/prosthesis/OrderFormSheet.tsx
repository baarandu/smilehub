import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';
import { useCreateOrder, useUpdateOrder, useActiveProsthesisLabs } from '@/hooks/useProsthesis';
import { usePatients } from '@/hooks/usePatients';
import type { ProsthesisOrder, ProsthesisOrderFormData } from '@/types/prosthesis';
import { PROSTHESIS_TYPE_LABELS, PROSTHESIS_MATERIAL_LABELS } from '@/types/prosthesis';
import { useProstheticBudgetItems, type ProstheticBudgetItem } from '@/hooks/useProstheticBudgetItems';

interface OrderFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: ProsthesisOrder | null;
  onLabsClick: () => void;
}

interface DentistOption {
  id: string;
  full_name: string;
}

const emptyForm: ProsthesisOrderFormData = {
  patientId: '',
  dentistId: '',
  labId: null,
  type: '',
  material: '',
  toothNumbers: '',
  color: '',
  shadeDetails: '',
  cementationType: '',
  labCost: '',
  patientPrice: '',
  estimatedDeliveryDate: '',
  notes: '',
  specialInstructions: '',
};

export function OrderFormSheet({ open, onOpenChange, order, onLabsClick }: OrderFormSheetProps) {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const { data: patients = [] } = usePatients();
  const { data: labs = [] } = useActiveProsthesisLabs();

  const [form, setForm] = useState<ProsthesisOrderFormData>(emptyForm);
  const [materialCustom, setMaterialCustom] = useState('');
  const [dentists, setDentists] = useState<DentistOption[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [budgetLink, setBudgetLink] = useState<{ budgetId: string; toothIndex: number } | null>(null);

  const isEditing = !!order;

  // Prosthetic budget items for selected patient
  const prostheticItems = useProstheticBudgetItems(form.patientId || undefined);

  // Load dentists for the clinic
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

  // Populate form when editing
  useEffect(() => {
    if (open && order) {
      const knownKeys = Object.keys(PROSTHESIS_MATERIAL_LABELS);
      const storedMaterial = order.material || '';
      const isCustom = storedMaterial && !knownKeys.includes(storedMaterial) && storedMaterial !== 'none';
      setForm({
        patientId: order.patient_id,
        dentistId: order.dentist_id,
        labId: order.lab_id,
        type: order.type,
        material: isCustom ? 'outro' : storedMaterial,
        toothNumbers: order.tooth_numbers?.join(', ') || '',
        color: order.color || '',
        shadeDetails: order.shade_details || '',
        cementationType: order.cementation_type || '',
        labCost: order.lab_cost != null ? Number(order.lab_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
        patientPrice: order.patient_price != null ? Number(order.patient_price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
        estimatedDeliveryDate: order.estimated_delivery_date || '',
        notes: order.notes || '',
        specialInstructions: order.special_instructions || '',
      });
      setMaterialCustom(isCustom ? storedMaterial : '');
      setSelectedPatientName(order.patient_name || '');
    } else if (open) {
      setForm(emptyForm);
      setMaterialCustom('');
      setSelectedPatientName('');
      setPatientSearch('');
      setBudgetLink(null);
    }
  }, [open, order]);

  useEffect(() => {
    if (showPatientList) {
      const handler = () => setShowPatientList(false);
      document.addEventListener('click', handler);
      return () => document.removeEventListener('click', handler);
    }
  }, [showPatientList]);

  const filteredPatients = patientSearch.length >= 2
    ? patients.filter((p: any) => p.name.toLowerCase().includes(patientSearch.toLowerCase())).slice(0, 10)
    : [];

  const handleSelectPatient = (patient: { id: string; name: string }) => {
    setForm(prev => ({ ...prev, patientId: patient.id }));
    setSelectedPatientName(patient.name);
    setPatientSearch('');
    setShowPatientList(false);
  };

  const parseAmount = (val: string): number | null => {
    if (!val) return null;
    const cleaned = val.replace(/[^\d,.-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const handleSubmit = async () => {
    if (!form.patientId || !form.dentistId || !form.type) {
      toast({ title: 'Preencha paciente, dentista e tipo', variant: 'destructive' });
      return;
    }

    const toothArr = form.toothNumbers
      ? form.toothNumbers.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    const resolvedMaterial = form.material === 'outro' ? (materialCustom || null) : (form.material || null);

    try {
      if (isEditing && order) {
        await updateOrder.mutateAsync({
          id: order.id,
          updates: {
            patient_id: form.patientId,
            dentist_id: form.dentistId,
            lab_id: form.labId || null,
            type: form.type,
            material: resolvedMaterial,
            tooth_numbers: toothArr,
            color: form.color || null,
            shade_details: form.shadeDetails || null,
            cementation_type: form.cementationType || null,
            lab_cost: parseAmount(form.labCost),
            patient_price: parseAmount(form.patientPrice),
            estimated_delivery_date: form.estimatedDeliveryDate || null,
            notes: form.notes || null,
            special_instructions: form.specialInstructions || null,
          },
        });
        toast({ title: 'Ordem atualizada com sucesso' });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await createOrder.mutateAsync({
          clinic_id: clinicId!,
          patient_id: form.patientId,
          dentist_id: form.dentistId,
          lab_id: form.labId || null,
          type: form.type,
          material: form.material || null,
          tooth_numbers: toothArr,
          color: form.color || null,
          shade_details: form.shadeDetails || null,
          cementation_type: form.cementationType || null,
          lab_cost: parseAmount(form.labCost),
          patient_price: parseAmount(form.patientPrice),
          estimated_delivery_date: form.estimatedDeliveryDate || null,
          notes: form.notes || null,
          special_instructions: form.specialInstructions || null,
          created_by: user?.id || null,
          budget_id: budgetLink?.budgetId || null,
          budget_tooth_index: budgetLink?.toothIndex ?? null,
        });
        toast({ title: 'Ordem criada com sucesso' });
      }
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao salvar ordem', variant: 'destructive' });
    }
  };

  const formatCurrency = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    const cents = parseInt(digits, 10);
    return (cents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleCurrencyChange = (field: 'labCost' | 'patientPrice', raw: string) => {
    setForm(prev => ({ ...prev, [field]: formatCurrency(raw) }));
  };

  const updateField = (field: keyof ProsthesisOrderFormData, value: string | null) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar Serviço' : 'Novo Serviço Protético'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Atualize os dados do serviço' : 'Preencha os dados para criar um novo serviço'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-160px)] mt-4">
          <div className="space-y-4 pr-4">
            {/* Patient */}
            <div className="space-y-2">
              <Label>Paciente *</Label>
              {form.patientId ? (
                <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg">
                  <span className="flex-1 text-sm font-medium">{selectedPatientName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      updateField('patientId', '');
                      setSelectedPatientName('');
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <Input
                    placeholder="Buscar paciente..."
                    value={patientSearch}
                    onChange={e => {
                      setPatientSearch(e.target.value);
                      setShowPatientList(e.target.value.length >= 2);
                    }}
                    onFocus={() => patientSearch.length >= 2 && setShowPatientList(true)}
                  />
                  {showPatientList && filteredPatients.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredPatients.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                          onClick={() => handleSelectPatient(p)}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dentist */}
            <div className="space-y-2">
              <Label>Dentista *</Label>
              <Select value={form.dentistId} onValueChange={v => updateField('dentistId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dentista" />
                </SelectTrigger>
                <SelectContent>
                  {dentists.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lab */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Laboratório</Label>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onLabsClick}>
                  Gerenciar
                </Button>
              </div>
              <Select
                value={form.labId || 'none'}
                onValueChange={v => updateField('labId', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o laboratório" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {labs.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type + Material */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={v => updateField('type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROSTHESIS_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Material</Label>
                <Select
                  value={form.material || 'none'}
                  onValueChange={v => {
                    updateField('material', v === 'none' ? '' : v);
                    if (v !== 'outro') setMaterialCustom('');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {Object.entries(PROSTHESIS_MATERIAL_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.material === 'outro' && (
                  <Input
                    placeholder="Descreva o material..."
                    value={materialCustom}
                    onChange={e => setMaterialCustom(e.target.value)}
                    className="mt-1.5"
                  />
                )}
              </div>
            </div>

            {/* Teeth */}
            <div className="space-y-2">
              <Label>Dentes</Label>
              <Input
                placeholder="Ex: 11, 12, 21"
                value={form.toothNumbers}
                onChange={e => updateField('toothNumbers', e.target.value)}
              />
            </div>

            {/* Budget Link (only for new orders) */}
            {!isEditing && form.patientId && prostheticItems.itemsWithoutOrder.length > 0 && (
              <div className="space-y-2">
                <Label>Vincular ao Orçamento</Label>
                <Select
                  value={budgetLink ? `${budgetLink.budgetId}:${budgetLink.toothIndex}` : 'none'}
                  onValueChange={v => {
                    if (v === 'none') {
                      setBudgetLink(null);
                      return;
                    }
                    const [bId, tIdx] = v.split(':');
                    const item = prostheticItems.itemsWithoutOrder.find(
                      i => i.budgetId === bId && i.toothIndex === parseInt(tIdx)
                    );
                    if (item) {
                      setBudgetLink({ budgetId: item.budgetId, toothIndex: item.toothIndex });
                      // Auto-fill fields from budget item
                      const budgetMat = item.material?.toLowerCase() || '';
                      const knownKeys = Object.keys(PROSTHESIS_MATERIAL_LABELS);
                      const isBudgetCustom = budgetMat && !knownKeys.includes(budgetMat);
                      setForm(prev => ({
                        ...prev,
                        type: item.prosthesisType || prev.type,
                        material: isBudgetCustom ? 'outro' : (budgetMat || prev.material),
                        toothNumbers: item.tooth.tooth || prev.toothNumbers,
                        patientPrice: item.value ? Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : prev.patientPrice,
                      }));
                      if (isBudgetCustom) setMaterialCustom(budgetMat);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar item do orçamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {prostheticItems.itemsWithoutOrder.map(item => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Color */}
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input
                placeholder="Ex: A2, B1, Bleach"
                value={form.color}
                onChange={e => updateField('color', e.target.value)}
              />
            </div>

            {/* Shade details */}
            <div className="space-y-2">
              <Label>Detalhes da Cor</Label>
              <Input
                placeholder="Observações detalhadas de cor"
                value={form.shadeDetails}
                onChange={e => updateField('shadeDetails', e.target.value)}
              />
            </div>

            {/* Financial */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Custo Laboratório (R$)</Label>
                <Input
                  inputMode="numeric"
                  placeholder="0,00"
                  value={form.labCost}
                  onChange={e => handleCurrencyChange('labCost', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Paciente (R$)</Label>
                <Input
                  inputMode="numeric"
                  placeholder="0,00"
                  value={form.patientPrice}
                  onChange={e => handleCurrencyChange('patientPrice', e.target.value)}
                />
              </div>
            </div>

            {/* Delivery date */}
            <div className="space-y-2">
              <Label>Previsão de Entrega</Label>
              <Input
                type="date"
                value={form.estimatedDeliveryDate}
                onChange={e => updateField('estimatedDeliveryDate', e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações gerais..."
                value={form.notes}
                onChange={e => updateField('notes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Special instructions */}
            <div className="space-y-2">
              <Label>Instruções Especiais</Label>
              <Textarea
                placeholder="Instruções especiais para o laboratório..."
                value={form.specialInstructions}
                onChange={e => updateField('specialInstructions', e.target.value)}
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2 pb-4">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createOrder.isPending || updateOrder.isPending}
              >
                {createOrder.isPending || updateOrder.isPending
                  ? 'Salvando...'
                  : isEditing ? 'Atualizar' : 'Criar Serviço'}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
