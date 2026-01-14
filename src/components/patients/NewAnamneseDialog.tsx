import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useCreateAnamnese, useUpdateAnamnese } from '@/hooks/useAnamneses';
import { toast } from 'sonner';
import type { Anamnese } from '@/types/database';

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
    date: new Date().toISOString().split('T')[0],
    medicalTreatment: false,
    medicalTreatmentDetails: '',
    recentSurgery: false,
    recentSurgeryDetails: '',
    healingProblems: false,
    healingProblemsDetails: '',
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
    notes: '',
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
          notes: anamnese.notes || '',
        });
      } else {
        setForm({
          date: new Date().toISOString().split('T')[0],
          medicalTreatment: false,
          medicalTreatmentDetails: '',
          recentSurgery: false,
          recentSurgeryDetails: '',
          healingProblems: false,
          healingProblemsDetails: '',
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
          notes: '',
        });
      }
    }
  }, [open, anamnese?.id]);

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
        notes: form.notes || null,
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

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Data */}
            <div className="space-y-2">
              <Label>Data da Anamnese *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <Separator />

            {/* Tratamento Médico */}
            <QuestionField
              label="Está em tratamento médico?"
              value={form.medicalTreatment}
              onValueChange={(value) => setForm({ ...form, medicalTreatment: value })}
              details={form.medicalTreatmentDetails}
              onDetailsChange={(text) => setForm({ ...form, medicalTreatmentDetails: text })}
            />

            {/* Cirurgia Recente */}
            <QuestionField
              label="Teve cirurgia recente?"
              value={form.recentSurgery}
              onValueChange={(value) => setForm({ ...form, recentSurgery: value })}
              details={form.recentSurgeryDetails}
              onDetailsChange={(text) => setForm({ ...form, recentSurgeryDetails: text })}
            />

            {/* Problemas de Cicatrização */}
            <QuestionField
              label="Tem problemas de cicatrização?"
              value={form.healingProblems}
              onValueChange={(value) => setForm({ ...form, healingProblems: value })}
              details={form.healingProblemsDetails}
              onDetailsChange={(text) => setForm({ ...form, healingProblemsDetails: text })}
            />

            {/* Medicação Atual */}
            <QuestionField
              label="Está tomando medicação?"
              value={form.currentMedication}
              onValueChange={(value) => setForm({ ...form, currentMedication: value })}
              details={form.currentMedicationDetails}
              onDetailsChange={(text) => setForm({ ...form, currentMedicationDetails: text })}
            />

            {/* Alergia Geral */}
            <QuestionField
              label="Tem alguma alergia?"
              value={form.allergy}
              onValueChange={(value) => setForm({ ...form, allergy: value })}
              details={form.allergyDetails}
              onDetailsChange={(text) => setForm({ ...form, allergyDetails: text })}
              detailsPlaceholder="Quais alergias?"
            />

            {/* Alergia Medicamentosa */}
            <QuestionField
              label="Tem alergia medicamentosa?"
              value={form.drugAllergy}
              onValueChange={(value) => setForm({ ...form, drugAllergy: value })}
              details={form.drugAllergyDetails}
              onDetailsChange={(text) => setForm({ ...form, drugAllergyDetails: text })}
              detailsPlaceholder="Quais medicamentos?"
            />

            {/* Medicação Contínua */}
            <QuestionField
              label="Faz uso de medicação contínua?"
              value={form.continuousMedication}
              onValueChange={(value) => setForm({ ...form, continuousMedication: value })}
              details={form.continuousMedicationDetails}
              onDetailsChange={(text) => setForm({ ...form, continuousMedicationDetails: text })}
              detailsPlaceholder="Quais medicações?"
            />

            {/* Histórico de Anestesia Local */}
            <QuestionField
              label="Tem histórico de anestesia local?"
              value={form.localAnesthesiaHistory}
              onValueChange={(value) => setForm({ ...form, localAnesthesiaHistory: value })}
              details={form.localAnesthesiaHistoryDetails}
              onDetailsChange={(text) => setForm({ ...form, localAnesthesiaHistoryDetails: text })}
            />

            {/* Reação à Anestesia */}
            <QuestionField
              label="Já teve reação à anestesia?"
              value={form.anesthesiaReaction}
              onValueChange={(value) => setForm({ ...form, anesthesiaReaction: value })}
              details={form.anesthesiaReactionDetails}
              onDetailsChange={(text) => setForm({ ...form, anesthesiaReactionDetails: text })}
            />

            {/* Gestante ou Amamentando */}
            <QuestionField
              label="Está gestante ou amamentando?"
              value={form.pregnantOrBreastfeeding}
              onValueChange={(value) => setForm({ ...form, pregnantOrBreastfeeding: value })}
              details={form.pregnantOrBreastfeedingDetails}
              onDetailsChange={(text) => setForm({ ...form, pregnantOrBreastfeedingDetails: text })}
            />

            {/* Fumante ou Bebe */}
            <QuestionField
              label="É fumante ou etilista?"
              value={form.smokerOrDrinker}
              onValueChange={(value) => setForm({ ...form, smokerOrDrinker: value })}
              details={form.smokerOrDrinkerDetails}
              onDetailsChange={(text) => setForm({ ...form, smokerOrDrinkerDetails: text })}
            />

            {/* Jejum */}
            <QuestionField
              label="Está em jejum?"
              value={form.fasting}
              onValueChange={(value) => setForm({ ...form, fasting: value })}
              details={form.fastingDetails}
              onDetailsChange={(text) => setForm({ ...form, fastingDetails: text })}
            />

            {/* Diabetes */}
            <QuestionField
              label="Tem diabetes?"
              value={form.diabetes}
              onValueChange={(value) => setForm({ ...form, diabetes: value })}
              details={form.diabetesDetails}
              onDetailsChange={(text) => setForm({ ...form, diabetesDetails: text })}
            />

            {/* Depressão, Ansiedade ou Pânico */}
            <QuestionField
              label="Tem depressão, ansiedade ou pânico?"
              value={form.depressionAnxietyPanic}
              onValueChange={(value) => setForm({ ...form, depressionAnxietyPanic: value })}
              details={form.depressionAnxietyPanicDetails}
              onDetailsChange={(text) => setForm({ ...form, depressionAnxietyPanicDetails: text })}
            />

            {/* Convulsão ou Epilepsia */}
            <QuestionField
              label="Tem convulsão ou epilepsia?"
              value={form.seizureEpilepsy}
              onValueChange={(value) => setForm({ ...form, seizureEpilepsy: value })}
              details={form.seizureEpilepsyDetails}
              onDetailsChange={(text) => setForm({ ...form, seizureEpilepsyDetails: text })}
            />

            {/* Doença Cardíaca */}
            <QuestionField
              label="Tem doença cardíaca?"
              value={form.heartDisease}
              onValueChange={(value) => setForm({ ...form, heartDisease: value })}
              details={form.heartDiseaseDetails}
              onDetailsChange={(text) => setForm({ ...form, heartDiseaseDetails: text })}
            />

            {/* Hipertensão */}
            <QuestionField
              label="Tem hipertensão?"
              value={form.hypertension}
              onValueChange={(value) => setForm({ ...form, hypertension: value })}
              details={form.hypertensionDetails}
              onDetailsChange={(text) => setForm({ ...form, hypertensionDetails: text })}
            />

            {/* Marca-passo */}
            <QuestionField
              label="Tem marca-passo?"
              value={form.pacemaker}
              onValueChange={(value) => setForm({ ...form, pacemaker: value })}
              details={form.pacemakerDetails}
              onDetailsChange={(text) => setForm({ ...form, pacemakerDetails: text })}
            />

            {/* Doença Infecciosa */}
            <QuestionField
              label="Tem doença infecciosa?"
              value={form.infectiousDisease}
              onValueChange={(value) => setForm({ ...form, infectiousDisease: value })}
              details={form.infectiousDiseaseDetails}
              onDetailsChange={(text) => setForm({ ...form, infectiousDiseaseDetails: text })}
            />

            {/* Artrite */}
            <QuestionField
              label="Tem artrite?"
              value={form.arthritis}
              onValueChange={(value) => setForm({ ...form, arthritis: value })}
              details={form.arthritisDetails}
              onDetailsChange={(text) => setForm({ ...form, arthritisDetails: text })}
            />

            {/* Gastrite ou Refluxo */}
            <QuestionField
              label="Tem gastrite ou refluxo?"
              value={form.gastritisReflux}
              onValueChange={(value) => setForm({ ...form, gastritisReflux: value })}
              details={form.gastritisRefluxDetails}
              onDetailsChange={(text) => setForm({ ...form, gastritisRefluxDetails: text })}
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


