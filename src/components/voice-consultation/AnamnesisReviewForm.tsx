import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { ExtractedAnamnesisData, AnamnesisCondition, ConfidenceLevel } from '@/types/voiceConsultation';

// Form state with flattened booleans and details
export interface AnamnesisFormState {
  medicalTreatment: boolean;
  medicalTreatmentDetails: string;
  recentSurgery: boolean;
  recentSurgeryDetails: string;
  healingProblems: boolean;
  healingProblemsDetails: string;
  respiratoryProblems: boolean;
  respiratoryProblemsDetails: string;
  currentMedication: boolean;
  currentMedicationDetails: string;
  allergy: boolean;
  allergyDetails: string;
  drugAllergy: boolean;
  drugAllergyDetails: string;
  continuousMedication: boolean;
  continuousMedicationDetails: string;
  localAnesthesiaHistory: boolean;
  localAnesthesiaHistoryDetails: string;
  anesthesiaReaction: boolean;
  anesthesiaReactionDetails: string;
  pregnantOrBreastfeeding: boolean;
  pregnantOrBreastfeedingDetails: string;
  smokerOrDrinker: boolean;
  smokerOrDrinkerDetails: string;
  fasting: boolean;
  fastingDetails: string;
  diabetes: boolean;
  diabetesDetails: string;
  depressionAnxietyPanic: boolean;
  depressionAnxietyPanicDetails: string;
  seizureEpilepsy: boolean;
  seizureEpilepsyDetails: string;
  heartDisease: boolean;
  heartDiseaseDetails: string;
  hypertension: boolean;
  hypertensionDetails: string;
  pacemaker: boolean;
  pacemakerDetails: string;
  infectiousDisease: boolean;
  infectiousDiseaseDetails: string;
  arthritis: boolean;
  arthritisDetails: string;
  gastritisReflux: boolean;
  gastritisRefluxDetails: string;
  bruxismDtmOrofacialPain: boolean;
  bruxismDtmOrofacialPainDetails: string;
  notes: string;
  observations: string;
}

// Convert extracted AI data to form state
export function extractedToFormState(extracted: ExtractedAnamnesisData | null): AnamnesisFormState {
  const c = (cond: AnamnesisCondition | undefined) => ({
    value: cond?.value === true,
    details: cond?.details || '',
  });

  if (!extracted) {
    return getEmptyAnamnesisForm();
  }

  return {
    medicalTreatment: c(extracted.medicalTreatment).value,
    medicalTreatmentDetails: c(extracted.medicalTreatment).details,
    recentSurgery: c(extracted.recentSurgery).value,
    recentSurgeryDetails: c(extracted.recentSurgery).details,
    healingProblems: c(extracted.healingProblems).value,
    healingProblemsDetails: c(extracted.healingProblems).details,
    respiratoryProblems: c(extracted.respiratoryProblems).value,
    respiratoryProblemsDetails: c(extracted.respiratoryProblems).details,
    currentMedication: c(extracted.currentMedication).value,
    currentMedicationDetails: c(extracted.currentMedication).details,
    allergy: c(extracted.allergy).value,
    allergyDetails: c(extracted.allergy).details,
    drugAllergy: c(extracted.drugAllergy).value,
    drugAllergyDetails: c(extracted.drugAllergy).details,
    continuousMedication: c(extracted.continuousMedication).value,
    continuousMedicationDetails: c(extracted.continuousMedication).details,
    localAnesthesiaHistory: c(extracted.localAnesthesiaHistory).value,
    localAnesthesiaHistoryDetails: c(extracted.localAnesthesiaHistory).details,
    anesthesiaReaction: c(extracted.anesthesiaReaction).value,
    anesthesiaReactionDetails: c(extracted.anesthesiaReaction).details,
    pregnantOrBreastfeeding: c(extracted.pregnantOrBreastfeeding).value,
    pregnantOrBreastfeedingDetails: c(extracted.pregnantOrBreastfeeding).details,
    smokerOrDrinker: c(extracted.smokerOrDrinker).value,
    smokerOrDrinkerDetails: c(extracted.smokerOrDrinker).details,
    fasting: c(extracted.fasting).value,
    fastingDetails: c(extracted.fasting).details,
    diabetes: c(extracted.diabetes).value,
    diabetesDetails: c(extracted.diabetes).details,
    depressionAnxietyPanic: c(extracted.depressionAnxietyPanic).value,
    depressionAnxietyPanicDetails: c(extracted.depressionAnxietyPanic).details,
    seizureEpilepsy: c(extracted.seizureEpilepsy).value,
    seizureEpilepsyDetails: c(extracted.seizureEpilepsy).details,
    heartDisease: c(extracted.heartDisease).value,
    heartDiseaseDetails: c(extracted.heartDisease).details,
    hypertension: c(extracted.hypertension).value,
    hypertensionDetails: c(extracted.hypertension).details,
    pacemaker: c(extracted.pacemaker).value,
    pacemakerDetails: c(extracted.pacemaker).details,
    infectiousDisease: c(extracted.infectiousDisease).value,
    infectiousDiseaseDetails: c(extracted.infectiousDisease).details,
    arthritis: c(extracted.arthritis).value,
    arthritisDetails: c(extracted.arthritis).details,
    gastritisReflux: c(extracted.gastritisReflux).value,
    gastritisRefluxDetails: c(extracted.gastritisReflux).details,
    bruxismDtmOrofacialPain: c(extracted.bruxismDtmOrofacialPain).value,
    bruxismDtmOrofacialPainDetails: c(extracted.bruxismDtmOrofacialPain).details,
    notes: extracted.notes || '',
    observations: extracted.observations || '',
  };
}

