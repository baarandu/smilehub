import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Calculator, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { budgetsService } from '@/services/budgets';
import { formatMoney, getToothDisplayName, formatDisplayDate, calculateBudgetStatus, type ToothEntry } from '@/utils/budgetUtils';
import type { BudgetWithItems } from '@/types/database';
import { PaymentMethodDialog } from './PaymentMethodDialog';
import { financialService } from '@/services/financial';

interface PaymentsTabProps {
  patientId: string;
}

interface ItemToPay {
  budgetId: string;
  toothIndex: number;
  tooth: ToothEntry;
  budgetDate: string;
  locationRate?: number;
}

export function PaymentsTab({ patientId }: PaymentsTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ approved: 0, paid: 0, total: 0 });
  const [paymentItems, setPaymentItems] = useState<ItemToPay[]>([]); // Approved items logic pending payment
  const [paidHistory, setPaidHistory] = useState<ItemToPay[]>([]);

  const [selectedItem, setSelectedItem] = useState<ItemToPay | null>(null);
  const [budgets, setBudgets] = useState<BudgetWithItems[]>([]);

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await budgetsService.getByPatient(patientId);
      setBudgets(data);
      processItems(data);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar pagamentos." });
    } finally {
      setLoading(false);
    }
  };

  const processItems = (data: BudgetWithItems[]) => {
    const toPay: ItemToPay[] = [];
    const history: ItemToPay[] = [];
    let approvedTotal = 0;
    let paidTotal = 0;

    data.forEach(budget => {
      try {
        const parsed = JSON.parse(budget.notes || '{}');
        if (parsed.teeth && Array.isArray(parsed.teeth)) {
          parsed.teeth.forEach((tooth: ToothEntry, index: number) => {
            const itemVal = Object.values(tooth.values).reduce((a, b) => a + (parseInt(b) || 0) / 100, 0);

            const item: ItemToPay = {
              budgetId: budget.id,
              toothIndex: index,
              tooth,
              budgetDate: budget.date,
              locationRate: parsed.locationRate ? parseFloat(parsed.locationRate) : 0
            };

            if (tooth.status === 'approved') {
              toPay.push(item);
              approvedTotal += itemVal;
            } else if (tooth.status === 'paid') {
              history.push(item);
              paidTotal += itemVal;
            }
          });
        }
      } catch (e) {
        console.error("Error parsing budget notes", e);
      }
    });

    // Sort paid history by payment date (most recent first)
    history.sort((a, b) => {
      const dateA = a.tooth.paymentDate || a.budgetDate;
      const dateB = b.tooth.paymentDate || b.budgetDate;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    setPaymentItems(toPay);
    setPaidHistory(history);
    setStats({
      approved: approvedTotal,
      paid: paidTotal,
      total: approvedTotal + paidTotal
    });
  };

  const handlePaymentClick = (item: ItemToPay) => {
    setSelectedItem(item);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ... (existing code)

  const handleConfirmPayment = async (method: string, installments: number, brand?: string, breakdown?: any) => {
    if (!selectedItem || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const budget = budgets.find(b => b.id === selectedItem.budgetId);
      if (!budget) return;

      const parsed = JSON.parse(budget.notes || '{}');
      const teeth = parsed.teeth as ToothEntry[];

      if (!teeth) return;

      // 1. Create Financial Transactions
      const totalAmount = getItemValue(selectedItem);
      // ... (rest of logic) ...

      const anticipationAmountPerTx = breakdown?.anticipationAmount ? (breakdown.anticipationAmount / numTransactions) : 0;

      // Ensure budgetDate is valid YYYY-MM-DD
      let budgetDateStr = selectedItem.budgetDate;
      // Handle potential DD/MM/YYYY format just in case
      if (budgetDateStr && budgetDateStr.includes('/')) {
        const [d, m, y] = budgetDateStr.split('/');
        budgetDateStr = `${y}-${m}-${d}`;
      }

      const budgetDate = new Date(budgetDateStr + 'T12:00:00');
      const startDate = isNaN(budgetDate.getTime()) ? new Date() : budgetDate;

      // Helper to format date as local YYYY-MM-DD
      const formatLocalDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Get location from budget
      const budgetLocation = parsed.location || null;

      // Method labels
      const methodLabels: Record<string, string> = {
        credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro', transfer: 'Transf.'
      };
      const methodLabel = methodLabels[method] || method;

      const isCard = method === 'credit' || method === 'debit';
      const displayBrand = isCard && brand ? brand : null;

      const paymentTag = displayBrand ? `(${methodLabel} - ${displayBrand.toUpperCase()})` : `(${methodLabel})`;

      for (let i = 0; i < numTransactions; i++) {
        const date = new Date(startDate);
        if (!isAnticipated) {
          date.setMonth(date.getMonth() + i);
        }

        await financialService.createTransaction({
          type: 'income',
          amount: txAmount, // Store GROSS
          description: `${selectedItem.tooth.treatments.join(', ')} ${paymentTag} - ${getToothDisplayName(selectedItem.tooth.tooth)}${numTransactions > 1 ? ` (${i + 1}/${numTransactions})` : ''}`,
          category: 'Tratamento',
          date: formatLocalDate(date),
          patient_id: patientId,
          related_entity_id: budget.id,
          location: budgetLocation,
          payment_method: method,
          // Deductions
          net_amount: netAmountPerTx,
          tax_rate: breakdown?.taxRate,
          tax_amount: taxAmountPerTx,
          card_fee_rate: breakdown?.cardFeeRate,
          card_fee_amount: cardFeeAmountPerTx,
          anticipation_rate: breakdown?.anticipationRate,
          anticipation_amount: anticipationAmountPerTx
        } as any);
      }

      // Update item status
      teeth[selectedItem.toothIndex] = {
        ...teeth[selectedItem.toothIndex],
        status: 'paid',
        paymentMethod: method as any,
        paymentInstallments: installments, // Keep original installments for record
        paymentDate: new Date().toISOString().split('T')[0],
        financialBreakdown: breakdown // Save breakdown in notes for history
      };

      // Check overall status
      const newBudgetStatus = calculateBudgetStatus(teeth);

      const updatedNotes = JSON.stringify({ ...parsed, teeth });

      await budgetsService.update(budget.id, {
        notes: updatedNotes,
        status: newBudgetStatus
      });

      toast({ title: "Pagamento Registrado", description: "O item foi marcado como pago e lançado no financeiro." });
      loadData(); // Reload to refresh lists
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao registrar pagamento." });
    } finally {
      setIsSubmitting(false);
      setSelectedItem(null);
    }
  };

  const getItemValue = (item: ItemToPay) => {
    return Object.values(item.tooth.values).reduce((a, b) => a + (parseInt(b) || 0) / 100, 0);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando pagamentos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600">A Receber (Aprovados)</p>
              <h3 className="text-2xl font-bold text-emerald-700">R$ {formatMoney(stats.approved)}</h3>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-300" />
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Recebido (Pagos)</p>
              <h3 className="text-2xl font-bold text-blue-700">R$ {formatMoney(stats.paid)}</h3>
            </div>
            <CreditCard className="w-8 h-8 text-blue-300" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Movimentado</p>
              <h3 className="text-2xl font-bold text-slate-700">R$ {formatMoney(stats.total)}</h3>
            </div>
            <Calculator className="w-8 h-8 text-slate-200" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* To Pay List */}
        <Card className="h-fit">
          <CardHeader className="bg-emerald-50/50 border-b pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
              <Clock className="w-5 h-5" />
              Itens Aprovados (A Receber)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paymentItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum item aprovado pendente de pagamento
              </div>
            ) : (
              <div className="divide-y">
                {paymentItems.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {getToothDisplayName(item.tooth.tooth)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {item.tooth.treatments.join(', ')}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Orc. {formatDisplayDate(item.budgetDate)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg text-emerald-600">
                        R$ {formatMoney(getItemValue(item))}
                      </div>
                      <Button
                        size="sm"
                        className="mt-2 bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                        onClick={() => handlePaymentClick(item)}
                      >
                        <CreditCard className="w-3 h-3 mr-1.5" />
                        Receber
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paid History */}
        <Card className="h-fit opacity-80 hover:opacity-100 transition-opacity">
          <CardHeader className="bg-slate-50 border-b pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <CheckCircle className="w-5 h-5" />
              Histórico de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paidHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum pagamento histórico
              </div>
            ) : (
              <div className="divide-y">
                {paidHistory.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <div className="font-medium text-slate-700">
                        {getToothDisplayName(item.tooth.tooth)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.tooth.treatments.join(', ')}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {item.tooth.paymentMethod === 'credit' ? 'Crédito' :
                            item.tooth.paymentMethod === 'debit' ? 'Débito' :
                              item.tooth.paymentMethod === 'pix' ? 'PIX' : 'Dinheiro'}
                        </Badge>
                        {item.tooth.paymentDate && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {formatDisplayDate(item.tooth.paymentDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-semibold text-slate-600">
                      R$ {formatMoney(getItemValue(item))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedItem && (
        <PaymentMethodDialog
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={handleConfirmPayment}
          itemName={getToothDisplayName(selectedItem.tooth.tooth)}
          value={getItemValue(selectedItem)}
          locationRate={selectedItem.locationRate || 0}
          loading={isSubmitting}
        />
      )}
    </div>
  );
}





