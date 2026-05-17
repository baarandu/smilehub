import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus, MoreHorizontal, CheckCircle2, Trash2, Wallet, Calendar, Loader2,
} from 'lucide-react';
import {
  useProlaboreList,
  useCreateProlabore,
  useDeleteProlabore,
  useMarkProlaborePaid,
  useFatorRThreshold,
  useSetFatorRThreshold,
} from '@/hooks/useProlabore';
import { useToast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { formatMoney, formatDisplayDate } from '@/utils/budgetUtils';
import type { ProlaboreInput } from '@/types/prolabore';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function ProlaboreManagement() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [year, setYear] = useState(new Date().getFullYear());
  const { data: withdrawals = [], isLoading } = useProlaboreList({ year });
  const { data: thresholdPct = 28 } = useFatorRThreshold();

  const createMutation = useCreateProlabore();
  const markPaidMutation = useMarkProlaborePaid();
  const deleteMutation = useDeleteProlabore();
  const setThresholdMutation = useSetFatorRThreshold();

  const [dialogOpen, setDialogOpen] = useState(false);

  const grouped = useMemo(() => {
    const byMonth = new Map<string, typeof withdrawals>();
    for (const w of withdrawals) {
      const key = w.reference_month;
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(w);
    }
    return Array.from(byMonth.entries()).map(([month, items]) => ({
      month,
      items,
      total: items.reduce((s, i) => s + Number(i.amount), 0),
    }));
  }, [withdrawals]);

  const handleMarkPaid = async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await markPaidMutation.mutateAsync({ id, paymentDate: today, createExpense: true });
      toast({ title: 'Pró-labore marcado como pago', description: 'Lançamento criado nas despesas.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err?.message || 'Falha ao marcar como pago' });
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir pró-labore?',
      description: 'A despesa vinculada (se houver) também será removida.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!ok) return;
    await deleteMutation.mutateAsync(id);
    toast({ title: 'Pró-labore excluído' });
  };

  return (
    <div className="space-y-4">
      {/* Header com configuração de threshold */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Pró-labore dos Sócios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="year-select" className="text-sm text-slate-600">Ano:</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger id="year-select" className="w-28 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[year - 1, year, year + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="threshold" className="text-sm text-slate-600">
                Limite Fator R (%):
              </Label>
              <Input
                id="threshold"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={thresholdPct}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setThresholdMutation.mutate(v);
                }}
                className="w-20 h-9"
              />
              <span className="text-xs text-slate-400">(Anexo III ≥ 28%)</span>
            </div>

            <Button
              className="ml-auto bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Registrar pró-labore
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listagem por mês */}
      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-slate-400">Carregando...</CardContent></Card>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-400">
            <Wallet className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum pró-labore registrado em {year}</p>
            <p className="text-xs mt-1">Use o botão "Registrar pró-labore" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        grouped.map(({ month, items, total }) => {
          const d = new Date(month);
          const label = `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
          return (
            <Card key={month}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                  <Calendar className="w-4 h-4" />
                  {label}
                </CardTitle>
                <span className="text-sm font-semibold text-slate-600">
                  R$ {formatMoney(total)}
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {items.map((w) => (
                    <div key={w.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{w.partner_name}</span>
                          {w.status === 'paid' ? (
                            <Badge className="text-[10px] h-5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Pago
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-5 text-amber-700 border-amber-300">
                              Planejado
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {w.payment_date ? `Pago em ${formatDisplayDate(w.payment_date)}` : 'Aguardando pagamento'}
                          {(w.inss_amount > 0 || w.irrf_amount > 0) &&
                            ` · INSS R$ ${formatMoney(w.inss_amount)} · IRRF R$ ${formatMoney(w.irrf_amount)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700">
                          R$ {formatMoney(Number(w.amount))}
                        </span>
                        {w.status === 'planned' && (
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleMarkPaid(w.id)}
                            disabled={markPaidMutation.isPending}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Marcar como pago
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(w.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <ProlaboreDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        isSubmitting={createMutation.isPending}
        onSubmit={async (input) => {
          try {
            await createMutation.mutateAsync(input);
            toast({ title: 'Pró-labore registrado' });
            setDialogOpen(false);
          } catch (err: any) {
            const msg = err?.code === '23505'
              ? 'Já existe um pró-labore para esse sócio neste mês'
              : err?.message || 'Erro ao registrar pró-labore';
            toast({ variant: 'destructive', title: 'Erro', description: msg });
          }
        }}
      />

      {ConfirmDialog}
    </div>
  );
}

function ProlaboreDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: ProlaboreInput) => void | Promise<void>;
  isSubmitting: boolean;
}) {
  const today = new Date();
  const [partnerName, setPartnerName] = useState('');
  const [partnerCpf, setPartnerCpf] = useState('');
  const [refMonth, setRefMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`);
  const [amount, setAmount] = useState('');
  const [inss, setInss] = useState('');
  const [irrf, setIrrf] = useState('');
  const [status, setStatus] = useState<'planned' | 'paid'>('planned');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!partnerName.trim()) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return;
    onSubmit({
      partner_name: partnerName.trim(),
      partner_cpf: partnerCpf.trim() || undefined,
      reference_month: refMonth,
      amount: value,
      inss_amount: inss ? parseFloat(inss) : 0,
      irrf_amount: irrf ? parseFloat(irrf) : 0,
      status,
      payment_date: status === 'paid' ? (paymentDate || new Date().toISOString().slice(0, 10)) : undefined,
      notes: notes.trim() || undefined,
      create_expense: status === 'paid',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pró-labore</DialogTitle>
          <DialogDescription>
            Retirada mensal do sócio para cálculo do INSS e Fator R.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label htmlFor="partner-name" className="text-xs">Nome do Sócio *</Label>
              <Input id="partner-name" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="Ex: Dra. Maria Silva" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="partner-cpf" className="text-xs">CPF</Label>
              <Input id="partner-cpf" value={partnerCpf} onChange={(e) => setPartnerCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ref-month" className="text-xs">Mês de Competência *</Label>
              <Input id="ref-month" type="month" value={refMonth.slice(0, 7)} onChange={(e) => setRefMonth(`${e.target.value}-01`)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-xs">Valor Bruto (R$) *</Label>
              <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inss" className="text-xs">INSS (R$)</Label>
              <Input id="inss" type="number" step="0.01" value={inss} onChange={(e) => setInss(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="irrf" className="text-xs">IRRF (R$)</Label>
              <Input id="irrf" type="number" step="0.01" value={irrf} onChange={(e) => setIrrf(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'planned' | 'paid')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planejado</SelectItem>
                  <SelectItem value="paid">Já pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === 'paid' && (
              <div className="space-y-1">
                <Label htmlFor="pay-date" className="text-xs">Data do Pagamento</Label>
                <Input id="pay-date" type="date" value={paymentDate || new Date().toISOString().slice(0, 10)} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Observações</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {status === 'paid' && (
            <p className="text-xs text-slate-500">
              Uma despesa será criada automaticamente na categoria "Pró-labore" para alimentar o Fator R.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Registrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
