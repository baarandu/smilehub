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
import { toast } from 'sonner';
import type { Procedure } from '@/types/database';

// Components
import { ProcedureForm, type ProcedureFormState } from './procedures/ProcedureForm';
import { InlineVoiceRecorder } from '@/components/voice-consultation/InlineVoiceRecorder';
import type { ExtractionResult } from '@/types/voiceConsultation';

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
    status: 'in_progress',
  });

  const [description, setDescription] = useState('');
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
      } else {
        setForm({
          date: new Date().toISOString().split('T')[0],
          location: '',
          status: 'in_progress',
        });
        setDescription('');
      }
    }
  }, [procedure?.id, open]);

  const handleVoiceResult = (result: ExtractionResult) => {
    if (result.procedures?.[0]) {
      const p = result.procedures[0];
      const desc = [
        p.treatment,
        p.tooth && `Dente ${p.tooth}`,
        p.material && `Material: ${p.material}`,
        p.description,
      ].filter(Boolean).join(' - ');
      setDescription(desc);
      if (p.status) setForm(prev => ({ ...prev, status: p.status }));
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

    if (!isValidDate(form.date)) {
      toast.error('Por favor, insira uma data válida');
      return;
    }

    try {
      const procedureData = {
        date: form.date,
        location: form.location || null,
        description: sanitizeForDisplay(description) || '',
        value: null,
        payment_method: null,
        installments: null,
        status: form.status,
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

        {!procedure && (
          <div className="px-1 pb-2">
            <InlineVoiceRecorder patientId={patientId} onResult={handleVoiceResult} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-4">
          <form id="procedure-form" onSubmit={handleSubmit} className="space-y-6 mt-2">

            <ProcedureForm
              form={form}
              onChange={(updates) => setForm(prev => ({ ...prev, ...updates }))}
              locations={locations}
              loading={isLoading}
            />

            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Procedimento</Label>
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
