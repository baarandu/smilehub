import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useClinic } from '@/contexts/ClinicContext';
import { supabase } from '@/lib/supabase';
import { useCreateOrderFromBudget, useActiveProsthesisLabs } from '@/hooks/useProsthesis';
import { PROSTHESIS_TYPE_LABELS, PROSTHESIS_MATERIAL_LABELS } from '@/types/prosthesis';
import { getToothDisplayName, formatMoney } from '@/utils/budgetUtils';
import type { ProstheticBudgetItem } from '@/hooks/useProstheticBudgetItems';

interface SendToProsthesisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetItem: ProstheticBudgetItem | null;
  patientId: string;
}

interface DentistOption {
  id: string;
  full_name: string;
}

export function SendToProsthesisDialog({
  open,
  onOpenChange,
  budgetItem,
  patientId,
}: SendToProsthesisDialogProps) {
  const { clinicId } = useClinic();
  const { toast } = useToast();
  const createOrder = useCreateOrderFromBudget();
  const { data: labs = [] } = useActiveProsthesisLabs();

  const [dentists, setDentists] = useState<DentistOption[]>([]);
  const [dentistId, setDentistId] = useState('');
  const [labId, setLabId] = useState<string | null>(null);
  const [labCost, setLabCost] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');

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

  useEffect(() => {
    if (open) {
      setDentistId('');
      setLabId(null);
      setLabCost('');
      setEstimatedDelivery('');
    }
  }, [open]);

  if (!budgetItem) return null;

  const typeLabel = PROSTHESIS_TYPE_LABELS[budgetItem.prosthesisType] || budgetItem.prosthesisType;
  const materialLabel = budgetItem.material
    ? (PROSTHESIS_MATERIAL_LABELS[budgetItem.material.toLowerCase()] || budgetItem.material)
    : null;
  const toothName = getToothDisplayName(budgetItem.tooth.tooth, false);

  const handleSubmit = async () => {
    if (!dentistId) {
      toast({ title: 'Selecione o dentista', variant: 'destructive' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const toothNumbers = budgetItem.tooth.tooth
        ? [budgetItem.tooth.tooth]
        : [];

      await createOrder.mutateAsync({
        clinic_id: clinicId!,
        patient_id: patientId,
        dentist_id: dentistId,
        lab_id: labId || null,
        type: budgetItem.prosthesisType,
        material: budgetItem.material?.toLowerCase() || null,
        tooth_numbers: toothNumbers,
        lab_cost: labCost ? parseFloat(labCost.replace(',', '.')) : null,
        patient_price: budgetItem.value,
        estimated_delivery_date: estimatedDelivery || null,
        notes: `Vinculado ao orçamento - ${budgetItem.tooth.treatments.join(', ')}`,
        created_by: user?.id || null,
        budget_id: budgetItem.budgetId,
        budget_tooth_index: budgetItem.toothIndex,
      });

      toast({ title: 'Serviço protético criado com sucesso' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao criar serviço protético', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar para Prótese</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Read-only info from budget */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-teal-800 font-medium">Dados do Orçamento</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Dente:</span>
                <span className="ml-1 font-medium">{toothName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <Badge variant="secondary" className="ml-1">{typeLabel}</Badge>
              </div>
              {materialLabel && (
                <div>
                  <span className="text-muted-foreground">Material:</span>
                  <span className="ml-1 font-medium">{materialLabel}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Valor:</span>
                <span className="ml-1 font-medium text-teal-700">R$ {formatMoney(budgetItem.value)}</span>
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Dentista *</Label>
              <Select value={dentistId} onValueChange={setDentistId}>
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

            <div className="space-y-2">
              <Label>Laboratório</Label>
              <Select
                value={labId || 'none'}
                onValueChange={v => setLabId(v === 'none' ? null : v)}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Custo Laboratório (R$)</Label>
                <Input
                  placeholder="0,00"
                  value={labCost}
                  onChange={e => setLabCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Previsão Entrega</Label>
                <Input
                  type="date"
                  value={estimatedDelivery}
                  onChange={e => setEstimatedDelivery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createOrder.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {createOrder.isPending ? 'Criando...' : 'Enviar para Prótese'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
