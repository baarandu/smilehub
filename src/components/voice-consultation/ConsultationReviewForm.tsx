import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { ExtractedConsultationData, ConfidenceLevel } from '@/types/voiceConsultation';

export interface ConsultationFormState {
  chiefComplaint: string;
  procedures: string;
  treatmentPlan: string;
  suggestedReturnDate: string;
  notes: string;
}

export function extractedToConsultationForm(
  extracted: ExtractedConsultationData | null,
): ConsultationFormState {
  return {
    chiefComplaint: extracted?.chiefComplaint || '',
    procedures: extracted?.procedures || '',
    treatmentPlan: extracted?.treatmentPlan || '',
    suggestedReturnDate: extracted?.suggestedReturnDate || '',
    notes: extracted?.notes || '',
  };
}

function AIBadge() {
  return (
    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0 font-medium">
      IA
    </Badge>
  );
}

const CONFIDENCE_COLORS = {
  high: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-red-100 text-red-700 border-red-200',
};

const CONFIDENCE_LABELS = { high: 'Alta', medium: 'Média', low: 'Baixa' };

interface ConsultationReviewFormProps {
  data: ConsultationFormState;
  onChange: (data: ConsultationFormState) => void;
  confidence: ConfidenceLevel;
  aiExtracted: ExtractedConsultationData | null;
}

export function ConsultationReviewForm({
  data,
  onChange,
  confidence,
  aiExtracted,
}: ConsultationReviewFormProps) {
  const isAI = (field: keyof ExtractedConsultationData) => !!(aiExtracted && aiExtracted[field]);

  return (
    <div className="space-y-4">
      {/* Confidence */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">Confiança:</span>
        <Badge variant="outline" className={CONFIDENCE_COLORS[confidence]}>
          {CONFIDENCE_LABELS[confidence]}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          Queixa Principal {isAI('chiefComplaint') && <AIBadge />}
        </Label>
        <Textarea
          value={data.chiefComplaint}
          onChange={(e) => onChange({ ...data, chiefComplaint: e.target.value })}
          placeholder="O que motivou a consulta..."
          className={`min-h-[100px] ${isAI('chiefComplaint') ? 'bg-blue-50/50 border-blue-200' : ''}`}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          Procedimentos Realizados {isAI('procedures') && <AIBadge />}
        </Label>
        <Textarea
          value={data.procedures}
          onChange={(e) => onChange({ ...data, procedures: e.target.value })}
          placeholder="Procedimentos executados durante a consulta..."
          className={`min-h-[100px] ${isAI('procedures') ? 'bg-blue-50/50 border-blue-200' : ''}`}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          Plano de Tratamento {isAI('treatmentPlan') && <AIBadge />}
        </Label>
        <Textarea
          value={data.treatmentPlan}
          onChange={(e) => onChange({ ...data, treatmentPlan: e.target.value })}
          placeholder="Próximos passos do tratamento..."
          className={`min-h-[100px] ${isAI('treatmentPlan') ? 'bg-blue-50/50 border-blue-200' : ''}`}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          Data de Retorno {isAI('suggestedReturnDate') && <AIBadge />}
        </Label>
        <Input
          type="date"
          value={data.suggestedReturnDate}
          onChange={(e) => onChange({ ...data, suggestedReturnDate: e.target.value })}
          className={isAI('suggestedReturnDate') ? 'bg-blue-50/50 border-blue-200' : ''}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          Notas Adicionais {isAI('notes') && <AIBadge />}
        </Label>
        <Textarea
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="Observações adicionais sobre a consulta..."
          className={`min-h-[80px] ${isAI('notes') ? 'bg-blue-50/50 border-blue-200' : ''}`}
        />
      </div>
    </div>
  );
}
