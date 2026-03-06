import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, Calendar, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { formatMoney, formatDisplayDate } from '@/utils/budgetUtils';
import type { PaymentReceivable } from '@/types/receivables';

interface ConfirmReceivableDialogProps {
  open: boolean;
  onClose: () => void;
  receivable: PaymentReceivable;
  onConfirm: (receivableId: string, confirmationDate: string) => Promise<void>;
  loading?: boolean;
}

const METHOD_LABELS: Record<string, string> = {
  credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro',
};

const METHOD_ICONS: Record<string, typeof CreditCard> = {
  credit: CreditCard, debit: CreditCard, pix: Smartphone, cash: Banknote,
};

export function ConfirmReceivableDialog({ open, onClose, receivable, onConfirm, loading }: ConfirmReceivableDialogProps) {
  const [confirmDate, setConfirmDate] = useState(new Date().toISOString().split('T')[0]);

  const Icon = METHOD_ICONS[receivable.payment_method] || CreditCard;
  const methodLabel = METHOD_LABELS[receivable.payment_method] || receivable.payment_method;
  const isOverdue = receivable.status === 'overdue';

  const handleConfirm = async () => {
    await onConfirm(receivable.id, confirmDate);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Confirmar Recebimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Receivable info */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800">{receivable.tooth_description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-sm text-slate-600">{methodLabel}</span>
                  {receivable.brand && (
                    <span className="text-xs text-slate-400">({receivable.brand})</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-600">R$ {formatMoney(receivable.amount)}</p>
                {isOverdue && (
                  <Badge variant="destructive" className="text-[10px]">Em atraso</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              Vencimento: {formatDisplayDate(receivable.due_date)}
            </div>

            {receivable.net_amount > 0 && receivable.net_amount !== receivable.amount && (
              <div className="text-xs text-slate-500 pt-2 border-t flex justify-between">
                <span>Líquido</span>
                <span className="font-medium text-emerald-600">R$ {formatMoney(receivable.net_amount)}</span>
              </div>
            )}
          </div>

          {/* Confirmation date */}
          <div className="space-y-2">
            <Label className="text-sm">Data do Recebimento</Label>
            <Input
              type="date"
              value={confirmDate}
              onChange={(e) => setConfirmDate(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" /> Confirmar</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
