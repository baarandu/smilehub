import { useState, useEffect } from 'react';
import { Calendar, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useCreateProcedure, useUpdateProcedure, useDeleteProcedure } from '@/hooks/useProcedures';
import { locationsService, type Location } from '@/services/locations';
import { budgetsService } from '@/services/budgets';
import { toast } from 'sonner';
import { getToothDisplayName, type ToothEntry } from '@/utils/budgetUtils';
import type { Procedure } from '@/types/database';

interface NewProcedureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  locations: Location[];
  procedure?: Procedure | null;
}

interface ApprovedItemOption {
  id: string;
  label: string;
  value: number;
  treatment: string;
  tooth: string;
  budgetId: string;
}

export function NewProcedureDialog({
  open,
  onOpenChange,
  patientId,
  locations,
  procedure,
}: NewProcedureDialogProps) {
  const createProcedure = useCreateProcedure();
  const updateProcedure = useUpdateProcedure();
  const deleteProcedure = useDeleteProcedure();

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    location: '',
    value: '',
    paymentMethod: '',
    installments: '1',
  });

  const [observations, setObservations] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Budget Integration State
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [approvedItems, setApprovedItems] = useState<ApprovedItemOption[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [finalizedItemIds, setFinalizedItemIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadApprovedItems();

      if (procedure) {
        // Edit mode
        setForm({
          date: procedure.date,
          location: procedure.location || '',
          value: procedure.value ? procedure.value.toFixed(2).replace('.', ',') : '',
          paymentMethod: procedure.payment_method || '',
          installments: procedure.installments?.toString() || '1',
        });

        // Extract observations from description if possible
        // Note: We can't easily reverse-engineer the items selection from the string description,
        // so in edit mode we treat the whole description as "observations" or static text.
        // For simplicity, we put the full description in observations for editing.
        setObservations(procedure.description || '');
        setSelectedItemIds([]); // Clear selection on edit to avoid overwriting, or maybe we shouldn't allow selecting items on edit?
        // User decision: "New Procedure" implies creation. Edit might just be manual.
        // We will allow adding MORE items to an existing procedure if desired, 
        // but typically edit handles the fields manually.

      } else {
        // Create mode
        setForm({
          date: new Date().toISOString().split('T')[0],
          location: '',
          value: '',
          paymentMethod: '',
          installments: '1',
        });
        setObservations('');
        setSelectedItemIds([]);
      }
    }
  }, [procedure?.id, open]);

  const loadApprovedItems = async () => {
    setLoadingBudgets(true);
    try {
      const budgets = await budgetsService.getByPatient(patientId);
      const options: ApprovedItemOption[] = [];

      budgets.forEach(budget => {
        if (!budget.notes) return;
        try {
          const notesData = JSON.parse(budget.notes);
          if (notesData.teeth && Array.isArray(notesData.teeth)) {
            const teeth: ToothEntry[] = notesData.teeth;

            teeth.forEach((toothEntry, toothIndex) => {
              if (toothEntry.status === 'paid') {
                toothEntry.treatments.forEach((treatment, treatmentIndex) => {
                  const valStr = toothEntry.values[treatment] || '0';
                  const val = parseInt(valStr) / 100;

                  // Generate a unique ID for selection
                  const uniqueId = `${budget.id}_${toothIndex}_${treatmentIndex}`;

                  options.push({
                    id: uniqueId,
                    label: `${treatment} - ${getToothDisplayName(toothEntry.tooth)}`,
                    value: val,
                    treatment: treatment,
                    tooth: toothEntry.tooth,
                    budgetId: budget.id
                  });
                });
              }
            });
          }
        } catch (e) {
          console.error('Error parsing budget notes', e);
        }
      });

      setApprovedItems(options);
    } catch (error) {
      console.error('Error loading budgets', error);
      toast.error('Erro ao carregar itens aprovados');
    } finally {
      setLoadingBudgets(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const isSelected = prev.includes(itemId);
      let newSelection = isSelected
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];

      updateFormFromSelection(newSelection);
      return newSelection;
    });
  };

  const updateFormFromSelection = (selection: string[]) => {
    // Only auto-update value if creating new procedure (not creating conflict in edit)
    if (procedure) return;

    const selectedOptions = approvedItems.filter(item => selection.includes(item.id));
    const totalValue = selectedOptions.reduce((sum, item) => sum + item.value, 0);

    setForm(prev => ({
      ...prev,
      value: totalValue > 0 ? totalValue.toFixed(2).replace('.', ',') : prev.value
    }));
  };

  const toggleFinalizeItem = (itemId: string) => {
    setFinalizedItemIds(prev => {
      const isSelected = prev.includes(itemId);
      return isSelected
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
    });
  };

  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr || dateStr.length !== 10) return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.date) {
      toast.error('Data é obrigatória');
      return;
    }

    if (!form.location) {
      toast.error('Local de Atendimento é obrigatório');
      return;
    }

    if (!isValidDate(form.date)) {
      toast.error('Por favor, insira uma data válida');
      return;
    }

    // Generate Final Description
    let finalDescription = '';

    // Add selected items details
    if (selectedItemIds.length > 0) {
      const selectedOptions = approvedItems.filter(item => selectedItemIds.includes(item.id));
      const itemsText = selectedOptions.map(item => {
        const valueFormatted = item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `• ${item.treatment} | ${item.tooth.includes('Arcada') ? item.tooth : `Dente ${item.tooth}`} | R$ ${valueFormatted}`;
      }).join('\n');
      finalDescription += itemsText;
    }

    // Append observations
    if (observations) {
      if (finalDescription) finalDescription += '\n\n';
      finalDescription += `Obs: ${observations}`;
    }

    // Fallback if empty
    if (!finalDescription && !procedure) {
      // If creating and nothing selected/typed
      // finalDescription = ''; 
    } else if (!finalDescription && procedure) {
      // If editing and cleared everything
      finalDescription = '';
    }

    try {
      const procedureData = {
        date: form.date,
        location: form.location || null,
        description: finalDescription || null,
        value: form.value ? parseFloat(form.value.replace('.', '').replace(',', '.')) : null,
        payment_method: null,
        installments: null,
      };

      if (procedure) {
        await updateProcedure.mutateAsync({
          id: procedure.id,
          data: {
            ...procedureData,
            // If editing, we typically keep the manual description unless specific change logic is requested.
            // Here, 'observations' (editing state) becomes the Description.
            description: observations || null,
          },
        });
        toast.success('Procedimento atualizado com sucesso!');
      } else {
        await createProcedure.mutateAsync({
          patient_id: patientId,
          ...procedureData,
        });

        // Update Budget Items Status
        if (selectedItemIds.length > 0) {
          const itemsByBudget: Record<string, { toothIndex: number; treatment: string }[]> = {};

          approvedItems.filter(item => selectedItemIds.includes(item.id)).forEach(item => {
            if (!itemsByBudget[item.budgetId]) itemsByBudget[item.budgetId] = [];
            const parts = item.id.split('_');
            const toothIndex = parseInt(parts[parts.length - 2]);
            const treatmentStr = item.treatment;

            if (finalizedItemIds.includes(item.id)) {
              if (!itemsByBudget[item.budgetId]) itemsByBudget[item.budgetId] = [];
              itemsByBudget[item.budgetId].push({ toothIndex, treatment: treatmentStr });
            }
          });

          for (const [budgetId, itemsToUpdate] of Object.entries(itemsByBudget)) {
            try {
              const budget = await budgetsService.getById(budgetId);
              //@ts-ignore
              if (budget && budget.notes) {
                //@ts-ignore
                const parsed = JSON.parse(budget.notes);
                let modified = false;

                itemsToUpdate.forEach(({ toothIndex }) => {
                  if (parsed.teeth && parsed.teeth[toothIndex]) {
                    parsed.teeth[toothIndex].status = 'completed';
                    modified = true;
                  }
                });

                if (modified) {
                  await budgetsService.update(budgetId, { notes: JSON.stringify(parsed) });
                }
              }
            } catch (err) {
              console.error(`Failed to update budget ${budgetId}`, err);
            }
          }
        }

        toast.success('Procedimento registrado com sucesso!');
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving procedure:', error);
      toast.error(`Erro ao ${procedure ? 'atualizar' : 'registrar'} procedimento`);
    }
  };

  const handleDelete = async () => {
    if (!procedure) return;
    try {
      await deleteProcedure.mutateAsync(procedure.id);
      toast.success('Procedimento excluído com sucesso!');
      setDeleteDialogOpen(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting procedure:', error);
      toast.error('Erro ao excluir procedimento');
    }
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{procedure ? 'Editar Procedimento' : 'Novo Procedimento'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-6 mt-2">

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Local de Atendimento *</Label>
                <Select
                  value={form.location}
                  onValueChange={(v) => setForm({ ...form, location: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.name}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!procedure && (
              <div className="space-y-3 border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-teal-800">Selecionar Procedimentos Pagos</Label>
                  {loadingBudgets && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>

                {approvedItems.length === 0 && !loadingBudgets ? (
                  <div className="text-sm text-muted-foreground py-2 italic flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Nenhum item pago disponível nos orçamentos.
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-2 bg-white p-2 rounded border">
                    {approvedItems.map((item) => (
                      <div key={item.id} className="flex flex-col py-1 space-y-1">
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id={item.id}
                            checked={selectedItemIds.includes(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor={item.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {item.label}
                            </label>
                            <p className="text-xs text-muted-foreground">
                              R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        {selectedItemIds.includes(item.id) && (
                          <div className="flex items-center space-x-2 pl-6">
                            <Checkbox
                              id={`finalize-${item.id}`}
                              checked={finalizedItemIds.includes(item.id)}
                              onCheckedChange={() => toggleFinalizeItem(item.id)}
                              className="h-3.5 w-3.5"
                            />
                            <label
                              htmlFor={`finalize-${item.id}`}
                              className="text-xs text-muted-foreground cursor-pointer"
                            >
                              Finalizar nesta sessão?
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="observations">Observações {selectedItemIds.length > 0 && <span className="text-xs font-normal text-muted-foreground">(Será adicionado à descrição junto com os itens)</span>}</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Digite observações adicionais..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Valor Total (R$)</Label>
                <Input
                  id="value"
                  value={form.value}
                  onChange={(e) => {
                    const formatted = formatCurrency(e.target.value);
                    setForm({ ...form, value: formatted });
                  }}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              {procedure && (
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={createProcedure.isPending || updateProcedure.isPending}
                >
                  Excluir
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                disabled={createProcedure.isPending || updateProcedure.isPending}
              >
                {(createProcedure.isPending || updateProcedure.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Procedimento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

