import { useState, useEffect } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateOrthodonticEvolution, useUpdateOrthodonticEvolution } from '@/hooks/useOrthodonticEvolution';
import { toast } from 'sonner';
import type { OrthodonticEvolution } from '@/types/orthodonticEvolution';

interface NewOrthodonticEvolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  entry?: OrthodonticEvolution | null;
}

export function NewOrthodonticEvolutionDialog({
  open,
  onOpenChange,
  patientId,
  entry,
}: NewOrthodonticEvolutionDialogProps) {
  const createEntry = useCreateOrthodonticEvolution();
  const updateEntry = useUpdateOrthodonticEvolution();
  const [form, setForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    content: '',
  });

  useEffect(() => {
    if (open) {
      if (entry) {
        setForm({ entryDate: entry.entry_date, content: entry.content });
      } else {
        setForm({ entryDate: new Date().toISOString().split('T')[0], content: '' });
      }
    }
  }, [entry?.id, open]);

  const isPending = createEntry.isPending || updateEntry.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.entryDate || !form.content.trim()) {
      toast.error('Data e texto da evolução são obrigatórios');
      return;
    }

    try {
      if (entry) {
        await updateEntry.mutateAsync({
          id: entry.id,
          data: { entry_date: form.entryDate, content: form.content },
        });
        toast.success('Evolução atualizada com sucesso!');
      } else {
        await createEntry.mutateAsync({
          patient_id: patientId,
          entry_date: form.entryDate,
          content: form.content,
        });
        toast.success('Evolução registrada com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving orthodontic evolution:', error);
      toast.error(`Erro ao ${entry ? 'atualizar' : 'registrar'} evolução`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{entry ? 'Editar Evolução' : 'Nova Evolução Ortodôntica'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="entryDate">Data *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="entryDate"
                type="date"
                value={form.entryDate}
                onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Anotação *</Label>
            <Textarea
              id="content"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Descreva a evolução do tratamento ortodôntico..."
              rows={8}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? (
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
      </DialogContent>
    </Dialog>
  );
}
