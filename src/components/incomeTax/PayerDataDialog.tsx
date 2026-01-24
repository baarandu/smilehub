import { useState, useEffect } from 'react';
import { User, Building } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { incomeTaxService } from '@/services/incomeTaxService';
import type { TransactionWithIR, PJSource, PayerFormData, PayerType } from '@/types/incomeTax';
import { toast } from 'sonner';

interface PayerDataDialogProps {
  transaction: TransactionWithIR | null;
  pjSources: PJSource[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

// CPF mask
const applyCPFMask = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// Currency mask
const applyCurrencyMask = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const numValue = parseInt(digits) / 100;
  return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function PayerDataDialog({
  transaction,
  pjSources,
  open,
  onOpenChange,
  onSaved,
}: PayerDataDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<PayerFormData>({
    payer_is_patient: true,
    payer_name: '',
    payer_cpf: '',
    payer_type: 'PF',
    pj_source_id: '',
    irrf_amount: '',
  });

  // Load transaction data into form
  useEffect(() => {
    if (transaction) {
      setFormData({
        payer_is_patient: transaction.payer_is_patient,
        payer_name: transaction.payer_name || '',
        payer_cpf: transaction.payer_cpf || '',
        payer_type: transaction.payer_type || 'PF',
        pj_source_id: transaction.pj_source_id || '',
        irrf_amount: transaction.irrf_amount > 0
          ? transaction.irrf_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
          : '',
      });
    }
  }, [transaction]);

  const handleSave = async () => {
    if (!transaction) return;

    // Validation
    if (formData.payer_type === 'PF' && !formData.payer_is_patient) {
      if (!formData.payer_name || !formData.payer_cpf) {
        toast.error('Nome e CPF do pagador sao obrigatorios');
        return;
      }
    }

    if (formData.payer_type === 'PJ' && !formData.pj_source_id) {
      toast.error('Selecione a fonte pagadora PJ');
      return;
    }

    setSaving(true);
    try {
      await incomeTaxService.updateTransactionPayerFields(transaction.id, formData);
      toast.success('Dados do pagador atualizados');
      onSaved();
    } catch (error) {
      console.error('Error updating payer data:', error);
      toast.error('Erro ao atualizar dados do pagador');
    } finally {
      setSaving(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dados do Pagador</DialogTitle>
          <DialogDescription>
            {formatDate(transaction.date)} - {formatCurrency(transaction.amount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">{transaction.description}</p>
            {transaction.patient && (
              <p className="text-sm text-muted-foreground">
                Paciente: {transaction.patient.name}
              </p>
            )}
          </div>

          {/* Payer Type Selection */}
          <div className="space-y-2">
            <Label>Tipo de Pagador</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.payer_type === 'PF' ? 'default' : 'outline'}
                className={formData.payer_type === 'PF' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                onClick={() => setFormData({ ...formData, payer_type: 'PF', pj_source_id: '' })}
              >
                <User className="w-4 h-4 mr-2" />
                Pessoa Fisica
              </Button>
              <Button
                type="button"
                variant={formData.payer_type === 'PJ' ? 'default' : 'outline'}
                className={formData.payer_type === 'PJ' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                onClick={() => setFormData({ ...formData, payer_type: 'PJ', payer_is_patient: false })}
              >
                <Building className="w-4 h-4 mr-2" />
                Pessoa Juridica
              </Button>
            </div>
          </div>

          {/* PF Fields */}
          {formData.payer_type === 'PF' && (
            <>
              {/* Patient is payer toggle */}
              {transaction.patient && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Label htmlFor="payer_is_patient">Paciente e o pagador</Label>
                    <p className="text-sm text-muted-foreground">
                      Usar dados do paciente ({transaction.patient.name})
                    </p>
                  </div>
                  <Switch
                    id="payer_is_patient"
                    checked={formData.payer_is_patient}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, payer_is_patient: checked })
                    }
                  />
                </div>
              )}

              {/* Manual payer fields */}
              {!formData.payer_is_patient && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="payer_name">Nome do Pagador</Label>
                    <Input
                      id="payer_name"
                      placeholder="Nome completo"
                      value={formData.payer_name}
                      onChange={(e) => setFormData({ ...formData, payer_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payer_cpf">CPF do Pagador</Label>
                    <Input
                      id="payer_cpf"
                      placeholder="000.000.000-00"
                      value={formData.payer_cpf}
                      onChange={(e) =>
                        setFormData({ ...formData, payer_cpf: applyCPFMask(e.target.value) })
                      }
                    />
                  </div>
                </>
              )}

              {/* Show patient CPF info when using patient data */}
              {formData.payer_is_patient && transaction.patient && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">CPF:</span>{' '}
                    {transaction.patient.cpf || (
                      <span className="text-amber-600">
                        Nao cadastrado - atualize o cadastro do paciente
                      </span>
                    )}
                  </p>
                </div>
              )}
            </>
          )}

          {/* PJ Fields */}
          {formData.payer_type === 'PJ' && (
            <div className="space-y-2">
              <Label htmlFor="pj_source">Fonte Pagadora (Convenio)</Label>
              <Select
                value={formData.pj_source_id}
                onValueChange={(value) => setFormData({ ...formData, pj_source_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a fonte PJ" />
                </SelectTrigger>
                <SelectContent>
                  {pjSources.filter((s) => s.is_active).map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.nome_fantasia || source.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pjSources.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma fonte PJ cadastrada. Adicione nas configuracoes.
                </p>
              )}
            </div>
          )}

          {/* IRRF Amount (for PJ) */}
          {formData.payer_type === 'PJ' && (
            <div className="space-y-2">
              <Label htmlFor="irrf_amount">IRRF Retido na Fonte</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="irrf_amount"
                  placeholder="0,00"
                  value={formData.irrf_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, irrf_amount: applyCurrencyMask(e.target.value) })
                  }
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Valor do imposto retido pelo convenio/empresa (se houver)
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
            className="bg-teal-600 hover:bg-teal-700"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
