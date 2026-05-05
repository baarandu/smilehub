import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Banknote, CreditCard, Smartphone, Calendar, Zap, Clock, SplitSquareHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { formatMoney } from '@/utils/budgetUtils';
import type { SplitPaymentPortion } from '@/types/receivables';
import type { FinancialBreakdown, PayerData } from './PaymentMethodDialog';
import type { CardFeeConfig } from '@/types/database';
import type { PJSource } from '@/types/incomeTax';

const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX', icon: Smartphone },
  { id: 'credit', label: 'Crédito', icon: CreditCard },
  { id: 'debit', label: 'Débito', icon: CreditCard },
  { id: 'cash', label: 'Dinheiro', icon: Banknote },
];

interface SplitPaymentBuilderProps {
  totalValue: number;
  locationRate: number;
  taxRate: number;
  cardFees: CardFeeConfig[];
  availableBrands: { id: string; label: string }[];
  patientName?: string;
  patientCpf?: string;
  pjSources?: PJSource[];
  onPortionsChange: (portions: SplitPaymentPortion[], isValid: boolean) => void;
}

interface PortionState {
  id: string;
  method: string;
  amount: string; // cents string for formatting
  installments: number;
  brand: string;
  dueDate: string;
  isImmediate: boolean;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function SplitPaymentBuilder({
  totalValue,
  locationRate,
  taxRate,
  cardFees,
  availableBrands,
  patientName,
  patientCpf,
  onPortionsChange,
}: SplitPaymentBuilderProps) {
  const today = formatLocalDate(new Date());
  const nextMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return formatLocalDate(d);
  })();

  const [portions, setPortions] = useState<PortionState[]>([
    { id: crypto.randomUUID(), method: 'pix', amount: '', installments: 1, brand: availableBrands[0]?.id || 'visa', dueDate: nextMonth, isImmediate: false },
  ]);

  const allocatedCents = useMemo(() => {
    return portions.reduce((sum, p) => sum + (parseInt(p.amount || '0', 10)), 0);
  }, [portions]);

  const totalCents = Math.round(totalValue * 100);
  const remainingCents = totalCents - allocatedCents;
  const isFullyAllocated = Math.abs(remainingCents) < 1; // allow rounding

  // Calculate breakdown for each portion
  const calculateBreakdown = (portion: PortionState): FinancialBreakdown => {
    const grossAmount = parseInt(portion.amount || '0', 10) / 100;
    const taxAmount = (grossAmount * taxRate) / 100;

    let cardFeeRate = 0;
    let cardFeeAmount = 0;

    if (portion.method === 'credit' || portion.method === 'debit') {
      const lookupInstallments = portion.method === 'debit' ? 1 : portion.installments;
      let feeConfig = cardFees.find(f =>
        f.brand.toLowerCase() === portion.brand.toLowerCase() &&
        f.payment_type === portion.method &&
        f.installments === lookupInstallments
      );
      if (!feeConfig) {
        feeConfig = cardFees.find(f =>
          (f.brand.toLowerCase() === 'others' || f.brand.toLowerCase() === 'outras bandeiras' || f.brand.toLowerCase() === 'outros') &&
          f.payment_type === portion.method &&
          f.installments === lookupInstallments
        );
      }
      if (feeConfig) {
        cardFeeRate = feeConfig.rate;
        cardFeeAmount = (grossAmount * cardFeeRate) / 100;
      }
    }

    const baseForLocation = grossAmount - cardFeeAmount;
    const locationAmount = (baseForLocation * locationRate) / 100;
    const netAmount = grossAmount - taxAmount - cardFeeAmount - locationAmount;

    return {
      grossAmount,
      taxRate,
      taxAmount,
      cardFeeRate,
      cardFeeAmount,
      anticipationRate: 0,
      anticipationAmount: 0,
      locationRate,
      locationAmount,
      netAmount,
      isAnticipated: false,
    };
  };

  // Emit changes to parent
  useEffect(() => {
    const mapped: SplitPaymentPortion[] = portions.map(p => ({
      method: p.method,
      amount: parseInt(p.amount || '0', 10) / 100,
      installments: p.installments,
      brand: (p.method === 'credit' || p.method === 'debit') ? p.brand : undefined,
      dueDate: p.dueDate,
      isImmediate: p.isImmediate,
      breakdown: calculateBreakdown(p),
      payerData: {
        payer_is_patient: true,
        payer_type: 'PF' as const,
        payer_name: null,
        payer_cpf: patientCpf || null,
        pj_source_id: null,
      },
    }));

    const allHaveAmount = portions.every(p => parseInt(p.amount || '0', 10) > 0);
    const allHaveMethod = portions.every(p => !!p.method);
    onPortionsChange(mapped, isFullyAllocated && allHaveAmount && allHaveMethod);
  }, [portions, isFullyAllocated]);

  const updatePortion = (id: string, updates: Partial<PortionState>) => {
    setPortions(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePortion = (id: string) => {
    if (portions.length <= 1) return;
    setPortions(prev => prev.filter(p => p.id !== id));
  };

  const addPortion = () => {
    const nextDueDate = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + portions.length);
      return formatLocalDate(d);
    })();

    setPortions(prev => [...prev, {
      id: crypto.randomUUID(),
      method: 'cash',
      amount: '',
      installments: 1,
      brand: availableBrands[0]?.id || 'visa',
      dueDate: nextDueDate,
      isImmediate: false,
    }]);
  };

  const splitEqually = () => {
    const count = portions.length;
    const perPortion = Math.floor(totalCents / count);
    const remainder = totalCents - (perPortion * count);

    setPortions(prev => prev.map((p, i) => ({
      ...p,
      amount: String(perPortion + (i === 0 ? remainder : 0)),
    })));
  };

  const formatAmount = (cents: string): string => {
    const val = parseInt(cents || '0', 10) / 100;
    return val > 0 ? formatMoney(val) : '';
  };

  const handleAmountChange = (id: string, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    updatePortion(id, { amount: digits });
  };

  return (
    <div className="space-y-4">
      {/* Allocation bar */}
      <div className="bg-slate-50 p-3 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Alocado</span>
          <span className={`font-semibold ${isFullyAllocated ? 'text-emerald-600' : remainingCents < 0 ? 'text-red-600' : 'text-amber-600'}`}>
            R$ {formatMoney(allocatedCents / 100)} / R$ {formatMoney(totalValue)}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${isFullyAllocated ? 'bg-emerald-500' : remainingCents < 0 ? 'bg-red-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(100, (allocatedCents / totalCents) * 100)}%` }}
          />
        </div>
        {!isFullyAllocated && remainingCents > 0 && (
          <p className="text-xs text-amber-600">Faltam R$ {formatMoney(remainingCents / 100)}</p>
        )}
        {remainingCents < 0 && (
          <p className="text-xs text-red-600">Excedeu R$ {formatMoney(Math.abs(remainingCents) / 100)}</p>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={splitEqually} className="gap-1.5 text-xs">
          <SplitSquareHorizontal className="w-3.5 h-3.5" />
          Dividir igualmente
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addPortion} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Adicionar parcela
        </Button>
      </div>

      {/* Portions */}
      <div className="space-y-3">
        {portions.map((portion, idx) => (
          <div key={portion.id} className="border rounded-lg p-3 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Parcela {idx + 1}</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {portion.isImmediate ? (
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <Label htmlFor={`imm-${portion.id}`} className="text-xs cursor-pointer">
                    {portion.isImmediate ? 'Pagar agora' : 'Agendar'}
                  </Label>
                  <Switch
                    id={`imm-${portion.id}`}
                    checked={portion.isImmediate}
                    onCheckedChange={(v) => updatePortion(portion.id, {
                      isImmediate: v,
                      dueDate: v ? today : nextMonth,
                    })}
                  />
                </div>
                {portions.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePortion(portion.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Method */}
              <div className="space-y-1">
                <Label className="text-xs">Forma</Label>
                <div className="grid grid-cols-4 gap-1">
                  {PAYMENT_METHODS.map(m => {
                    const Icon = m.icon;
                    const isSelected = portion.method === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          updatePortion(portion.id, {
                            method: m.id,
                            installments: m.id !== 'credit' ? 1 : portion.installments,
                          });
                        }}
                        className={`cursor-pointer p-1.5 rounded border text-center transition-all ${
                          isSelected ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 mx-auto ${isSelected ? 'text-[#a03f3d]' : 'text-slate-400'}`} />
                        <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-[#8b3634] font-medium' : 'text-slate-500'}`}>
                          {m.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$)</Label>
                <Input
                  value={formatAmount(portion.amount)}
                  onChange={(e) => handleAmountChange(portion.id, e.target.value)}
                  placeholder="0,00"
                  className="text-right font-semibold"
                />
              </div>
            </div>

            {/* Card-specific fields */}
            {(portion.method === 'credit' || portion.method === 'debit') && (
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Bandeira</Label>
                  <Select value={portion.brand} onValueChange={(v) => updatePortion(portion.id, { brand: v })}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBrands.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {portion.method === 'credit' && (
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Parcelas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={portion.installments}
                      onChange={(e) => updatePortion(portion.id, { installments: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs text-center"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Due date */}
            {!portion.isImmediate && (
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Data de Vencimento
                </Label>
                <Input
                  type="date"
                  value={portion.dueDate}
                  onChange={(e) => updatePortion(portion.id, { dueDate: e.target.value })}
                  className="h-8 text-xs"
                  min={today}
                />
              </div>
            )}

            {/* Mini breakdown */}
            {parseInt(portion.amount || '0', 10) > 0 && (
              <div className="text-xs text-slate-500 flex justify-between pt-2 border-t">
                <span>Líquido:</span>
                <span className="text-emerald-600 font-medium">
                  R$ {formatMoney(calculateBreakdown(portion).netAmount)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
