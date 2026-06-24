import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useFatorR } from '@/hooks/useProlabore';
import { formatMoney } from '@/utils/budgetUtils';

interface FatorRCardProps {
  year: number;
  month: number; // 1-based
  compact?: boolean;
  onConfigure?: () => void;
  /** When true, renders the detailed educational explanation below the card. */
  explain?: boolean;
}

/**
 * Detailed, dentist-friendly explanation of what the Fator R is, how it is
 * calculated and why it determines whether the clinic is taxed under Anexo III
 * (cheaper) or Anexo V (more expensive). Rendered only where `explain` is set.
 */
function FatorRExplanation({ threshold }: { threshold: string }) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-200/70 space-y-4 text-sm text-slate-600">
      <div>
        <p className="flex items-center gap-2 font-semibold text-slate-800">
          <Info className="w-4 h-4 text-[#7a3b3b]" />
          O que é o Fator R?
        </p>
        <p className="mt-1 leading-relaxed">
          É um cálculo do <strong>Simples Nacional</strong> que define em qual tabela de impostos
          (anexo) a sua clínica é tributada. Ele mede o quanto você gasta com pessoas em relação
          ao que fatura. Quanto maior a proporção de folha de pagamento, menor tende a ser o seu imposto.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-800">Como é calculado?</p>
        <div className="mt-2 p-3 bg-white/70 border border-slate-200 rounded-lg">
          <p className="font-mono text-[13px] text-slate-700 text-center">
            Fator R = Folha de pagamento (12 meses) ÷ Faturamento (12 meses)
          </p>
        </div>
        <p className="mt-2 leading-relaxed">
          A <strong>folha</strong> considera os últimos 12 meses e inclui o seu
          <strong> pró-labore</strong>, os salários dos funcionários e os encargos (INSS, FGTS, 13º e
          férias). O <strong>faturamento</strong> é a receita bruta dos mesmos 12 meses. Por isso o
          valor muda mês a mês, conforme a janela de 12 meses avança.
        </p>
      </div>

      <div>
        <p className="font-semibold text-slate-800">Por que o limite de {threshold}% importa?</p>
        <div className="mt-2 space-y-2">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-emerald-800 leading-relaxed">
              <strong>Fator R igual ou acima de {threshold}% → Anexo III.</strong> Alíquotas começam
              em torno de 6%. É a situação mais vantajosa para a maioria dos consultórios.
            </p>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-red-800 leading-relaxed">
              <strong>Fator R abaixo de {threshold}% → Anexo V.</strong> Alíquotas começam em torno de
              15,5% — bem mais caro. Acontece quando a folha/pró-labore é baixa demais frente ao
              faturamento.
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-[#7a3b3b]/5 border border-[#7a3b3b]/15 rounded-lg">
        <p className="flex items-center gap-2 font-semibold text-[#7a3b3b]">
          <TrendingUp className="w-4 h-4" />
          Na prática
        </p>
        <p className="mt-1 leading-relaxed text-slate-600">
          Muitos dentistas ajustam o próprio <strong>pró-labore</strong> para manter o Fator R em pelo
          menos {threshold}% e permanecer no Anexo III, pagando menos imposto. Por isso esse indicador
          fica aqui junto da gestão de pró-labore: pequenas mudanças na folha podem trocar o anexo e
          alterar bastante o imposto devido. Consulte sempre o seu contador antes de decidir.
        </p>
      </div>
    </div>
  );
}

const STATUS_THEME = {
  bom: {
    bg: 'bg-emerald-50/70 border-emerald-200',
    text: 'text-emerald-700',
    accent: 'text-emerald-600',
    Icon: CheckCircle2,
    label: 'Anexo III garantido',
    tag: 'bg-emerald-100 text-emerald-700',
  },
  atencao: {
    bg: 'bg-amber-50/70 border-amber-200',
    text: 'text-amber-700',
    accent: 'text-amber-600',
    Icon: AlertTriangle,
    label: 'Próximo do limite',
    tag: 'bg-amber-100 text-amber-700',
  },
  critico: {
    bg: 'bg-red-50/70 border-red-200',
    text: 'text-red-700',
    accent: 'text-red-600',
    Icon: AlertCircle,
    label: 'Risco de Anexo V',
    tag: 'bg-red-100 text-red-700',
  },
} as const;

