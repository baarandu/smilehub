import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { incomeTaxService } from '@/services/incomeTaxService';
import type { TransactionWithIR, SupplierFormData } from '@/types/incomeTax';
import { toast } from 'sonner';

interface ExpenseDataDialogProps {
  transaction: TransactionWithIR | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

// CPF/CNPJ mask
const applyCPFCNPJMask = (value: string): string => {
  const digits = value.replace(/\D/g, '');

  if (digits.length <= 11) {
    // CPF
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  } else {
    // CNPJ
    const cnpjDigits = digits.slice(0, 14);
    if (cnpjDigits.length <= 2) return cnpjDigits;
    if (cnpjDigits.length <= 5) return `${cnpjDigits.slice(0, 2)}.${cnpjDigits.slice(2)}`;
    if (cnpjDigits.length <= 8)
      return `${cnpjDigits.slice(0, 2)}.${cnpjDigits.slice(2, 5)}.${cnpjDigits.slice(5)}`;
    if (cnpjDigits.length <= 12)
      return `${cnpjDigits.slice(0, 2)}.${cnpjDigits.slice(2, 5)}.${cnpjDigits.slice(5, 8)}/${cnpjDigits.slice(8)}`;
    return `${cnpjDigits.slice(0, 2)}.${cnpjDigits.slice(2, 5)}.${cnpjDigits.slice(5, 8)}/${cnpjDigits.slice(8, 12)}-${cnpjDigits.slice(12)}`;
  }
};

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function ExpenseDataDialog({
  transaction,
  open,
  onOpenChange,
  onSaved,
}: ExpenseDataDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SupplierFormData>({
    supplier_name: '',
    supplier_cpf_cnpj: '',
    receipt_number: '',
    is_deductible: false,
  });

  // Load transaction data into form
  useEffect(() => {
    if (transaction) {
      setFormData({
        supplier_name: transaction.supplier_name || '',
        supplier_cpf_cnpj: transaction.supplier_cpf_cnpj || '',
        receipt_number: transaction.receipt_number || '',
        is_deductible: transaction.is_deductible,
      });
    }
  }, [transaction]);

  const handleSave = async () => {
    if (!transaction) return;

    // Validation for deductible expenses
    if (formData.is_deductible) {
      if (!formData.supplier_name) {
        toast.error('Nome do fornecedor e obrigatorio para despesas dedutiveis');
        return;
      }
    }

    setSaving(true);
    try {
      await incomeTaxService.updateTransactionSupplierFields(transaction.id, formData);
      toast.success('Dados da despesa atualizados');
      onSaved();
    } catch (error) {
      console.error('Error updating expense data:', error);
      toast.error('Erro ao atualizar dados da despesa');
    } finally {
      setSaving(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dados da Despesa (Livro Caixa)</DialogTitle>
          <DialogDescription>
            {formatDate(transaction.date)} - {formatCurrency(transaction.amount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{transaction.description}</p>
            <p className="text-sm text-muted-foreground">Categoria: {transaction.category}</p>
          </div>

          {/* Deductible Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="is_deductible" className="text-base">
                Despesa Dedutivel
              </Label>
              <p className="text-sm text-muted-foreground">
                Marque se esta despesa pode ser abatida no Imposto de Renda
              </p>
            </div>
            <Switch
              id="is_deductible"
              checked={formData.is_deductible}
              onCheckedChange={(checked) => setFormData({ ...formData, is_deductible: checked })}
            />
          </div>

          {/* Supplier Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplier_name">
                Nome do Fornecedor {formData.is_deductible && '*'}
              </Label>
              <Input
                id="supplier_name"
                placeholder="Nome ou Razao Social"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_cpf_cnpj">CPF/CNPJ do Fornecedor</Label>
              <Input
                id="supplier_cpf_cnpj"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                value={formData.supplier_cpf_cnpj}
                onChange={(e) =>
                  setFormData({ ...formData, supplier_cpf_cnpj: applyCPFCNPJMask(e.target.value) })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt_number">Numero do Comprovante</Label>
              <Input
                id="receipt_number"
                placeholder="Numero da nota fiscal ou recibo"
                value={formData.receipt_number}
                onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Numero da NF-e, recibo ou outro documento comprobatorio
              </p>
            </div>
          </div>

          {/* Info about deductible expenses */}
          {formData.is_deductible && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-[#6b2a28]">
                <strong>Dica:</strong> Para deduzir despesas no IR, mantenha os comprovantes
                originais arquivados por pelo menos 5 anos.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#a03f3d] hover:bg-[#8b3634]"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