export function getEmptyAnamnesisForm(): AnamnesisFormState {
  return {
    medicalTreatment: false, medicalTreatmentDetails: '',
    recentSurgery: false, recentSurgeryDetails: '',
    healingProblems: false, healingProblemsDetails: '',
    respiratoryProblems: false, respiratoryProblemsDetails: '',
    currentMedication: false, currentMedicationDetails: '',
    allergy: false, allergyDetails: '',
    drugAllergy: false, drugAllergyDetails: '',
    continuousMedication: false, continuousMedicationDetails: '',
    localAnesthesiaHistory: false, localAnesthesiaHistoryDetails: '',
    anesthesiaReaction: false, anesthesiaReactionDetails: '',
    pregnantOrBreastfeeding: false, pregnantOrBreastfeedingDetails: '',
    smokerOrDrinker: false, smokerOrDrinkerDetails: '',
    fasting: false, fastingDetails: '',
    diabetes: false, diabetesDetails: '',
    depressionAnxietyPanic: false, depressionAnxietyPanicDetails: '',
    seizureEpilepsy: false, seizureEpilepsyDetails: '',
    heartDisease: false, heartDiseaseDetails: '',
    hypertension: false, hypertensionDetails: '',
    pacemaker: false, pacemakerDetails: '',
    infectiousDisease: false, infectiousDiseaseDetails: '',
    arthritis: false, arthritisDetails: '',
    gastritisReflux: false, gastritisRefluxDetails: '',
    bruxismDtmOrofacialPain: false, bruxismDtmOrofacialPainDetails: '',
    notes: '', observations: '',
  };
}

interface AnamnesisReviewFormProps {
  data: AnamnesisFormState;
  onChange: (data: AnamnesisFormState) => void;
  confidence: ConfidenceLevel;
  aiExtracted: ExtractedAnamnesisData | null;
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

interface QuestionFieldProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  details: string;
  onDetailsChange: (text: string) => void;
  detailsPlaceholder?: string;
  isAI: boolean;
}