/**
 * Renders a compact alert banner only when Fator R is at "atencao" or "critico".
 * Use in dashboard headers to avoid visual noise when everything is fine.
 */
export function FatorRAlertBanner({ year, month, onConfigure }: FatorRCardProps) {
  const { data } = useFatorR(year, month);
  if (!data || data.status === 'bom') return null;
  return <FatorRCard year={year} month={month} compact onConfigure={onConfigure} />;
}

export function FatorRCard({ year, month, compact, onConfigure, explain }: FatorRCardProps) {
  const { data, isLoading, error } = useFatorR(year, month);

  const theme = useMemo(() => {
    if (!data) return STATUS_THEME.bom;
    return STATUS_THEME[data.status];
  }, [data]);

  if (isLoading) {
    return (
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4 text-sm text-slate-400">Calculando Fator R...</CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Info className="w-4 h-4" />
            Configure o regime tributário em Configurações Fiscais para acompanhar o Fator R.
          </div>
          {explain && <FatorRExplanation threshold="28" />}
        </CardContent>
      </Card>
    );
  }

  const Icon = theme.Icon;
  const pct = data.fator_r_percent.toFixed(2);
  const threshold = data.threshold_percent.toFixed(0);

  if (compact) {
    return (
      <Card className={theme.bg}>
        <CardContent className="p-3 flex items-center gap-3">
          <Icon className={`w-6 h-6 ${theme.accent}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${theme.text}`}>{pct}%</span>
              <Badge className={`text-[10px] h-5 ${theme.tag}`}>Fator R</Badge>
            </div>
            <p className={`text-xs ${theme.accent}`}>{theme.label} (mínimo {threshold}%)</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={theme.bg}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${theme.accent}`} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Fator R (últimos 12 meses)
              </p>
              <p className={`text-3xl font-bold ${theme.text}`}>{pct}%</p>
            </div>
          </div>
          <Badge className={`${theme.tag} text-[11px]`}>{theme.label}</Badge>
        </div>

        <div className="mt-3 space-y-1.5">
          {/* Progress bar */}
          <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full ${
                data.status === 'bom'
                  ? 'bg-emerald-500'
                  : data.status === 'atencao'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, (data.fator_r_percent / Math.max(35, data.threshold_percent * 1.25)) * 100)}%` }}
            />
            {/* threshold marker */}
            <div
              className="absolute top-0 h-full w-0.5 bg-slate-700"
              style={{ left: `${(data.threshold_percent / Math.max(35, data.threshold_percent * 1.25)) * 100}%` }}
              title={`Limite ${threshold}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0%</span>
            <span>limite {threshold}%</span>
            <span>{Math.max(35, Math.round(data.threshold_percent * 1.25))}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Faturamento 12m</p>
            <p className="font-semibold text-slate-700">R$ {formatMoney(data.faturamento_12m)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Folha 12m</p>
            <p className="font-semibold text-slate-700">R$ {formatMoney(data.folha_12m)}</p>
            <p className="text-[10px] text-slate-400">
              {formatMoney(data.folha_prolabore_12m)} pró-labore · {formatMoney(data.folha_expenses_12m)} folha
            </p>
          </div>
        </div>

        {data.status !== 'bom' && data.deficit_to_threshold > 0 && (
          <div className={`mt-3 p-2 rounded text-xs ${theme.tag}`}>
            <TrendingUp className="w-3 h-3 inline-block mr-1" />
            Para manter o Anexo III, falta <strong>R$ {formatMoney(data.deficit_to_threshold)}</strong> em folha de pagamento/pró-labore.
          </div>
        )}

        {onConfigure && (
          <button
            onClick={onConfigure}
            className="mt-3 text-xs text-slate-500 hover:text-slate-700 underline"
          >
            Configurar pró-labore e limite
          </button>
        )}

        {explain && <FatorRExplanation threshold={threshold} />}
      </CardContent>
    </Card>
  );
}
