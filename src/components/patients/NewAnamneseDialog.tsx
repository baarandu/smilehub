import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateAnamnese, useUpdateAnamnese } from '@/hooks/useAnamneses';
import { toast } from 'sonner';
import type { Anamnese } from '@/types/database';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { InlineVoiceRecorder } from '@/components/voice-consultation/InlineVoiceRecorder';
import { extractedToFormState } from '@/components/voice-consultation/AnamnesisReviewForm';
import type { ExtractionResult } from '@/types/voiceConsultation';

interface NewAnamneseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  anamnese?: Anamnese | null;
  onSuccess?: () => void;
}

interface QuestionFieldProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  details?: string;
  onDetailsChange?: (text: string) => void;
  showDetails?: boolean;
  detailsPlaceholder?: string;
}

function QuestionField({
  label,
  value,
  onValueChange,
  details,
  onDetailsChange,
  showDetails = true,
  detailsPlaceholder = 'Especifique...',
}: QuestionFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-normal">{label}</Label>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${!value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
            Não
          </span>
          <Switch checked={value} onCheckedChange={onValueChange} />
          <span className={`text-sm ${value ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
            Sim
          </span>
        </div>
      </div>
      {value && showDetails && onDetailsChange && (
        <div className="pl-2">
          <Textarea
            value={details || ''}
            onChange={(e) => onDetailsChange(e.target.value)}
            placeholder={detailsPlaceholder}
            className="min-h-[80px]"
          />
        </div>
      )}
    </div>
  );
}

export function NewAnamneseDialog({
  open,
  onOpenChange,
  patientId,
  anamnese,
  onSuccess,
}: NewAnamneseDialogProps) {
  const createAnamnese = useCreateAnamnese();
  const updateAnamnese = useUpdateAnamnese();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    medicalTreatment: false,
    medicalTreatmentDetails: '',
    recentSurgery: false,
    recentSurgeryDetails: '',
    healingProblems: false,
    healingProblemsDetails: '',
    respiratoryProblems: false,
    respiratoryProblemsDetails: '',
    currentMedication: false,
    currentMedicationDetails: '',
    allergy: false,
    allergyDetails: '',
    drugAllergy: false,
    drugAllergyDetails: '',
    continuousMedication: false,
    continuousMedicationDetails: '',
    localAnesthesiaHistory: false,
    localAnesthesiaHistoryDetails: '',
    anesthesiaReaction: false,
    anesthesiaReactionDetails: '',
    pregnantOrBreastfeeding: false,
    pregnantOrBreastfeedingDetails: '',
    smokerOrDrinker: false,
    smokerOrDrinkerDetails: '',
    fasting: false,
    fastingDetails: '',
    diabetes: false,
    diabetesDetails: '',
    depressionAnxietyPanic: false,
    depressionAnxietyPanicDetails: '',
    seizureEpilepsy: false,
    seizureEpilepsyDetails: '',
    heartDisease: false,
    heartDiseaseDetails: '',
    hypertension: false,
    hypertensionDetails: '',
    pacemaker: false,
    pacemakerDetails: '',
    infectiousDisease: false,
    infectiousDiseaseDetails: '',
    arthritis: false,
    arthritisDetails: '',
    gastritisReflux: false,
    gastritisRefluxDetails: '',
    bruxismDtmOrofacialPain: false,
    bruxismDtmOrofacialPainDetails: '',
    notes: '',
    observations: '',
  });

  useEffect(() => {
    if (open) {
      if (anamnese) {
        setForm({
          date: anamnese.date,
          medicalTreatment: anamnese.medical_treatment,
          medicalTreatmentDetails: anamnese.medical_treatment_details || '',
          recentSurgery: anamnese.recent_surgery,
          recentSurgeryDetails: anamnese.recent_surgery_details || '',
          healingProblems: anamnese.healing_problems,
          healingProblemsDetails: anamnese.healing_problems_details || '',
          respiratoryProblems: (anamnese as any).respiratory_problems || false,
          respiratoryProblemsDetails: (anamnese as any).respiratory_problems_details || '',
          currentMedication: anamnese.current_medication,
          currentMedicationDetails: anamnese.current_medication_details || '',
          allergy: anamnese.allergy || false,
          allergyDetails: anamnese.allergy_details || '',
          drugAllergy: (anamnese as any).drug_allergy || false,
          drugAllergyDetails: (anamnese as any).drug_allergy_details || '',
          continuousMedication: (anamnese as any).continuous_medication || false,
          continuousMedicationDetails: (anamnese as any).continuous_medication_details || '',
          localAnesthesiaHistory: anamnese.local_anesthesia_history,
          localAnesthesiaHistoryDetails: (anamnese as any).local_anesthesia_history_details || '',
          anesthesiaReaction: anamnese.anesthesia_reaction,
          anesthesiaReactionDetails: anamnese.anesthesia_reaction_details || '',
          pregnantOrBreastfeeding: anamnese.pregnant_or_breastfeeding,
          pregnantOrBreastfeedingDetails: (anamnese as any).pregnant_or_breastfeeding_details || '',
          smokerOrDrinker: anamnese.smoker_or_drinker,
          smokerOrDrinkerDetails: anamnese.smoker_or_drinker_details || '',
          fasting: anamnese.fasting,
          fastingDetails: (anamnese as any).fasting_details || '',
          diabetes: anamnese.diabetes,
          diabetesDetails: anamnese.diabetes_details || '',
          depressionAnxietyPanic: anamnese.depression_anxiety_panic,
          depressionAnxietyPanicDetails: anamnese.depression_anxiety_panic_details || '',
          seizureEpilepsy: anamnese.seizure_epilepsy,
          seizureEpilepsyDetails: anamnese.seizure_epilepsy_details || '',
          heartDisease: anamnese.heart_disease,
          heartDiseaseDetails: anamnese.heart_disease_details || '',
          hypertension: anamnese.hypertension,
          hypertensionDetails: (anamnese as any).hypertension_details || '',
          pacemaker: anamnese.pacemaker,
          pacemakerDetails: (anamnese as any).pacemaker_details || '',
          infectiousDisease: anamnese.infectious_disease,
          infectiousDiseaseDetails: anamnese.infectious_disease_details || '',
          arthritis: anamnese.arthritis,
          arthritisDetails: (anamnese as any).arthritis_details || '',
          gastritisReflux: anamnese.gastritis_reflux,
          gastritisRefluxDetails: (anamnese as any).gastritis_reflux_details || '',
          bruxismDtmOrofacialPain: (anamnese as any).bruxism_dtm_orofacial_pain || false,
          bruxismDtmOrofacialPainDetails: (anamnese as any).bruxism_dtm_orofacial_pain_details || '',
          notes: anamnese.notes || '',
          observations: anamnese.observations || '',
        });
      } else {
        setForm({
          date: (() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          })(),
          medicalTreatment: false,
          medicalTreatmentDetails: '',
          recentSurgery: false,
          recentSurgeryDetails: '',
          healingProblems: false,
          healingProblemsDetails: '',
          respiratoryProblems: false,
          respiratoryProblemsDetails: '',
          currentMedication: false,
          currentMedicationDetails: '',
          allergy: false,
          allergyDetails: '',
          drugAllergy: false,
          drugAllergyDetails: '',
          continuousMedication: false,
          continuousMedicationDetails: '',
          localAnesthesiaHistory: false,
          localAnesthesiaHistoryDetails: '',
          anesthesiaReaction: false,
          anesthesiaReactionDetails: '',
          pregnantOrBreastfeeding: false,
          pregnantOrBreastfeedingDetails: '',
          smokerOrDrinker: false,
          smokerOrDrinkerDetails: '',
          fasting: false,
          fastingDetails: '',
          diabetes: false,
          diabetesDetails: '',
          depressionAnxietyPanic: false,
          depressionAnxietyPanicDetails: '',
          seizureEpilepsy: false,
          seizureEpilepsyDetails: '',
          heartDisease: false,
          heartDiseaseDetails: '',
          hypertension: false,
          hypertensionDetails: '',
          pacemaker: false,
          pacemakerDetails: '',
          infectiousDisease: false,
          infectiousDiseaseDetails: '',
          arthritis: false,
          arthritisDetails: '',
          gastritisReflux: false,
          gastritisRefluxDetails: '',
          bruxismDtmOrofacialPain: false,
          bruxismDtmOrofacialPainDetails: '',
          notes: '',
          observations: '',
        });
      }
    }
  }, [open, anamnese?.id]);

  const handleVoiceResult = (result: ExtractionResult) => {
    const mapped = extractedToFormState(result.anamnesis);
    setForm(prev => ({ ...prev, ...mapped }));
    if (result.consultation?.chiefComplaint) {
      setForm(prev => ({ ...prev, notes: result.consultation.chiefComplaint }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const anamneseData = {
        patient_id: patientId,
        date: form.date,
        medical_treatment: form.medicalTreatment,
        medical_treatment_details: form.medicalTreatment ? form.medicalTreatmentDetails || null : null,
        recent_surgery: form.recentSurgery,
        recent_surgery_details: form.recentSurgery ? form.recentSurgeryDetails || null : null,
        healing_problems: form.healingProblems,
        healing_problems_details: form.healingProblems ? form.healingProblemsDetails || null : null,
        respiratory_problems: form.respiratoryProblems,
        respiratory_problems_details: form.respiratoryProblems ? form.respiratoryProblemsDetails || null : null,
        current_medication: form.currentMedication,
        current_medication_details: form.currentMedication ? form.currentMedicationDetails || null : null,
        allergy: form.allergy,
        allergy_details: form.allergy ? form.allergyDetails || null : null,
        drug_allergy: form.drugAllergy,
        drug_allergy_details: form.drugAllergy ? form.drugAllergyDetails || null : null,
        continuous_medication: form.continuousMedication,
        continuous_medication_details: form.continuousMedication ? form.continuousMedicationDetails || null : null,
        local_anesthesia_history: form.localAnesthesiaHistory,
        local_anesthesia_history_details: form.localAnesthesiaHistory ? form.localAnesthesiaHistoryDetails || null : null,
        anesthesia_reaction: form.anesthesiaReaction,
        anesthesia_reaction_details: form.anesthesiaReaction ? form.anesthesiaReactionDetails || null : null,
        pregnant_or_breastfeeding: form.pregnantOrBreastfeeding,
        pregnant_or_breastfeeding_details: form.pregnantOrBreastfeeding ? form.pregnantOrBreastfeedingDetails || null : null,
        smoker_or_drinker: form.smokerOrDrinker,
        smoker_or_drinker_details: form.smokerOrDrinker ? form.smokerOrDrinkerDetails || null : null,
        fasting: form.fasting,
        fasting_details: form.fasting ? form.fastingDetails || null : null,
        diabetes: form.diabetes,
        diabetes_details: form.diabetes ? form.diabetesDetails || null : null,
        depression_anxiety_panic: form.depressionAnxietyPanic,
        depression_anxiety_panic_details: form.depressionAnxietyPanic ? form.depressionAnxietyPanicDetails || null : null,
        seizure_epilepsy: form.seizureEpilepsy,
        seizure_epilepsy_details: form.seizureEpilepsy ? form.seizureEpilepsyDetails || null : null,
        heart_disease: form.heartDisease,
        heart_disease_details: form.heartDisease ? form.heartDiseaseDetails || null : null,
        hypertension: form.hypertension,
        hypertension_details: form.hypertension ? form.hypertensionDetails || null : null,
        pacemaker: form.pacemaker,
        pacemaker_details: form.pacemaker ? form.pacemakerDetails || null : null,
        infectious_disease: form.infectiousDisease,
        infectious_disease_details: form.infectiousDisease ? form.infectiousDiseaseDetails || null : null,
        arthritis: form.arthritis,
        arthritis_details: form.arthritis ? form.arthritisDetails || null : null,
        gastritis_reflux: form.gastritisReflux,
        gastritis_reflux_details: form.gastritisReflux ? form.gastritisRefluxDetails || null : null,
        bruxism_dtm_orofacial_pain: form.bruxismDtmOrofacialPain,
        bruxism_dtm_orofacial_pain_details: form.bruxismDtmOrofacialPain ? form.bruxismDtmOrofacialPainDetails || null : null,
        notes: form.notes || null,
        observations: form.observations || null,
      };

      if (anamnese) {
        await updateAnamnese.mutateAsync({ id: anamnese.id, data: anamneseData });
        toast.success('Anamnese atualizada com sucesso!');
      } else {
        await createAnamnese.mutateAsync(anamneseData);
        toast.success('Anamnese registrada com sucesso!');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving anamnese:', error);
      toast.error(`Não foi possível ${anamnese ? 'atualizar' : 'registrar'} a anamnese`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{anamnese ? 'Editar Anamnese' : 'Nova Anamnese'}</DialogTitle>
        </DialogHeader>

        {!anamnese && (
          <div className="px-1 pb-2">
            <InlineVoiceRecorder patientId={patientId} onResult={handleVoiceResult} />
          </div>
        )}

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Data */}
            <div className="space-y-2">
              <Label>Data da Anamnese *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.date ? (() => {
                      const formatted = format(new Date(form.date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                      return formatted.replace(/de (\w)/, (match, letter) => `de ${letter.toUpperCase()}`);
                    })() : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.date ? new Date(form.date + 'T12:00:00') : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setForm({ ...form, date: `${year}-${month}-${day}` });
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Separator />

            {/* Tratamento Médico */}
            <QuestionField
              label="Está em algum tratamento médico?"
              value={form.medicalTreatment}
              onValueChange={(value) => setForm({ ...form, medicalTreatment: value })}
              details={form.medicalTreatmentDetails}
              onDetailsChange={(text) => setForm({ ...form, medicalTreatmentDetails: text })}
              detailsPlaceholder="Qual tratamento?"
            />

            {/* Cirurgia Recente */}
            <QuestionField
              label="Cirurgia recente?"
              value={form.recentSurgery}
              onValueChange={(value) => setForm({ ...form, recentSurgery: value })}
              details={form.recentSurgeryDetails}
              onDetailsChange={(text) => setForm({ ...form, recentSurgeryDetails: text })}
              detailsPlaceholder="Qual cirurgia e quando?"
            />

            {/* Problemas de Cicatrização */}
            <QuestionField
              label="Problema de cicatrização?"
              value={form.healingProblems}
              onValueChange={(value) => setForm({ ...form, healingProblems: value })}
              details={form.healingProblemsDetails}
              onDetailsChange={(text) => setForm({ ...form, healingProblemsDetails: text })}
              detailsPlaceholder="Descreva o problema"
            />

            {/* Problemas Respiratórios */}
            <QuestionField
              label="Tem doença respiratória?"
              value={form.respiratoryProblems}
              onValueChange={(value) => setForm({ ...form, respiratoryProblems: value })}
              details={form.respiratoryProblemsDetails}
              onDetailsChange={(text) => setForm({ ...form, respiratoryProblemsDetails: text })}
              detailsPlaceholder="Qual problema?"
            />

            {/* Medicação */}
            <QuestionField
              label="Faz ou está fazendo uso de alguma medicação?"
              value={form.currentMedication}
              onValueChange={(value) => setForm({ ...form, currentMedication: value })}
              details={form.currentMedicationDetails}
              onDetailsChange={(text) => setForm({ ...form, currentMedicationDetails: text })}
              detailsPlaceholder="Quais medicações?"
            />

            {/* Alergia */}
            <QuestionField
              label="Tem algum tipo de alergia?"
              value={form.allergy}
              onValueChange={(value) => setForm({ ...form, allergy: value })}
              details={form.allergyDetails}
              onDetailsChange={(text) => setForm({ ...form, allergyDetails: text })}
              detailsPlaceholder="Quais alergias? (medicamentos, alimentos, materiais, etc.)"
            />

            {/* Reação Adversa à Anestesia Local */}
            <QuestionField
              label="Tem histórico de reação adversa à anestesia local?"
              value={form.localAnesthesiaHistory}
              onValueChange={(value) => setForm({ ...form, localAnesthesiaHistory: value })}
              details={form.localAnesthesiaHistoryDetails}
              onDetailsChange={(text) => setForm({ ...form, localAnesthesiaHistoryDetails: text })}
              detailsPlaceholder="Descreva a reação"
            />

            {/* Diabetes */}
            <QuestionField
              label="Tem diabetes?"
              value={form.diabetes}
              onValueChange={(value) => setForm({ ...form, diabetes: value })}
              details={form.diabetesDetails}
              onDetailsChange={(text) => setForm({ ...form, diabetesDetails: text })}
              detailsPlaceholder="Tipo e tratamento"
            />

            {/* Depressão, Ansiedade ou Pânico */}
            <QuestionField
              label="Depressão, pânico ou ansiedade?"
              value={form.depressionAnxietyPanic}
              onValueChange={(value) => setForm({ ...form, depressionAnxietyPanic: value })}
              details={form.depressionAnxietyPanicDetails}
              onDetailsChange={(text) => setForm({ ...form, depressionAnxietyPanicDetails: text })}
              detailsPlaceholder="Descreva o quadro"
            />

            {/* Convulsão ou Epilepsia */}
            <QuestionField
              label="Histórico de convulsão ou epilepsia?"
              value={form.seizureEpilepsy}
              onValueChange={(value) => setForm({ ...form, seizureEpilepsy: value })}
              details={form.seizureEpilepsyDetails}
              onDetailsChange={(text) => setForm({ ...form, seizureEpilepsyDetails: text })}
              detailsPlaceholder="Frequência e medicação"
            />

            {/* Doença Cardíaca */}
            <QuestionField
              label="Tem cardiopatia?"
              value={form.heartDisease}
              onValueChange={(value) => setForm({ ...form, heartDisease: value })}
              details={form.heartDiseaseDetails}
              onDetailsChange={(text) => setForm({ ...form, heartDiseaseDetails: text })}
              detailsPlaceholder="Qual condição?"
            />

            {/* Hipertensão */}
            <QuestionField
              label="Tem hipertensão?"
              value={form.hypertension}
              onValueChange={(value) => setForm({ ...form, hypertension: value })}
              details={form.hypertensionDetails}
              onDetailsChange={(text) => setForm({ ...form, hypertensionDetails: text })}
              detailsPlaceholder="Tratamento?"
            />

            {/* Marca-passo */}
            <QuestionField
              label="Tem marca-passo?"
              value={form.pacemaker}
              onValueChange={(value) => setForm({ ...form, pacemaker: value })}
              details={form.pacemakerDetails}
              onDetailsChange={(text) => setForm({ ...form, pacemakerDetails: text })}
              detailsPlaceholder="Modelo/tipo?"
            />

            {/* Artrite */}
            <QuestionField
              label="Tem artrite?"
              value={form.arthritis}
              onValueChange={(value) => setForm({ ...form, arthritis: value })}
              details={form.arthritisDetails}
              onDetailsChange={(text) => setForm({ ...form, arthritisDetails: text })}
              detailsPlaceholder="Qual tipo?"
            />

            {/* Gastrite ou Refluxo */}
            <QuestionField
              label="Tem gastrite ou refluxo?"
              value={form.gastritisReflux}
              onValueChange={(value) => setForm({ ...form, gastritisReflux: value })}
              details={form.gastritisRefluxDetails}
              onDetailsChange={(text) => setForm({ ...form, gastritisRefluxDetails: text })}
              detailsPlaceholder="Tratamento?"
            />

            {/* Doença Infecciosa */}
            <QuestionField
              label="Alguma doença infecciosa ou importante?"
              value={form.infectiousDisease}
              onValueChange={(value) => setForm({ ...form, infectiousDisease: value })}
              details={form.infectiousDiseaseDetails}
              onDetailsChange={(text) => setForm({ ...form, infectiousDiseaseDetails: text })}
              detailsPlaceholder="Qual doença?"
            />

            {/* Gestante ou Amamentando */}
            <QuestionField
              label="Está grávida ou amamentando?"
              value={form.pregnantOrBreastfeeding}
              onValueChange={(value) => setForm({ ...form, pregnantOrBreastfeeding: value })}
              details={form.pregnantOrBreastfeedingDetails}
              onDetailsChange={(text) => setForm({ ...form, pregnantOrBreastfeedingDetails: text })}
              detailsPlaceholder="Período de gestação?"
            />

            {/* Fumante ou Bebe */}
            <QuestionField
              label="É fumante ou etilista?"
              value={form.smokerOrDrinker}
              onValueChange={(value) => setForm({ ...form, smokerOrDrinker: value })}
              details={form.smokerOrDrinkerDetails}
              onDetailsChange={(text) => setForm({ ...form, smokerOrDrinkerDetails: text })}
              detailsPlaceholder="Frequência/quantidade"
            />

            {/* Jejum */}
            <QuestionField
              label="Está de jejum?"
              value={form.fasting}
              onValueChange={(value) => setForm({ ...form, fasting: value })}
              details={form.fastingDetails}
              onDetailsChange={(text) => setForm({ ...form, fastingDetails: text })}
              detailsPlaceholder="Há quanto tempo?"
            />

            {/* Bruxismo, DTM ou Dor Orofacial */}
            <QuestionField
              label="Tem bruxismo, DTM ou dor orofacial?"
              value={form.bruxismDtmOrofacialPain}
              onValueChange={(value) => setForm({ ...form, bruxismDtmOrofacialPain: value })}
              details={form.bruxismDtmOrofacialPainDetails}
              onDetailsChange={(text) => setForm({ ...form, bruxismDtmOrofacialPainDetails: text })}
              detailsPlaceholder="Descreva os sintomas"
            />

            <Separator />

            {/* Queixa Principal */}
            <div className="space-y-2">
              <Label>Queixa Principal</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Descreva a queixa principal do paciente..."
                className="min-h-[100px]"
              />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                placeholder="Outras observações relevantes..."
                className="min-h-[100px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : anamnese ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


