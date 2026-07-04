import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { settingsService } from '@/services/settings';
import { useCardMachines } from '@/hooks/useCardMachines';
import { resolveCardFeeRate } from '@/utils/paymentBreakdown';
import type { CardFeeConfig } from '@/types/database';
import type { PaymentReceivable } from '@/types/receivables';

export interface MethodSelection {
  method: string;
  brand: string | null;
  installments: number;
  cardMachineId: string | null;
  cardFeeRate: number;
  anticipationRate: number;
  changed: boolean;
}

const METHODS = [
  { id: 'cash', label: 'Dinheiro', icon: Banknote },
  { id: 'pix', label: 'PIX', icon: Smartphone },
  { id: 'debit', label: 'Débito', icon: CreditCard },
  { id: 'credit', label: 'Crédito', icon: CreditCard },
];

const DEFAULT_BRANDS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard'];

interface Props {
  receivable: PaymentReceivable;
  onChange: (sel: MethodSelection) => void;
}

/**
 * Lets the user change the payment method at confirmation time. Loads the
 * clinic's card machines / fee config and resolves the card fee rate for the
 * chosen method so the net amount can be recomputed. Tax and location rates are
 * method-independent and reused from the receivable.
 */
export function ConfirmMethodPicker({ receivable, onChange }: Props) {
  const origMethod = receivable.payment_method;
  const origBrand = receivable.brand || null;
  const origInstallments = receivable.installments || 1;
  const origMachineId = (receivable as any).card_machine_id || null;

  const [method, setMethod] = useState(origMethod);
  const [brand, setBrand] = useState<string | null>(origBrand);
  const [installments, setInstallments] = useState(origInstallments);
  const [machineId, setMachineId] = useState<string | null>(origMachineId);
  const [anticipate, setAnticipate] = useState(false);

  const { data: machines = [] } = useCardMachines(false);
  const [fees, setFees] = useState<CardFeeConfig[]>([]);
  const [brands, setBrands] = useState<string[]>(DEFAULT_BRANDS);

  const isCard = method === 'credit' || method === 'debit';

  // Load fee config for all machines once.
  useEffect(() => {
    const load = async () => {
      const ids = machines.map(m => m.id);
      if (ids.length === 0) { setFees([]); return; }
      const { data } = await supabase.from('card_fee_config').select('*').in('card_machine_id', ids);
      setFees((data || []) as CardFeeConfig[]);
    };
    load();
  }, [machines]);

  // Auto-select a machine when card is chosen and none selected.
  useEffect(() => {
    if (isCard && !machineId && machines.length > 0) {
      setMachineId(machines[0].id);
    }
  }, [isCard, machineId, machines]);

  // Load configured brands for the selected machine.
  useEffect(() => {
    if (!machineId) { setBrands(DEFAULT_BRANDS); return; }
    settingsService.getCardBrands(machineId)
      .then(list => {
        const names = (list || []).map(b => b.name.trim()).filter(Boolean);
        setBrands(names.length > 0 ? names : DEFAULT_BRANDS);
      })
      .catch(() => setBrands(DEFAULT_BRANDS));
  }, [machineId]);

  // Fees filtered to the selected machine.
  const machineFees = useMemo(
    () => (machineId ? fees.filter(f => (f as any).card_machine_id === machineId) : fees),
    [fees, machineId],
  );

  const { cardFeeRate, anticipationRate } = useMemo(
    () => resolveCardFeeRate({ fees: machineFees, method, brand, installments, anticipate }),
    [machineFees, method, brand, installments, anticipate],
  );

  const changed = method !== origMethod
    || (brand || null) !== origBrand
    || installments !== origInstallments
    || (machineId || null) !== origMachineId;

  // Report the current selection upward whenever it changes.
  useEffect(() => {
    onChange({
      method,
      brand: isCard ? brand : null,
      installments: method === 'credit' ? installments : 1,
      cardMachineId: isCard ? machineId : null,
      cardFeeRate,
      anticipationRate,
      changed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, brand, installments, machineId, cardFeeRate, anticipationRate, changed, isCard]);

  return (
    <div className="space-y-3">
      <Label className="text-sm">Forma de pagamento (na hora)</Label>
      <div className="grid grid-cols-4 gap-2">
        {METHODS.map(m => {
          const MIcon = m.icon;
          const active = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <MIcon className="w-4 h-4" />
              {m.label}
            </button>
          );
        })}
      </div>

      {isCard && (
        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          {machines.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Maquininha</Label>
              <Select value={machineId || ''} onValueChange={setMachineId}>
                <SelectTrigger><SelectValue placeholder="Selecione a maquininha" /></SelectTrigger>
                <SelectContent>
                  {machines.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Bandeira</Label>
            <Select value={brand || ''} onValueChange={setBrand}>
              <SelectTrigger><SelectValue placeholder="Selecione a bandeira" /></SelectTrigger>
              <SelectContent>
                {brands.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {method === 'credit' && (
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Parcelas</Label>
              <Select value={String(installments)} onValueChange={(v) => setInstallments(parseInt(v) || 1)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {method === 'credit' && anticipationRate > 0 && (
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-500">Antecipar recebimento</Label>
              <Switch checked={anticipate} onCheckedChange={setAnticipate} />
            </div>
          )}

          <div className="flex justify-between text-xs text-slate-500 pt-1 border-t">
            <span>Taxa de cartão</span>
            <span className="font-medium">{cardFeeRate.toFixed(2)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
