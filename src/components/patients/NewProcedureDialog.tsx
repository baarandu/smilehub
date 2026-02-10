import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// import { ScrollArea } from '@/components/ui/scroll-area'; // Removed
import { sanitizeForDisplay } from '@/utils/security';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// ... (rest of imports)

// ...


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
import { getToothDisplayName, calculateBudgetStatus, type ToothEntry } from '@/utils/budgetUtils';
import type { Procedure } from '@/types/database';

// Components
import { ProcedureForm, type ProcedureFormState } from './procedures/ProcedureForm';
import { ProcedureBudgetList, type ApprovedItemOption } from './procedures/ProcedureBudgetList';

interface NewProcedureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  locations: Location[];
  procedure?: Procedure | null;
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

  const [form, setForm] = useState<ProcedureFormState>({
    date: new Date().toISOString().split('T')[0],
    location: '',
    value: '',
    paymentMethod: '',
    installments: '1',
    status: 'in_progress',
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
          status: (procedure.status as ProcedureFormState['status']) || 'in_progress',
        });
        setObservations(procedure.description || '');
        setSelectedItemIds([]);
      } else {
        // Create mode
        setForm({
          date: new Date().toISOString().split('T')[0],
          location: '',
          value: '',
          paymentMethod: '',
          installments: '1',
          status: 'in_progress',
        });
        setObservations('');
        setSelectedItemIds([]);
        setFinalizedItemIds([]);
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
              if (toothEntry.status === 'paid' || toothEntry.status === 'completed') {
                toothEntry.treatments.forEach((treatment, treatmentIndex) => {
                  const valStr = toothEntry.values[treatment] || '0';
                  const val = parseInt(valStr) / 100;

                  // Generate a unique ID for selection
                  const uniqueId = `${budget.id}_${toothIndex}_${treatmentIndex} `;

                  options.push({
                    id: uniqueId,
                    label: `${treatment} - ${getToothDisplayName(toothEntry.tooth)} `,
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

      if (isSelected) {
        // Removing selection - remove from finalized too
        setFinalizedItemIds(current => current.filter(id => id !== itemId));
        const newSelection = prev.filter(id => id !== itemId);
        updateFormFromSelection(newSelection);
        return newSelection;
      } else {
        // Adding selection - Default to FINALIZED
        setFinalizedItemIds(current => [...current, itemId]);
        const newSelection = [...prev, itemId];
        updateFormFromSelection(newSelection);
        return newSelection;
      }
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
        return `• ${item.treatment} | ${item.tooth.includes('Arcada') ? item.tooth : `Dente ${item.tooth}`} | R$ ${valueFormatted} `;
      }).join('\n');
      finalDescription += itemsText;
    }

    // Append observations
    if (observations) {
      if (finalDescription) finalDescription += '\n\n';
      finalDescription += `Obs: ${observations} `;
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
        description: sanitizeForDisplay(finalDescription) || '',
        value: form.value ? parseFloat(form.value.replace(/\./g, '').replace(',', '.')) : null,
        payment_method: null,
        installments: null,
        status: form.status,
      };

      if (procedure) {
        await updateProcedure.mutateAsync({
          id: procedure.id,
          data: {
            ...procedureData,
            // If editing, we typically keep the manual description unless specific change logic is requested.
            // Here, 'observations' (editing state) becomes the Description.
            description: sanitizeForDisplay(observations) || '',
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
                  const newStatus = calculateBudgetStatus(parsed.teeth);
                  await budgetsService.update(budgetId, {
                    notes: JSON.stringify(parsed),
                    status: newStatus
                  });
                }
              }
            } catch (err) {
              console.error(`Failed to update budget ${budgetId} `, err);
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

  const isLoading = createProcedure.isPending || updateProcedure.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{procedure ? 'Editar Procedimento' : 'Novo Procedimento'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <form id="procedure-form" onSubmit={handleSubmit} className="space-y-6 mt-2">

            <ProcedureForm
              form={form}
              onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
              locations={locations}
              loading={isLoading}
            />

            {!procedure && (
              <ProcedureBudgetList
                items={approvedItems}
                selectedIds={selectedItemIds}
                onToggleSelection={toggleItemSelection}
                finalizedIds={finalizedItemIds}
                onToggleFinalize={toggleFinalizeItem}
                loading={loadingBudgets}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="observations">Observações {selectedItemIds.length > 0 && <span className="text-xs font-normal text-muted-foreground">(Será adicionado à descrição junto com os itens)</span>}</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Digite observações adicionais..."
                rows={3}
                disabled={isLoading}
              />
            </div>

          </form>
        </div>

        <div className="flex gap-3 pt-4 border-t mt-4 bg-white">
          {procedure && (
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isLoading}
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
            form="procedure-form"
            className="flex-1 bg-[#a03f3d] hover:bg-[#8b3634]"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>

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

