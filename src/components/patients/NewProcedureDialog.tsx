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
import { toast } from 'sonner';
import type { Procedure } from '@/types/database';

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
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    location: '',
    description: '',
    value: '',
    paymentMethod: '',
    installments: '1',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (procedure) {
        // Preencher formulário com dados do procedimento
        // Garantir que os dados sejam mantidos mesmo se o procedure mudar
        const procedureId = procedure.id;
        setForm({
          date: procedure.date,
          location: procedure.location || '',
          description: procedure.description || '',
          value: procedure.value ? procedure.value.toFixed(2).replace('.', ',') : '',
          paymentMethod: procedure.payment_method || '',
          installments: procedure.installments?.toString() || '1',
        });
      } else {
        // Resetar formulário apenas se não houver procedure
        setForm({
          date: new Date().toISOString().split('T')[0],
          location: '',
          description: '',
          value: '',
          paymentMethod: '',
          installments: '1',
        });
      }
    }
  }, [procedure?.id, open]); // Usar procedure?.id para garantir que atualiza quando o procedimento muda

  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr || dateStr.length !== 10) return false;
    
    // Verificar formato YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) return false;
    
    // Verificar se a data não foi alterada (ex: 2024-02-30 vira 2024-03-01)
    const [year, month, day] = dateStr.split('-').map(Number);
    if (date.getFullYear() !== year || 
        date.getMonth() + 1 !== month || 
        date.getDate() !== day) {
      return false;
    }
    
    // Validar ano (não pode ser muito antigo ou futuro)
    if (year < 1900 || year > 2100) return false;
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.date) {
      toast.error('Data é obrigatória');
      return;
    }

    // Validar se a data é real
    if (!isValidDate(form.date)) {
      toast.error('Por favor, insira uma data válida');
      return;
    }

    try {
      const procedureData = {
        date: form.date,
        location: form.location || null,
        description: form.description || null,
        value: form.value ? parseFloat(form.value.replace(',', '.')) : null,
        payment_method: form.paymentMethod || null,
        installments: form.paymentMethod === 'credit' ? parseInt(form.installments) : 1,
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
      // Não resetar o formulário aqui, deixar o useEffect gerenciar
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{procedure ? 'Editar Procedimento' : 'Novo Procedimento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
            <Label htmlFor="location">Local de Atendimento</Label>
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

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o procedimento realizado..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Valor (R$)</Label>
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

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
            <Select
              value={form.paymentMethod}
              onValueChange={(v) => setForm({ ...form, paymentMethod: v, installments: v === 'credit' ? form.installments : '1' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="debit">Cartão de Débito</SelectItem>
                <SelectItem value="credit">Cartão de Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.paymentMethod === 'credit' && (
            <div className="space-y-2">
              <Label htmlFor="installments">Número de Parcelas</Label>
              <Input
                id="installments"
                type="number"
                min="1"
                max="12"
                value={form.installments}
                onChange={(e) => setForm({ ...form, installments: e.target.value })}
                placeholder="1"
              />
            </div>
          )}

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
              className="flex-1" 
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

