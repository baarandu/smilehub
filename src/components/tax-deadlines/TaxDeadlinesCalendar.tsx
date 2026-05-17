import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CalendarClock, CheckCircle2, AlertTriangle, AlertCircle, Building2,
  CreditCard, Receipt, FileText, ClipboardCheck, Wallet, UserCheck,
  Sparkles, Loader2, RotateCcw,
} from 'lucide-react';
import {
  useUpcomingDeadlines,
  useTaxDeadlineRules,
  useMarkDeadlineComplete,
  useUnmarkDeadlineComplete,
  useSeedDefaultDeadlines,
  useToggleDeadlineActive,
} from '@/hooks/useTaxDeadlines';
import { classifyUrgency } from '@/services/taxDeadlines';
import { useToast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { formatDisplayDate, formatMoney } from '@/utils/budgetUtils';
import type {
  DeadlineOccurrence, DeadlineCategory, DeadlineResponsible, DeadlineUrgency,
} from '@/types/taxDeadline';

const URGENCY_THEME: Record<DeadlineUrgency['urgency'], {
  bg: string; border: string; text: string; tag: string; label: string;
}> = {
  overdue: {
    bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700',
    tag: 'bg-red-100 text-red-700', label: 'Em atraso',
  },
  today: {
    bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700',
    tag: 'bg-orange-100 text-orange-700', label: 'Vence hoje',
  },
  'this-week': {
    bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700',
    tag: 'bg-amber-100 text-amber-700', label: 'Esta semana',
  },
  upcoming: {
    bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-700',
    tag: 'bg-slate-100 text-slate-600', label: 'A vencer',
  },
  completed: {
    bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-700',
    tag: 'bg-emerald-100 text-emerald-700', label: 'Concluído',
  },
};

const CATEGORY_ICON: Record<DeadlineCategory, typeof FileText> = {
  payment: Receipt,
  submission: FileText,
  closure: ClipboardCheck,
  declaration: Building2,
};

const RESPONSIBLE_LABEL: Record<DeadlineResponsible, { label: string; cls: string }> = {
  client: { label: 'Você', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  accountant: { label: 'Contador', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  shared: { label: 'Ambos', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export function TaxDeadlinesCalendar() {
  const { toast } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const { data: occurrences = [], isLoading } = useUpcomingDeadlines();
  const { data: rules = [] } = useTaxDeadlineRules();
  const seedDefaults = useSeedDefaultDeadlines();
  const markComplete = useMarkDeadlineComplete();
  const unmarkComplete = useUnmarkDeadlineComplete();
  const toggleActive = useToggleDeadlineActive();

  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [completionTarget, setCompletionTarget] = useState<DeadlineOccurrence | null>(null);

  const grouped = useMemo(() => {
    const classified = occurrences
      .map((o) => classifyUrgency(o))
      .filter((c) => {
        if (filter === 'pending') return c.urgency !== 'completed';
        if (filter === 'completed') return c.urgency === 'completed';
        return true;
      });

    // Agrupa por urgência
    const buckets: Record<DeadlineUrgency['urgency'], DeadlineUrgency[]> = {
      overdue: [], today: [], 'this-week': [], upcoming: [], completed: [],
    };
    for (const c of classified) buckets[c.urgency].push(c);

    return [
      { key: 'overdue' as const, items: buckets.overdue, title: 'Em atraso' },
      { key: 'today' as const, items: buckets.today, title: 'Hoje' },
      { key: 'this-week' as const, items: buckets['this-week'], title: 'Esta semana' },
      { key: 'upcoming' as const, items: buckets.upcoming, title: 'Próximos' },
      { key: 'completed' as const, items: buckets.completed, title: 'Concluídos' },
    ].filter((b) => b.items.length > 0);
  }, [occurrences, filter]);

  const counts = useMemo(() => {
    const classified = occurrences.map((o) => classifyUrgency(o));
    return {
      overdue: classified.filter((c) => c.urgency === 'overdue').length,
      today: classified.filter((c) => c.urgency === 'today').length,
      thisWeek: classified.filter((c) => c.urgency === 'this-week').length,
    };
  }, [occurrences]);

  const handleSeedDefaults = async () => {
    try {
      const n = await seedDefaults.mutateAsync();
      if (n > 0) {
        toast({
          title: 'Prazos padrão criados',
          description: `${n} prazo(s) do Simples Nacional adicionados.`,
        });
      } else {
        toast({ title: 'Prazos já estão configurados' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err?.message || 'Falha ao criar prazos' });
    }
  };

  const handleToggleComplete = async (occ: DeadlineOccurrence) => {
    if (occ.is_completed) {
      const ok = await confirm({
        title: 'Desfazer conclusão?',
        description: 'A obrigação voltará para "pendente".',
        confirmLabel: 'Desfazer',
      });
      if (!ok) return;
      await unmarkComplete.mutateAsync({
        deadlineId: occ.deadline_id,
        occurrenceDate: occ.occurrence_date,
      });
      toast({ title: 'Conclusão desfeita' });
    } else {
      // Abre dialog pra adicionar notas/valor pago
      setCompletionTarget(occ);
    }
  };

  // Sem regras configuradas → CTA de seed
  if (!isLoading && rules.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <CalendarClock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-semibold text-slate-700 mb-1">Calendário fiscal não configurado</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
            Crie os prazos padrão do Simples Nacional (envio dia 03, FGTS dia 07, DAS dia 20, INSS dia 20, fechamento dia 30, DEFIS, IRPF).
          </p>
          <Button
            onClick={handleSeedDefaults}
            disabled={seedDefaults.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {seedDefaults.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Criar prazos padrão
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com contadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className={counts.overdue > 0 ? 'border-red-200 bg-red-50/50' : 'bg-slate-50/50'}>
          <CardContent className="p-3 flex items-center gap-3">
            <AlertCircle className={`w-6 h-6 ${counts.overdue > 0 ? 'text-red-500' : 'text-slate-300'}`} />
            <div>
              <p className={`text-2xl font-bold ${counts.overdue > 0 ? 'text-red-700' : 'text-slate-500'}`}>
                {counts.overdue}
              </p>
              <p className="text-xs text-slate-500">Em atraso</p>
            </div>
          </CardContent>
        </Card>
        <Card className={counts.today > 0 ? 'border-orange-200 bg-orange-50/50' : 'bg-slate-50/50'}>
          <CardContent className="p-3 flex items-center gap-3">
            <CalendarClock className={`w-6 h-6 ${counts.today > 0 ? 'text-orange-500' : 'text-slate-300'}`} />
            <div>
              <p className={`text-2xl font-bold ${counts.today > 0 ? 'text-orange-700' : 'text-slate-500'}`}>
                {counts.today}
              </p>
              <p className="text-xs text-slate-500">Vencem hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card className={counts.thisWeek > 0 ? 'border-amber-200 bg-amber-50/50' : 'bg-slate-50/50'}>
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${counts.thisWeek > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
            <div>
              <p className={`text-2xl font-bold ${counts.thisWeek > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                {counts.thisWeek}
              </p>
              <p className="text-xs text-slate-500">Esta semana</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>
            Pendentes
          </Button>
          <Button variant={filter === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('completed')}>
            Concluídos
          </Button>
          <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
            Todos
          </Button>
        </div>

        <RulesPanel rules={rules} onToggle={(id, active) => toggleActive.mutate({ id, isActive: active })} />
      </div>

      {/* Lista agrupada */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-400">Carregando...</div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
            <p className="text-sm">Nenhum prazo nesta visualização</p>
          </CardContent>
        </Card>
      ) : (
        grouped.map((bucket) => (
          <div key={bucket.key} className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              {bucket.title}
              <Badge variant="outline" className="text-[10px] h-4">
                {bucket.items.length}
              </Badge>
            </h3>
            <div className="space-y-1.5">
              {bucket.items.map((d) => (
                <DeadlineRow
                  key={`${d.occurrence.deadline_id}-${d.occurrence.occurrence_date}`}
                  data={d}
                  onToggleComplete={() => handleToggleComplete(d.occurrence)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {completionTarget && (
        <CompletionDialog
          occurrence={completionTarget}
          open={!!completionTarget}
          onClose={() => setCompletionTarget(null)}
          loading={markComplete.isPending}
          onConfirm={async (notes, amount) => {
            try {
              await markComplete.mutateAsync({
                deadline_id: completionTarget.deadline_id,
                occurrence_date: completionTarget.occurrence_date,
                notes,
                amount_paid: amount,
              });
              toast({ title: 'Prazo concluído' });
              setCompletionTarget(null);
            } catch (err: any) {
              toast({ variant: 'destructive', title: 'Erro', description: err?.message || 'Falha' });
            }
          }}
        />
      )}

      {ConfirmDialog}
    </div>
  );
}

// ============================================================
// Linha do prazo
// ============================================================

function DeadlineRow({
  data,
  onToggleComplete,
}: {
  data: DeadlineUrgency;
  onToggleComplete: () => void;
}) {
  const theme = URGENCY_THEME[data.urgency];
  const occ = data.occurrence;
  const CategoryIcon = CATEGORY_ICON[occ.category];
  const respo = RESPONSIBLE_LABEL[occ.responsible];

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${theme.bg} ${theme.border}`}>
      <CategoryIcon className={`w-5 h-5 ${theme.text} shrink-0`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium ${data.occurrence.is_completed ? 'line-through text-slate-500' : theme.text}`}>
            {occ.deadline_name}
          </span>
          <Badge variant="outline" className={`text-[10px] h-5 ${respo.cls}`}>
            <UserCheck className="w-2.5 h-2.5 mr-0.5" />
            {respo.label}
          </Badge>
          <Badge className={`text-[10px] h-5 ${theme.tag}`}>{theme.label}</Badge>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {formatDisplayDate(occ.occurrence_date)}
          {occ.deadline_description ? ` · ${occ.deadline_description}` : ''}
          {occ.amount_paid ? ` · R$ ${formatMoney(Number(occ.amount_paid))}` : ''}
        </p>
      </div>

      <Button
        size="sm"
        variant={occ.is_completed ? 'ghost' : 'outline'}
        onClick={onToggleComplete}
        className={occ.is_completed ? 'text-slate-500' : ''}
      >
        {occ.is_completed ? (
          <>
            <RotateCcw className="w-3 h-3 mr-1" />
            Desfazer
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Marcar feito
          </>
        )}
      </Button>
    </div>
  );
}

// ============================================================
// Painel de regras (ativar/desativar)
// ============================================================

function RulesPanel({
  rules,
  onToggle,
}: {
  rules: any[];
  onToggle: (id: string, active: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Configurar prazos ({rules.filter((r) => r.is_active).length}/{rules.length})
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Prazos configurados</DialogTitle>
            <DialogDescription>
              Ative ou desative os prazos. Para FGTS, ative apenas se tiver funcionários CLT.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto divide-y">
            {rules.map((r) => (
              <div key={r.id} className="py-2 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${r.is_active ? 'text-slate-800' : 'text-slate-400'}`}>
                    {r.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Dia {r.day_of_month} · {r.frequency === 'monthly' ? 'Mensal' : 'Anual'}
                    {r.requires_employees && ' · Só com CLT'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={r.is_active ? 'default' : 'outline'}
                  onClick={() => onToggle(r.id, !r.is_active)}
                  className={r.is_active ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                >
                  {r.is_active ? 'Ativo' : 'Inativo'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================
// Dialog de conclusão (com nota + valor pago)
// ============================================================

function CompletionDialog({
  occurrence,
  open,
  onClose,
  onConfirm,
  loading,
}: {
  occurrence: DeadlineOccurrence;
  open: boolean;
  onClose: () => void;
  onConfirm: (notes?: string, amount?: number) => void;
  loading: boolean;
}) {
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const isPayment = occurrence.category === 'payment';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como concluído</DialogTitle>
          <DialogDescription>
            {occurrence.deadline_name} · {formatDisplayDate(occurrence.occurrence_date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isPayment && (
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-xs">Valor pago (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="notes" className="text-xs">Observação (opcional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ex: pago via PIX" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            onClick={() => onConfirm(notes.trim() || undefined, amount ? parseFloat(amount) : undefined)}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
