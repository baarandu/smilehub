import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Calculator, Clock, Calendar, AlertCircle, Banknote, Smartphone, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { budgetsService } from '@/services/budgets';
import { formatMoney, getToothDisplayName, formatDisplayDate, calculateBudgetStatus, type ToothEntry } from '@/utils/budgetUtils';
import type { BudgetWithItems } from '@/types/database';
import { PaymentMethodDialog, type PayerData } from './PaymentMethodDialog';
import { financialService } from '@/services/financial';
import { getPatientById } from '@/services/patients';
import { incomeTaxService } from '@/services/incomeTaxService';
import type { PJSource } from '@/types/incomeTax';
import { usePatientReceivables, useConfirmReceivable, useCancelReceivable } from '@/hooks/useReceivables';
import { ConfirmReceivableDialog } from './ConfirmReceivableDialog';
import type { PaymentReceivable } from '@/types/receivables';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  // Patient and PJ data for payer selection
  const [patientData, setPatientData] = useState<{ name: string; cpf: string | null } | null>(null);
  const [pjSources, setPjSources] = useState<PJSource[]>([]);

  // Receivables (scheduled installments)
  const { data: receivables = [], refetch: refetchReceivables } = usePatientReceivables(patientId);
  const confirmReceivable = useConfirmReceivable();
  const cancelReceivable = useCancelReceivable();
  const [confirmingReceivable, setConfirmingReceivable] = useState<PaymentReceivable | null>(null);

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load budgets, patient data and PJ sources in parallel
      const [data, patient, sources] = await Promise.all([
        budgetsService.getByPatient(patientId),
        getPatientById(patientId),
        incomeTaxService.getPJSources().catch(() => [] as PJSource[])
      ]);

      setBudgets(data);
      processItems(data);

      if (patient) {
        setPatientData({ name: patient.name, cpf: patient.cpf || null });
      }
      setPjSources(sources);
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
    let paidTotal = 0;
    let grandTotal = 0;

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
              locationRate: (tooth as any).locationRate ?? (budget as any).location_rate ?? (parsed.locationRate ? parseFloat(parsed.locationRate) : 0)
            };

            if (tooth.status === 'approved') {
              toPay.push(item);
              grandTotal += itemVal;
            } else if (tooth.status === 'partially_paid') {
              history.push(item);
              const confirmedAmount = (tooth.splitPayments || [])
                .filter(sp => sp.status === 'confirmed')
                .reduce((sum, sp) => sum + sp.amount, 0);
              paidTotal += confirmedAmount;
              grandTotal += itemVal;
            } else if (tooth.status === 'paid' || tooth.status === 'completed') {
              history.push(item);
              paidTotal += itemVal;
              grandTotal += itemVal;
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
      approved: 0,
      paid: paidTotal,
      total: grandTotal
    });
  };

  const handlePaymentClick = (item: ItemToPay) => {
    setSelectedItem(item);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ... (existing code)

  const handleConfirmPayment = async (method: string, installments: number, brand?: string, breakdown?: any, payerData?: PayerData, cardMachineId?: string | null) => {
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

      // When anticipated, register as single transaction even if payment is installment-based
      // The installment count is still used to calculate the correct fee rate
      const isAnticipated = breakdown?.isAnticipated || false;
      const numTransactions = isAnticipated ? 1 : (installments || 1);
      const txAmount = totalAmount / numTransactions;

      // Calculate Deductions (Per Transaction)
      let netAmountPerTx = txAmount;
      let taxAmountPerTx = 0;
      let cardFeeAmountPerTx = 0;
      let anticipationAmountPerTx = 0;
      let locationAmountPerTx = 0;

      const targetLocationRate = selectedItem.locationRate || 0;

      if (breakdown) {
        netAmountPerTx = breakdown.netAmount / numTransactions;
        taxAmountPerTx = breakdown.taxAmount / numTransactions;
        cardFeeAmountPerTx = breakdown.cardFeeAmount / numTransactions;
        anticipationAmountPerTx = breakdown.anticipationAmount ? (breakdown.anticipationAmount / numTransactions) : 0;

        if (breakdown.locationAmount) {
          locationAmountPerTx = breakdown.locationAmount / numTransactions;
        } else if (targetLocationRate > 0) {
          // Fallback if breakdown existed but missed location
          // Calculate on (txAmount - cardFee) to be consistent with PaymentMethodDialog
          const baseForLocation = txAmount - cardFeeAmountPerTx;
          locationAmountPerTx = (baseForLocation * targetLocationRate) / 100;
          netAmountPerTx -= locationAmountPerTx;
        }
      } else {
        // No breakdown (Cash/Transfer/Pix without fees explicitly loaded?)
        // Deduct Location Rate
        if (targetLocationRate > 0) {
          locationAmountPerTx = (txAmount * targetLocationRate) / 100;
          netAmountPerTx = txAmount - locationAmountPerTx;
        }
      }

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
          anticipation_amount: anticipationAmountPerTx,
          location_rate: targetLocationRate,
          location_amount: locationAmountPerTx,
          // Payer data
          payer_is_patient: payerData?.payer_is_patient ?? true,
          payer_type: payerData?.payer_type || 'PF',
          payer_name: payerData?.payer_name || null,
          payer_cpf: payerData?.payer_cpf || null,
          pj_source_id: payerData?.pj_source_id || null,
          card_machine_id: cardMachineId || null,
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total</p>
              <h3 className="text-2xl font-bold text-slate-700">R$ {formatMoney(stats.total)}</h3>
            </div>
            <Calculator className="w-8 h-8 text-slate-200" />
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Recebido</p>
              <h3 className="text-2xl font-bold text-blue-700">R$ {formatMoney(stats.paid)}</h3>
            </div>
            <CreditCard className="w-8 h-8 text-blue-300" />
          </CardContent>
        </Card>
        {receivables.filter(r => r.status === 'pending').length > 0 && (
          <Card className="bg-amber-50 border-amber-100">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Agendado</p>
                <h3 className="text-2xl font-bold text-amber-700">
                  R$ {formatMoney(receivables.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0))}
                </h3>
              </div>
              <Clock className="w-8 h-8 text-amber-300" />
            </CardContent>
          </Card>
        )}
        {receivables.filter(r => r.status === 'overdue').length > 0 && (
          <Card className="bg-red-50 border-red-100">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Em Atraso</p>
                <h3 className="text-2xl font-bold text-red-700">
                  R$ {formatMoney(receivables.filter(r => r.status === 'overdue').reduce((s, r) => s + r.amount, 0))}
                </h3>
              </div>
              <AlertCircle className="w-8 h-8 text-red-300" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Scheduled Receivables Section */}
      {receivables.length > 0 && (
        <Card>
          <CardHeader className="bg-amber-50/50 border-b pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
              <Calendar className="w-5 h-5" />
              Parcelas Agendadas ({receivables.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {receivables.map(r => {
                const isOverdue = r.status === 'overdue';
                const daysOverdue = isOverdue
                  ? Math.ceil((new Date().getTime() - new Date(r.due_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
                  : 0;

                const methodLabels: Record<string, string> = {
                  credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro',
                };
                const MethodIcon = r.payment_method === 'pix' ? Smartphone
                  : r.payment_method === 'cash' ? Banknote
                  : CreditCard;

                return (
                  <div key={r.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50/50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{r.tooth_description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <MethodIcon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500">{methodLabels[r.payment_method] || r.payment_method}</span>
                        <span className="text-xs text-slate-400">|</span>
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500">{formatDisplayDate(r.due_date)}</span>
                      </div>
                      <div className="mt-1">
                        {isOverdue ? (
                          <Badge variant="destructive" className="text-[10px] h-5">
                            Em atraso ({daysOverdue} dia{daysOverdue !== 1 ? 's' : ''})
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] h-5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                            A vencer
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`font-bold text-lg ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                        R$ {formatMoney(r.amount)}
                      </span>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
                        onClick={() => setConfirmingReceivable(r)}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Confirmar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={async () => {
                              try {
                                await cancelReceivable.mutateAsync(r.id);
                                toast({ title: "Parcela cancelada", description: "A parcela foi cancelada." });
                                refetchReceivables();
                              } catch {
                                toast({ variant: "destructive", title: "Erro", description: "Falha ao cancelar parcela." });
                              }
                            }}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancelar parcela
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
                {paidHistory.map((item, idx) => {
                  const isPartial = item.tooth.status === 'partially_paid';
                  const splits = item.tooth.splitPayments || [];
                  const confirmedSplits = splits.filter(sp => sp.status === 'confirmed');
                  const activeSplits = splits.filter(sp => sp.status !== 'cancelled');
                  const confirmedAmount = confirmedSplits.reduce((s, sp) => s + sp.amount, 0);
                  const totalAmount = activeSplits.reduce((s, sp) => s + sp.amount, 0);

                  return (
                    <div key={idx} className={`p-4 flex items-center justify-between ${isPartial ? 'bg-amber-50/30' : 'bg-slate-50/50'}`}>
                      <div>
                        <div className="font-medium text-slate-700">
                          {getToothDisplayName(item.tooth.tooth)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.tooth.treatments.join(', ')}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {isPartial ? (
                            <>
                              <Badge className="text-[10px] h-5 bg-amber-100 text-amber-700 hover:bg-amber-100">
                                {confirmedSplits.length}/{activeSplits.length} parcelas recebidas
                              </Badge>
                              {confirmedSplits.map((sp, spIdx) => {
                                const methodLabels: Record<string, string> = {
                                  credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro',
                                };
                                return (
                                  <Badge key={spIdx} variant="secondary" className="text-[10px] h-5">
                                    R$ {formatMoney(sp.amount)} - {methodLabels[sp.method] || sp.method}
                                  </Badge>
                                );
                              })}
                            </>
                          ) : (
                            <>
                              {splits.length > 0 ? (
                                splits.filter(sp => sp.status !== 'cancelled').map((sp, spIdx) => {
                                  const methodLabels: Record<string, string> = {
                                    credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro',
                                  };
                                  return (
                                    <Badge key={spIdx} variant="secondary" className="text-[10px] h-5">
                                      R$ {formatMoney(sp.amount)} - {methodLabels[sp.method] || sp.method}
                                    </Badge>
                                  );
                                })
                              ) : (
                                <Badge variant="secondary" className="text-[10px] h-5">
                                  {item.tooth.paymentMethod === 'credit' ? 'Crédito' :
                                    item.tooth.paymentMethod === 'debit' ? 'Débito' :
                                      item.tooth.paymentMethod === 'pix' ? 'PIX' : 'Dinheiro'}
                                </Badge>
                              )}
                              {item.tooth.paymentDate && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  {formatDisplayDate(item.tooth.paymentDate)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {isPartial && totalAmount > 0 && (
                          <div className="mt-2 w-48">
                            <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                              <span>R$ {formatMoney(confirmedAmount)} recebido</span>
                              <span>R$ {formatMoney(totalAmount)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${Math.round((confirmedAmount / totalAmount) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {isPartial ? (
                          <div>
                            <div className="font-semibold text-emerald-600">
                              R$ {formatMoney(confirmedAmount)}
                            </div>
                            <div className="text-xs text-slate-400">
                              de R$ {formatMoney(totalAmount)}
                            </div>
                          </div>
                        ) : (
                          <div className="font-semibold text-slate-600">
                            R$ {formatMoney(getItemValue(item))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
          patientName={patientData?.name}
          patientCpf={patientData?.cpf || undefined}
          pjSources={pjSources}
        />
      )}

      {confirmingReceivable && (
        <ConfirmReceivableDialog
          open={!!confirmingReceivable}
          onClose={() => setConfirmingReceivable(null)}
          receivable={confirmingReceivable}
          loading={confirmReceivable.isPending}
          onConfirm={async (id, date) => {
            try {
              await confirmReceivable.mutateAsync({ receivableId: id, confirmationDate: date });
              toast({ title: "Recebimento Confirmado", description: "Parcela confirmada e lançada no financeiro." });
              setConfirmingReceivable(null);
              refetchReceivables();
              loadData();
            } catch {
              toast({ variant: "destructive", title: "Erro", description: "Falha ao confirmar recebimento." });
            }
          }}
        />
      )}
    </div>
  );
}





