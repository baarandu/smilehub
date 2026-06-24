import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Gift, HeartHandshake, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { TREATMENTS } from '@/utils/budgetUtils';
import { useClinicCustomTreatments } from '@/hooks/useClinicCustomTreatments';
import { treatmentPlansService, type TreatmentPlan } from '@/services/treatmentPlans';
import { toast } from 'sonner';

interface TreatmentPlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

interface RuleDraft {
  id: string;
  treatments: string[];
  percent: string;
  maxUses: string;
}

interface FormState {
  name: string;
  subtitle: string;
  duration_months: string;
  price: string;
  included_consultations: string;
  included_consultation_treatments: string[];
  discount_rules: RuleDraft[];
  perks: string[];
}

const emptyForm: FormState = {
  name: '',
  subtitle: '',
  duration_months: '12',
  price: '',
  included_consultations: '0',
  included_consultation_treatments: [],
  discount_rules: [],
  perks: [],
};

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `r_${Math.random().toString(36).slice(2)}`;
}

/** Multi-select picker over the clinic's full treatment list. */
function TreatmentPicker({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: custom = [] } = useClinicCustomTreatments();
  const options = useMemo(
    () => Array.from(new Set([...TREATMENTS, ...custom.map(c => c.name)])).sort((a, b) => a.localeCompare(b)),
    [custom]
  );

  const toggle = (name: string) => {
    if (value.includes(name)) onChange(value.filter(v => v !== name));
    else onChange([...value, name]);
  };

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-between font-normal h-auto min-h-9 py-1.5">
            <span className={`text-left text-sm ${value.length === 0 ? 'text-muted-foreground' : ''}`}>
              {value.length === 0 ? placeholder : `${value.length} selecionado(s)`}
            </span>
            <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar tratamento..." />
            <CommandList>
              <CommandEmpty>Nenhum tratamento.</CommandEmpty>
              <CommandGroup>
                {options.map(name => (
                  <CommandItem key={name} value={name} onSelect={() => toggle(name)}>
                    <Check className={`mr-2 h-4 w-4 ${value.includes(name) ? 'opacity-100' : 'opacity-0'}`} />
                    {name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map(name => (
            <Badge key={name} variant="secondary" className="gap-1 font-normal">
              {name}
              <button type="button" onClick={() => toggle(name)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function TreatmentPlansModal({ open, onOpenChange, onChanged }: TreatmentPlansModalProps) {
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) loadPlans();
  }, [open]);

  const loadPlans = async () => {
    try {
      setPlans(await treatmentPlansService.getAll());
    } catch {
      toast.error('Erro ao carregar planos');
    }
  };

  const patch = (updates: Partial<FormState>) => setForm(prev => ({ ...prev, ...updates }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingPlan(null);
  };

  const handleEdit = (plan: TreatmentPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      subtitle: plan.subtitle || '',
      duration_months: String(plan.duration_months),
      price: plan.price ? String(plan.price) : '',
      included_consultations: String(plan.included_consultations),
      included_consultation_treatments: plan.included_consultation_treatments,
      discount_rules: plan.discount_rules.map(r => ({
        id: r.id || newId(),
        treatments: r.treatments,
        percent: String(r.percent),
        maxUses: r.max_uses != null ? String(r.max_uses) : '',
      })),
      perks: plan.perks,
    });
  };

  const addRule = () =>
    patch({ discount_rules: [...form.discount_rules, { id: newId(), treatments: [], percent: '', maxUses: '' }] });

  const updateRule = (id: string, updates: Partial<RuleDraft>) =>
    patch({ discount_rules: form.discount_rules.map(r => (r.id === id ? { ...r, ...updates } : r)) });

  const removeRule = (id: string) => patch({ discount_rules: form.discount_rules.filter(r => r.id !== id) });

  const addPerk = () => patch({ perks: [...form.perks, ''] });
  const updatePerk = (i: number, val: string) =>
    patch({ perks: form.perks.map((p, idx) => (idx === i ? val : p)) });
  const removePerk = (i: number) => patch({ perks: form.perks.filter((_, idx) => idx !== i) });

  const handleSave = async () => {
    const name = form.name.trim();
    const duration = Number(form.duration_months);
    const consultations = Number(form.included_consultations);

    const price = Number(String(form.price || '0').replace(',', '.'));

    if (!name) return toast.error('Informe o nome do plano');
    if (!Number.isFinite(duration) || duration <= 0) return toast.error('Informe uma duração válida (meses)');
    if (!Number.isFinite(price) || price < 0) return toast.error('Informe um valor válido');
    if (!Number.isFinite(consultations) || consultations < 0)
      return toast.error('Informe um número de consultas válido');

    const rules = [];
    for (const r of form.discount_rules) {
      const percent = Number(String(r.percent || '').replace(',', '.'));
      if (r.treatments.length === 0) return toast.error('Cada desconto precisa de ao menos um tratamento');
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100)
        return toast.error('Desconto deve ser entre 1% e 100%');
      const maxUses = r.maxUses.trim() === '' ? null : Math.round(Number(r.maxUses));
      if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1))
        return toast.error('Limite de usos inválido');
      rules.push({
        id: r.id,
        label: r.treatments.join(', '),
        treatments: r.treatments,
        percent,
        max_uses: maxUses,
      });
    }

    setLoading(true);
    try {
      const input = {
        name,
        subtitle: form.subtitle.trim() || null,
        duration_months: Math.round(duration),
        price,
        included_consultations: Math.round(consultations),
        included_consultation_treatments: form.included_consultation_treatments,
        discount_rules: rules,
        perks: form.perks.map(p => p.trim()).filter(Boolean),
      };

      if (editingPlan) {
        await treatmentPlansService.update(editingPlan.id, input);
        toast.success('Plano atualizado');
      } else {
        await treatmentPlansService.create(input);
        toast.success('Plano criado');
      }
      resetForm();
      await loadPlans();
      onChanged?.();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar plano');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (plan: TreatmentPlan) => {
    if (!window.confirm(`Excluir o plano "${plan.name}"?`)) return;
    try {
      await treatmentPlansService.delete(plan.id);
      toast.success('Plano excluído');
      if (editingPlan?.id === plan.id) resetForm();
      await loadPlans();
      onChanged?.();
    } catch {
      toast.error('Erro ao excluir plano');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-primary" />
            Programa de Fidelidade
          </DialogTitle>
          <DialogDescription className="text-sm">
            Pacotes de benefícios que o paciente contrata por um período pagando um valor —
            como um clube de vantagens da clínica. Não é desconto avulso nem fica preso a um orçamento.
          </DialogDescription>
          <div className="mt-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
            <div>
              <p className="font-medium text-foreground">Um plano pode incluir:</p>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li>Consultas de prevenção/profilaxia já inclusas no valor</li>
                <li>Descontos automáticos por tipo de tratamento</li>
                <li>Brindes e benefícios (ex.: kit de higiene)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">Como usar:</p>
              <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                <li>Crie os planos aqui (nome, valor, duração, consultas, descontos e brindes).</li>
                <li>Na ficha do paciente, ative um plano — gera um orçamento com o valor para pagamento.</li>
                <li>A partir daí os descontos entram automático nos orçamentos e as consultas inclusas vão sendo abatidas a cada atendimento.</li>
              </ol>
            </div>
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-[1.2fr_1fr] max-h-[75vh]">
          {/* Form */}
          <ScrollArea className="p-6 border-r">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Nome do plano *</Label>
                <Input
                  value={form.name}
                  onChange={e => patch({ name: e.target.value })}
                  placeholder="Ex: Plano Semente"
                />
              </div>

              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input
                  value={form.subtitle}
                  onChange={e => patch({ subtitle: e.target.value })}
                  placeholder="Ex: Cuidado preventivo essencial"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor do plano (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={e => patch({ price: e.target.value })}
                  placeholder="Ex: 500,00"
                />
                <p className="text-xs text-muted-foreground">
                  Ao ativar o plano para um paciente, é gerado um orçamento com esse valor para aprovação e pagamento.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Duração (meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.duration_months}
                    onChange={e => patch({ duration_months: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Consultas incluídas</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.included_consultations}
                    onChange={e => patch({ included_consultations: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tratamentos incluídos (cobertos pelo plano)</Label>
                <TreatmentPicker
                  value={form.included_consultation_treatments}
                  onChange={v => patch({ included_consultation_treatments: v })}
                  placeholder="Ex: Limpeza, Avaliação, Profilaxia"
                />
                <p className="text-xs text-muted-foreground">
                  No orçamento, esses tratamentos viram R$0 "Coberto pelo plano" (até o limite de consultas incluídas) e baixam o saldo.
                </p>
              </div>

              {/* Discounts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Descontos por categoria
                  </Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addRule}>
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </Button>
                </div>
                {form.discount_rules.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum desconto. Ex: Restauração → 30%.</p>
                )}
                <div className="space-y-3">
                  {form.discount_rules.map(rule => (
                    <div key={rule.id} className="rounded-lg border p-3 space-y-2.5 bg-slate-50/50">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <TreatmentPicker
                            value={rule.treatments}
                            onChange={v => updateRule(rule.id, { treatments: v })}
                            placeholder="Tratamentos com esse desconto"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-red-600 hover:text-red-700"
                          onClick={() => removeRule(rule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Desconto (%)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            step="1"
                            value={rule.percent}
                            onChange={e => updateRule(rule.id, { percent: e.target.value })}
                            placeholder="30"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Limite de usos (opcional)</Label>
                          <Input
                            type="number"
                            min={1}
                            value={rule.maxUses}
                            onChange={e => updateRule(rule.id, { maxUses: e.target.value })}
                            placeholder="Sem limite"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Perks */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5" /> Benefícios
                  </Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={addPerk}>
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </Button>
                </div>
                {form.perks.length === 0 && (
                  <p className="text-xs text-muted-foreground">Ex: 1 kit de higiene bucal infantil.</p>
                )}
                <div className="space-y-2">
                  {form.perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={perk}
                        onChange={e => updatePerk(i, e.target.value)}
                        placeholder="Ex: 1 kit de higiene bucal infantil"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-red-600 hover:text-red-700"
                        onClick={() => removePerk(i)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {editingPlan && (
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Cancelar
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-[#a03f3d] hover:bg-[#8b3634]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {editingPlan ? 'Salvar alterações' : 'Criar plano'}
                </Button>
              </div>
            </div>
          </ScrollArea>

          {/* List */}
          <ScrollArea className="p-4">
            <p className="text-xs font-medium text-muted-foreground px-2 mb-2">
              Planos cadastrados ({plans.length})
            </p>
            {plans.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">Nenhum plano cadastrado.</div>
            ) : (
              <div className="space-y-2">
                {plans.map(plan => (
                  <div
                    key={plan.id}
                    className={`rounded-lg border p-3 ${editingPlan?.id === plan.id ? 'border-[#a03f3d] ring-1 ring-[#a03f3d]/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{plan.name}</p>
                        {plan.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{plan.subtitle}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(plan)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(plan)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>
                        {plan.price > 0 && <span className="font-medium text-foreground">R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • </span>}
                        {plan.duration_months} meses • {plan.included_consultations} consulta(s) incluída(s)
                      </p>
                      {plan.discount_rules.map(r => (
                        <p key={r.id}>• {r.percent}% em {r.label}{r.max_uses != null ? ` (máx ${r.max_uses})` : ''}</p>
                      ))}
                      {plan.perks.map((p, i) => (
                        <p key={i}>🎁 {p}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
