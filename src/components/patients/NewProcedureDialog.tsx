import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sanitizeForDisplay } from '@/utils/security';
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
import { useCreateProcedure, useUpdateProcedure, useDeleteProcedure } from '@/hooks/useProcedures';
import { type Location } from '@/services/locations';
import { budgetsService } from '@/services/budgets';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { Procedure } from '@/types/database';
import type { BudgetLink } from '@/services/procedures';

// Components
import { ProcedureForm, type ProcedureFormState } from './procedures/ProcedureForm';
import { InlineVoiceRecorder } from '@/components/voice-consultation/InlineVoiceRecorder';
import type { ExtractionResult } from '@/types/voiceConsultation';
import { usePaidBudgetItems, keysToBudgetLinks, budgetLinksToKeys } from '@/hooks/useBudgetProcedures';

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
  const queryClient = useQueryClient();

  const { paidItems } = usePaidBudgetItems(patientId);

  const [form, setForm] = useState<ProcedureFormState>({
    date: new Date().toISOString().split('T')[0],
    location: '',
    status: 'in_progress',
  });

  const [description, setDescription] = useState('');
  const [selectedBudgetKeys, setSelectedBudgetKeys] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (procedure) {
        setForm({
          date: procedure.date,
          location: procedure.location || '',
          status: (procedure.status as ProcedureFormState['status']) || 'in_progress',
        });
        setDescription(procedure.description || '');
        // Restore linked budget items from existing procedure
        const existingLinks = (procedure as any).budget_links as BudgetLink[] | null;
        setSelectedBudgetKeys(budgetLinksToKeys(existingLinks));
      } else {
        setForm({
          date: new Date().toISOString().split('T')[0],
          location: '',
          status: 'in_progress',
        });
        setDescription('');
        setSelectedBudgetKeys(new Set());
      }
    }
  }, [procedure?.id, open]);

  const handleVoiceResult = (result: ExtractionResult) => {
    const parts: string[] = [];

    if (result.procedures && result.procedures.length > 0) {
      for (const p of result.procedures) {
        const desc = [
          p.treatment,
          p.tooth && `Dente ${p.tooth}`,
          p.material && `Material: ${p.material}`,
          p.description,
        ].filter(Boolean).join(' - ');
        if (desc) parts.push(desc);
      }

      const first = result.procedures[0];
      if (first.status) setForm(prev => ({ ...prev, status: first.status }));
      if (first.location) {
        const loc = locations.find(l => l.name.toLowerCase() === first.location!.toLowerCase());
        if (loc) setForm(prev => ({ ...prev, location: loc.name }));
      }
    }

    if (parts.length === 0 && result.consultation) {
      const c = result.consultation;
      if (c.procedures) parts.push(c.procedures);
      if (c.chiefComplaint) parts.push(c.chiefComplaint);
      if (c.treatmentPlan) parts.push(c.treatmentPlan);
      if (c.notes) parts.push(c.notes);
    }

    if (parts.length > 0) {
      setDescription(parts.join('\n'));
    }
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

    if (selectedBudgetKeys.size === 0) {
      toast.error('Selecione ao menos um procedimento pago');
      return;
    }

    if (!isValidDate(form.date)) {
      toast.error('Por favor, insira uma data válida');
      return;
    }

    try {
      const budgetLinks = selectedBudgetKeys.size > 0
        ? keysToBudgetLinks(selectedBudgetKeys)
        : null;

      const procedureData = {
        date: form.date,
        location: form.location || null,
        description: sanitizeForDisplay(description) || '',
        value: null,
        payment_method: null,
        installments: null,
        status: form.status,
        budget_links: budgetLinks,
      };

      if (procedure) {
        await updateProcedure.mutateAsync({
          id: procedure.id,
          data: procedureData,
        });
        toast.success('Procedimento atualizado com sucesso!');
      } else {
        await createProcedure.mutateAsync({
          patient_id: patientId,
          ...procedureData,
        });
        toast.success('Procedimento registrado com sucesso!');
      }

      // If status is "completed" and there are linked budget items,
      // update their tooth status to "completed"
      if (form.status === 'completed' && budgetLinks && budgetLinks.length > 0) {
        for (const link of budgetLinks) {
          try {
            await budgetsService.updateToothStatus(link.budgetId, link.toothIndex, 'completed');
          } catch (err) {
            console.error('Error updating budget tooth status:', err);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['budgets', patientId] });
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
              paidBudgetItems={paidItems}
              selectedBudgetKeys={selectedBudgetKeys}
              onBudgetSelectionChange={setSelectedBudgetKeys}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Descrição do Procedimento</Label>
                {!procedure && (
                  <InlineVoiceRecorder patientId={patientId} onResult={handleVoiceResult} />
                )}
              </div>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o procedimento realizado..."
                rows={5}
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
