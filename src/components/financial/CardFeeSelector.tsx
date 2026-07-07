import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { settingsService } from '@/services/settings';
import { useCardMachines } from '@/hooks/useCardMachines';
import { resolveCardFeeRate } from '@/utils/paymentBreakdown';
import type { CardFeeConfig } from '@/types/database';

export interface CardFeeSelection {
  cardMachineId: string | null;
  brand: string | null;
  installments: number;
  cardFeeRate: number;
}

interface Props {
  method: 'credit' | 'debit';
  onChange: (sel: CardFeeSelection) => void;
}

/**
 * Seleção de maquininha/bandeira/parcelas com resolução da taxa de cartão.
 * Usado pelos fluxos de receita que não passam pelo PaymentMethodDialog
 * (receita manual, manutenção ortodôntica), para que pagamentos em cartão
 * nunca sejam gravados sem taxa.
 */
export function CardFeeSelector({ method, onChange }: Props) {
  const { data: machines = [] } = useCardMachines(false);
  const [machineId, setMachineId] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [installments, setInstallments] = useState(1);
  const [fees, setFees] = useState<CardFeeConfig[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  // Taxas de todas as maquininhas — recarrega quando a lista resolve.
  useEffect(() => {
    const ids = machines.map(m => m.id);
    if (ids.length === 0) { setFees([]); return; }
    let cancelled = false;
    supabase.from('card_fee_config').select('*').in('card_machine_id', ids)
      .then(({ data }) => { if (!cancelled) setFees((data || []) as CardFeeConfig[]); });
    return () => { cancelled = true; };
  }, [machines]);

  useEffect(() => {
    if (!machineId && machines.length > 0) setMachineId(machines[0].id);
  }, [machines, machineId]);

  useEffect(() => {
    if (!machineId) { setBrands([]); return; }
    settingsService.getCardBrands(machineId)
      .then(list => {
        const names = (list || []).map(b => b.name.trim()).filter(Boolean);
        setBrands(names);
        setBrand(prev =>
          prev && names.some(n => n.toLowerCase() === prev.toLowerCase()) ? prev : (names[0] || null),
        );
      })
      .catch(() => setBrands([]));
  }, [machineId]);

  const machineFees = useMemo(
    () => (machineId ? fees.filter(f => (f as any).card_machine_id === machineId) : []),
    [fees, machineId],
  );

  const { cardFeeRate } = useMemo(
    () => resolveCardFeeRate({
      fees: machineFees,
      method,
      brand,
      installments: method === 'debit' ? 1 : installments,
      anticipate: false,
    }),
    [machineFees, method, brand, installments],
  );

  useEffect(() => {
    onChange({
      cardMachineId: machineId,
      brand,
      installments: method === 'credit' ? installments : 1,
      cardFeeRate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId, brand, installments, cardFeeRate, method]);

  if (machines.length === 0) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Nenhuma maquininha cadastrada — a taxa de cartão não será descontada. Cadastre em Configurações Financeiras.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
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

      {brands.length > 0 && (
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
      )}

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

      <div className="flex justify-between text-xs text-slate-500 pt-1 border-t">
        <span>Taxa de cartão</span>
        <span className="font-medium">{cardFeeRate.toFixed(2)}%</span>
      </div>

      {cardFeeRate === 0 && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Nenhuma taxa cadastrada para esta maquininha/bandeira — o líquido ficará igual ao bruto.</span>
        </div>
      )}
    </div>
  );
}
