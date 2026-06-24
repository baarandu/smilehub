import { useState } from 'react';
import { HeartHandshake, Gift, Tag, CalendarDays, AlertTriangle, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDisplayDate } from '@/utils/budgetUtils';
import { usePatientTreatmentPlan } from '@/hooks/usePatientTreatmentPlan';

interface PatientPlanCardProps {
  patientId: string;
}

export function PatientPlanCard({ patientId }: PatientPlanCardProps) {
  const { subscription, plans, usage, isLoading, enroll, enrolling, cancel, cancelling } =
    usePatientTreatmentPlan(patientId);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  if (isLoading) return null;

  // ---- No active subscription: enroll UI ----
  if (!subscription) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 py-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <HeartHandshake className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Sem plano de fidelidade ativo</p>
              <p className="text-xs text-muted-foreground">
                {plans.length === 0
                  ? 'Cadastre planos em Configurações → Programa de Fidelidade.'
                  : 'Ative um plano para aplicar descontos e consultas incluídas.'}
              </p>
            </div>
          </div>
          {plans.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Escolher plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedPlanId || enrolling}
                onClick={() => {
                  const plan = plans.find(p => p.id === selectedPlanId);
                  if (plan) enroll(plan);
                }}
                className="bg-[#a03f3d] hover:bg-[#8b3634]"
              >
                Ativar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ---- Active subscription ----
  const snap = subscription.plan_snapshot;
  const today = new Date().toISOString().slice(0, 10);
  const expired = subscription.end_date < today;
  const exhausted = snap.included_consultations > 0 && usage.consultationsRemaining === 0;
  const usedPct = snap.included_consultations > 0
    ? Math.min((usage.consultationsUsed / snap.included_consultations) * 100, 100)
    : 0;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <HeartHandshake className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold leading-tight">{snap.name}</p>
              {snap.subtitle && <p className="text-xs text-muted-foreground">{snap.subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {expired && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                Expirado
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-red-600 gap-1"
              disabled={cancelling}
              onClick={() => {
                if (window.confirm(`Cancelar o plano "${snap.name}" deste paciente?`)) cancel(subscription.id);
              }}
            >
              <X className="w-3.5 h-3.5" /> Cancelar
            </Button>
          </div>
        </div>

        {/* Validity + price */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Vigência: {formatDisplayDate(subscription.start_date)} a {formatDisplayDate(subscription.end_date)}
          </span>
          {snap.price > 0 && (
            <span className="font-medium text-foreground">
              Valor: R$ {snap.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {/* Consultations balance */}
        {snap.included_consultations > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Consultas incluídas</span>
              <span className={`font-semibold ${exhausted ? 'text-amber-600' : 'text-emerald-600'}`}>
                {usage.consultationsRemaining} de {snap.included_consultations} restantes
              </span>
            </div>
            <Progress value={usedPct} className="h-2" />
            {exhausted && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                Consultas do plano esgotadas — próximas serão avulsas.
              </p>
            )}
          </div>
        )}

        {/* Discounts */}
        {snap.discount_rules.length > 0 && (
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tag className="w-3.5 h-3.5" /> Descontos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {snap.discount_rules.map(rule => {
                const uses = usage.ruleUses[rule.id] || 0;
                const limited = rule.max_uses != null;
                const ruleExhausted = limited && uses >= (rule.max_uses as number);
                return (
                  <Badge
                    key={rule.id}
                    variant="secondary"
                    className={`font-normal ${ruleExhausted ? 'line-through opacity-60' : ''}`}
                  >
                    {rule.percent}% {rule.label}
                    {limited && ` (${uses}/${rule.max_uses})`}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Perks */}
        {snap.perks.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {snap.perks.map((perk, i) => (
              <Badge key={i} variant="outline" className="font-normal gap-1">
                <Gift className="w-3 h-3" /> {perk}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