function QuestionField({
  label,
  value,
  onValueChange,
  details,
  onDetailsChange,
  detailsPlaceholder = 'Especifique...',
  isAI,
}: QuestionFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-normal flex items-center gap-1.5">
          {label} {isAI && <AIBadge />}
        </Label>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${!value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Não</span>
          <Switch checked={value} onCheckedChange={onValueChange} />
          <span className={`text-sm ${value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Sim</span>
        </div>
      </div>
      {value && (
        <div className="pl-2">
          <Textarea
            value={details}
            onChange={(e) => onDetailsChange(e.target.value)}
            placeholder={detailsPlaceholder}
            className={`min-h-[80px] ${isAI && details ? 'bg-blue-50/50 border-blue-200' : ''}`}
          />
        </div>
      )}
    </div>
  );
}

const QUESTIONS: {
  key: string;
  label: string;
  placeholder: string;
}[] = [
  { key: 'medicalTreatment', label: 'Está em algum tratamento médico?', placeholder: 'Qual tratamento?' },
  { key: 'recentSurgery', label: 'Cirurgia recente?', placeholder: 'Qual cirurgia e quando?' },
  { key: 'healingProblems', label: 'Problema de cicatrização?', placeholder: 'Descreva o problema' },
  { key: 'respiratoryProblems', label: 'Tem doença respiratória?', placeholder: 'Qual problema?' },
  { key: 'currentMedication', label: 'Faz uso de alguma medicação?', placeholder: 'Quais medicações?' },
  { key: 'allergy', label: 'Tem algum tipo de alergia?', placeholder: 'Quais alergias?' },
  { key: 'drugAllergy', label: 'Alergia a medicamentos?', placeholder: 'Quais medicamentos?' },
  { key: 'continuousMedication', label: 'Medicação de uso contínuo?', placeholder: 'Quais medicações?' },
  { key: 'localAnesthesiaHistory', label: 'Reação adversa à anestesia local?', placeholder: 'Descreva a reação' },
  { key: 'anesthesiaReaction', label: 'Reação à anestesia?', placeholder: 'Descreva a reação' },
  { key: 'diabetes', label: 'Tem diabetes?', placeholder: 'Tipo e tratamento' },
  { key: 'depressionAnxietyPanic', label: 'Depressão, pânico ou ansiedade?', placeholder: 'Descreva o quadro' },
  { key: 'seizureEpilepsy', label: 'Convulsão ou epilepsia?', placeholder: 'Frequência e medicação' },
  { key: 'heartDisease', label: 'Tem cardiopatia?', placeholder: 'Qual condição?' },
  { key: 'hypertension', label: 'Tem hipertensão?', placeholder: 'Tratamento?' },
  { key: 'pacemaker', label: 'Tem marca-passo?', placeholder: 'Modelo/tipo?' },
  { key: 'arthritis', label: 'Tem artrite?', placeholder: 'Qual tipo?' },
  { key: 'gastritisReflux', label: 'Tem gastrite ou refluxo?', placeholder: 'Tratamento?' },
  { key: 'infectiousDisease', label: 'Alguma doença infecciosa?', placeholder: 'Qual doença?' },
  { key: 'pregnantOrBreastfeeding', label: 'Está grávida ou amamentando?', placeholder: 'Período de gestação?' },
  { key: 'smokerOrDrinker', label: 'É fumante ou etilista?', placeholder: 'Frequência/quantidade' },
  { key: 'fasting', label: 'Está de jejum?', placeholder: 'Há quanto tempo?' },
  { key: 'bruxismDtmOrofacialPain', label: 'Bruxismo, DTM ou dor orofacial?', placeholder: 'Descreva os sintomas' },
];

export function AnamnesisReviewForm({
  data,
  onChange,
  confidence,
  aiExtracted,
}: AnamnesisReviewFormProps) {
  const isAIField = (key: string): boolean => {
    if (!aiExtracted) return false;
    const cond = (aiExtracted as any)[key] as AnamnesisCondition | undefined;
    return cond?.value !== null && cond?.value !== undefined;
  };

  return (
    <div className="space-y-4">
      {/* Confidence */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">Confiança:</span>
        <Badge variant="outline" className={CONFIDENCE_COLORS[confidence]}>
          {CONFIDENCE_LABELS[confidence]}
        </Badge>
      </div>

      {QUESTIONS.map((q) => {
        const boolKey = q.key as keyof AnamnesisFormState;
        const detailsKey = `${q.key}Details` as keyof AnamnesisFormState;
        return (
          <QuestionField
            key={q.key}
            label={q.label}
            value={data[boolKey] as boolean}
            onValueChange={(v) => onChange({ ...data, [boolKey]: v })}
            details={data[detailsKey] as string}
            onDetailsChange={(text) => onChange({ ...data, [detailsKey]: text })}
            detailsPlaceholder={q.placeholder}
            isAI={isAIField(q.key)}
          />
        );
      })}

      {/* Notes */}
      <div className="space-y-2 pt-4">
        <Label className="flex items-center gap-1.5">
          Queixa Principal {aiExtracted?.notes && <AIBadge />}
        </Label>
        <Textarea
          value={data.notes}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="Descreva a queixa principal do paciente..."
          className={`min-h-[100px] ${aiExtracted?.notes ? 'bg-blue-50/50 border-blue-200' : ''}`}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          Observações {aiExtracted?.observations && <AIBadge />}
        </Label>
        <Textarea
          value={data.observations}
          onChange={(e) => onChange({ ...data, observations: e.target.value })}
          placeholder="Outras observações relevantes..."
          className={`min-h-[100px] ${aiExtracted?.observations ? 'bg-blue-50/50 border-blue-200' : ''}`}
        />
      </div>
    </div>
  );
}
