import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAddPatientCreditTransaction } from '@/hooks/usePatientCredits';

interface AddCreditDialogProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
}

export function AddCreditDialog({ open, onClose, patientId }: AddCreditDialogProps) {
  const { toast } = useToast();
  const addTransaction = useAddPatientCreditTransaction();
  
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (!val) {
      setAmountStr('');
      return;
    }
    const num = parseInt(val, 10);
    setAmountStr((num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };

  const getNumericValue = (str: string) => {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleSave = async () => {
    const amount = getNumericValue(amountStr);
    if (amount <= 0) {
      toast({ variant: 'destructive', title: 'Valor inválido', description: 'Insira um valor maior que zero.' });
      return;
    }
    if (!description.trim()) {
      toast({ variant: 'destructive', title: 'Descrição obrigatória', description: 'Por favor, informe o motivo do crédito.' });
      return;
    }

    try {
      await addTransaction.mutateAsync({
        patientId,
        type: 'credit',
        amount,
        description: description.trim()
      });
      toast({ title: 'Crédito adicionado', description: 'O saldo do paciente foi atualizado com sucesso.' });
      onClose();
      // Reset form
      setTimeout(() => {
        setAmountStr('');
        setDescription('');
      }, 300);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message || 'Falha ao adicionar crédito.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            Adicionar Crédito
          </DialogTitle>
          <DialogDescription>
            Insira o valor que o paciente pagou a mais ou que ficará de crédito para o futuro.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Crédito</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
              <Input
                id="amount"
                value={amountStr}
                onChange={handleAmountChange}
                className="pl-9 text-lg font-medium"
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Motivo / Observação</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pagamento a maior pelo PIX"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={addTransaction.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={addTransaction.isPending} className="bg-emerald-600 hover:bg-emerald-700">
            {addTransaction.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Crédito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
