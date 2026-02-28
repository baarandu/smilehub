import { useState, useEffect, useCallback } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateChildAnamnesis, useUpdateChildAnamnesis } from '@/hooks/useChildAnamneses';
import { toast } from 'sonner';
import type { ChildAnamnesis } from '@/types/childAnamnesis';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { InlineVoiceRecorder } from '@/components/voice-consultation/InlineVoiceRecorder';
import type { ExtractionResult, AnamnesisCondition } from '@/types/voiceConsultation';

interface NewChildAnamneseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  anamnesis?: ChildAnamnesis | null;
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

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const emptyForm = {
  date: getToday(),
  // Histórico Médico
  pregnancyType: '',
  birthType: '',
  pregnancyComplications: false,
  pregnancyComplicationsDetails: '',
  pregnancyMedications: false,
  pregnancyMedicationsDetails: '',
  birthWeight: '',
  exclusiveBreastfeedingDuration: '',
  totalBreastfeedingDuration: '',
  currentHealth: '',
  chronicDisease: false,
  chronicDiseaseDetails: '',
  hospitalized: false,
  hospitalizedDetails: '',
  surgery: false,
  surgeryDetails: '',
  respiratoryProblems: false,
  respiratoryProblemsDetails: '',
  cardiopathy: false,
  cardiopathyDetails: '',
  continuousMedication: false,
  continuousMedicationDetails: '',
  frequentAntibiotics: false,
  frequentAntibioticsDetails: '',
  drugAllergy: false,
  drugAllergyDetails: '',
  foodAllergy: false,
  foodAllergyDetails: '',
  // Histórico Odontológico
  previousDentist: false,
  firstVisitAge: '',
  lastDentalVisit: '',
  lastVisitReason: '',
  previousProcedures: [] as string[],
  localAnesthesia: false,
  anesthesiaGoodReaction: false,
  anesthesiaAdverseReaction: '',
  frequentCankerSores: false,
  dentalTrauma: false,
  dentalTraumaDetails: '',
  traumaAffectedTooth: '',
  traumaReceivedTreatment: '',
  chiefComplaint: '',
  // Higiene Oral
  brushingBy: '',
  brushingFrequency: '',
  brushingStartAge: '',
  hygieneInstruction: false,
  fluorideToothpaste: false,
  toothpasteBrand: '',
  dentalFloss: false,
  dentalFlossDetails: '',
  mouthwash: false,
  mouthwashDetails: '',
  // Alimentação
  wasBreastfed: false,
  usedBottle: false,
  usedBottleDetails: '',
  currentlyUsesBottle: false,
  usesPacifier: false,
  sugarFrequency: '',
  sugarBeforeBed: false,
  sleepsAfterSugarLiquid: false,
  // Hábitos Parafuncionais
  nailBiting: false,
  objectBiting: false,
  thumbSucking: false,
  prolongedPacifier: false,
  teethGrinding: false,
  teethGrindingDetails: '',
  mouthBreathing: false,
  // Comportamento
  behavior: '',
  managementTechniques: false,
  managementTechniquesDetails: '',
  // Exame Clínico
  dentition: '',
  plaqueIndex: '',
  cariesLesions: '',
  visibleBiofilm: '',
  gingivalChanges: '',
  mucosaChanges: '',
  occlusalChanges: '',
  radiographyNeeded: '',
  treatmentPlan: '',
  // Extraoral
  facialSymmetry: '',
  facialProfile: '',
  lipCompetence: '',
  palpableLymphNodes: false,
  palpableLymphNodesDetails: '',
  atm: '',
  breathingType: '',
  // Intraoral
  labialFrenum: '',
  lingualFrenum: '',
  jugalMucosa: '',
  jugalMucosaDetails: '',
  lips: '',
  gingiva: '',
  palate: '',
  tongue: '',
  tongueDetails: '',
  oropharynxTonsils: '',
  observedHygiene: '',
  // Hábitos Funcionais
  deglutition: '',
  alteredPhonation: false,
  // Avaliação Facial
  facialPattern: '',
  // Avaliação Oclusal
  angleClass: '',
  crossbite: '',
  openBite: '',
  overjet: '',
  overbite: '',
  midlineDeviation: false,
  observations: '',
};

type FormState = typeof emptyForm;

const PROCEDURES_OPTIONS = [
  { value: 'restauracao', label: 'Restauração' },
  { value: 'extracao', label: 'Extração' },
  { value: 'endodontia', label: 'Tratamento endodôntico' },
  { value: 'selante', label: 'Selante' },
  { value: 'fluor', label: 'Aplicação de flúor' },
  { value: 'ortodontia', label: 'Ortodontia' },
];

export function NewChildAnamneseDialog({
  open,
  onOpenChange,
  patientId,
  anamnesis,
  onSuccess,
}: NewChildAnamneseDialogProps) {
  const createAnamnesis = useCreateChildAnamnesis();
  const updateAnamnesis = useUpdateChildAnamnesis();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });

  useEffect(() => {
    if (open) {
      if (anamnesis) {
        setForm({
          date: anamnesis.date,
          pregnancyType: anamnesis.pregnancy_type || '',
          birthType: anamnesis.birth_type || '',
          pregnancyComplications: anamnesis.pregnancy_complications || false,
          pregnancyComplicationsDetails: anamnesis.pregnancy_complications_details || '',
          pregnancyMedications: anamnesis.pregnancy_medications || false,
          pregnancyMedicationsDetails: anamnesis.pregnancy_medications_details || '',
          birthWeight: anamnesis.birth_weight || '',
          exclusiveBreastfeedingDuration: anamnesis.exclusive_breastfeeding_duration || '',
          totalBreastfeedingDuration: anamnesis.total_breastfeeding_duration || '',
          currentHealth: anamnesis.current_health || '',
          chronicDisease: anamnesis.chronic_disease || false,
          chronicDiseaseDetails: anamnesis.chronic_disease_details || '',
          hospitalized: anamnesis.hospitalized || false,
          hospitalizedDetails: anamnesis.hospitalized_details || '',
          surgery: anamnesis.surgery || false,
          surgeryDetails: anamnesis.surgery_details || '',
          respiratoryProblems: anamnesis.respiratory_problems || false,
          respiratoryProblemsDetails: anamnesis.respiratory_problems_details || '',
          cardiopathy: anamnesis.cardiopathy || false,
          cardiopathyDetails: anamnesis.cardiopathy_details || '',
          continuousMedication: anamnesis.continuous_medication || false,
          continuousMedicationDetails: anamnesis.continuous_medication_details || '',
          frequentAntibiotics: anamnesis.frequent_antibiotics || false,
          frequentAntibioticsDetails: anamnesis.frequent_antibiotics_details || '',
          drugAllergy: anamnesis.drug_allergy || false,
          drugAllergyDetails: anamnesis.drug_allergy_details || '',
          foodAllergy: anamnesis.food_allergy || false,
          foodAllergyDetails: anamnesis.food_allergy_details || '',
          previousDentist: anamnesis.previous_dentist || false,
          firstVisitAge: anamnesis.first_visit_age || '',
          lastDentalVisit: anamnesis.last_dental_visit || '',
          lastVisitReason: anamnesis.last_visit_reason || '',
          previousProcedures: anamnesis.previous_procedures ? anamnesis.previous_procedures.split(',') : [],
          localAnesthesia: anamnesis.local_anesthesia || false,
          anesthesiaGoodReaction: anamnesis.anesthesia_good_reaction || false,
          anesthesiaAdverseReaction: anamnesis.anesthesia_adverse_reaction || '',
          frequentCankerSores: anamnesis.frequent_canker_sores || false,
          dentalTrauma: anamnesis.dental_trauma || false,
          dentalTraumaDetails: anamnesis.dental_trauma_details || '',
          traumaAffectedTooth: anamnesis.trauma_affected_tooth || '',
          traumaReceivedTreatment: anamnesis.trauma_received_treatment || '',
          chiefComplaint: anamnesis.chief_complaint || '',
          brushingBy: anamnesis.brushing_by || '',
          brushingFrequency: anamnesis.brushing_frequency || '',
          brushingStartAge: anamnesis.brushing_start_age || '',
          hygieneInstruction: anamnesis.hygiene_instruction || false,
          fluorideToothpaste: anamnesis.fluoride_toothpaste || false,
          toothpasteBrand: anamnesis.toothpaste_brand || '',
          dentalFloss: anamnesis.dental_floss || false,
          dentalFlossDetails: anamnesis.dental_floss_details || '',
          mouthwash: anamnesis.mouthwash || false,
          mouthwashDetails: anamnesis.mouthwash_details || '',
          wasBreastfed: anamnesis.was_breastfed || false,
          usedBottle: anamnesis.used_bottle || false,
          usedBottleDetails: anamnesis.used_bottle_details || '',
          currentlyUsesBottle: anamnesis.currently_uses_bottle || false,
          usesPacifier: anamnesis.uses_pacifier || false,
          sugarFrequency: anamnesis.sugar_frequency || '',
          sugarBeforeBed: anamnesis.sugar_before_bed || false,
          sleepsAfterSugarLiquid: anamnesis.sleeps_after_sugar_liquid || false,
          nailBiting: anamnesis.nail_biting || false,
          objectBiting: anamnesis.object_biting || false,
          thumbSucking: anamnesis.thumb_sucking || false,
          prolongedPacifier: anamnesis.prolonged_pacifier || false,
          teethGrinding: anamnesis.teeth_grinding || false,
          teethGrindingDetails: anamnesis.teeth_grinding_details || '',
          mouthBreathing: anamnesis.mouth_breathing || false,
          behavior: anamnesis.behavior || '',
          managementTechniques: anamnesis.management_techniques || false,
          managementTechniquesDetails: anamnesis.management_techniques_details || '',
          dentition: anamnesis.dentition || '',
          plaqueIndex: anamnesis.plaque_index || '',
          cariesLesions: anamnesis.caries_lesions || '',
          visibleBiofilm: anamnesis.visible_biofilm || '',
          gingivalChanges: anamnesis.gingival_changes || '',
          mucosaChanges: anamnesis.mucosa_changes || '',
          occlusalChanges: anamnesis.occlusal_changes || '',
          radiographyNeeded: anamnesis.radiography_needed || '',
          treatmentPlan: anamnesis.treatment_plan || '',
          facialSymmetry: anamnesis.facial_symmetry || '',
          facialProfile: anamnesis.facial_profile || '',
          lipCompetence: anamnesis.lip_competence || '',
          palpableLymphNodes: anamnesis.palpable_lymph_nodes || false,
          palpableLymphNodesDetails: anamnesis.palpable_lymph_nodes_details || '',
          atm: anamnesis.atm || '',
          breathingType: anamnesis.breathing_type || '',
          labialFrenum: anamnesis.labial_frenum || '',
          lingualFrenum: anamnesis.lingual_frenum || '',
          jugalMucosa: anamnesis.jugal_mucosa || '',
          jugalMucosaDetails: anamnesis.jugal_mucosa_details || '',
          lips: anamnesis.lips || '',
          gingiva: anamnesis.gingiva || '',
          palate: anamnesis.palate || '',
          tongue: anamnesis.tongue || '',
          tongueDetails: anamnesis.tongue_details || '',
          oropharynxTonsils: anamnesis.oropharynx_tonsils || '',
          observedHygiene: anamnesis.observed_hygiene || '',
          deglutition: anamnesis.deglutition || '',
          alteredPhonation: anamnesis.altered_phonation || false,
          facialPattern: anamnesis.facial_pattern || '',
          angleClass: anamnesis.angle_class || '',
          crossbite: anamnesis.crossbite || '',
          openBite: anamnesis.open_bite || '',
          overjet: anamnesis.overjet || '',
          overbite: anamnesis.overbite || '',
          midlineDeviation: anamnesis.midline_deviation || false,
          observations: anamnesis.observations || '',
        });
      } else {
        setForm({ ...emptyForm, date: getToday() });
      }
    }
  }, [open, anamnesis?.id]);

  const toggleProcedure = (proc: string) => {
    setForm(prev => ({
      ...prev,
      previousProcedures: prev.previousProcedures.includes(proc)
        ? prev.previousProcedures.filter(p => p !== proc)
        : [...prev.previousProcedures, proc],
    }));
  };

  const handleVoiceResult = useCallback((result: ExtractionResult) => {
    // The child extraction returns data under 'childAnamnesis' key
    const d = (result as any).childAnamnesis;
    if (!d) return;

    const b = (cond: AnamnesisCondition | undefined) => cond?.value === true;
    const det = (cond: AnamnesisCondition | undefined) => cond?.details || '';

    setForm(prev => ({
      ...prev,
      // Histórico Médico
      ...(d.pregnancyType != null && { pregnancyType: d.pregnancyType }),
      ...(d.birthType != null && { birthType: d.birthType }),
      ...(d.pregnancyComplications?.value != null && {
        pregnancyComplications: b(d.pregnancyComplications),
        pregnancyComplicationsDetails: det(d.pregnancyComplications),
      }),
      ...(d.pregnancyMedications?.value != null && {
        pregnancyMedications: b(d.pregnancyMedications),
        pregnancyMedicationsDetails: det(d.pregnancyMedications),
      }),
      ...(d.birthWeight != null && { birthWeight: d.birthWeight }),
      ...(d.exclusiveBreastfeedingDuration != null && { exclusiveBreastfeedingDuration: d.exclusiveBreastfeedingDuration }),
      ...(d.totalBreastfeedingDuration != null && { totalBreastfeedingDuration: d.totalBreastfeedingDuration }),
      ...(d.currentHealth != null && { currentHealth: d.currentHealth }),
      ...(d.chronicDisease?.value != null && {
        chronicDisease: b(d.chronicDisease),
        chronicDiseaseDetails: det(d.chronicDisease),
      }),
      ...(d.hospitalized?.value != null && {
        hospitalized: b(d.hospitalized),
        hospitalizedDetails: det(d.hospitalized),
      }),
      ...(d.surgery?.value != null && {
        surgery: b(d.surgery),
        surgeryDetails: det(d.surgery),
      }),
      ...(d.respiratoryProblems?.value != null && {
        respiratoryProblems: b(d.respiratoryProblems),
        respiratoryProblemsDetails: det(d.respiratoryProblems),
      }),
      ...(d.cardiopathy?.value != null && {
        cardiopathy: b(d.cardiopathy),
        cardiopathyDetails: det(d.cardiopathy),
      }),
      ...(d.continuousMedication?.value != null && {
        continuousMedication: b(d.continuousMedication),
        continuousMedicationDetails: det(d.continuousMedication),
      }),
      ...(d.frequentAntibiotics?.value != null && {
        frequentAntibiotics: b(d.frequentAntibiotics),
        frequentAntibioticsDetails: det(d.frequentAntibiotics),
      }),
      ...(d.drugAllergy?.value != null && {
        drugAllergy: b(d.drugAllergy),
        drugAllergyDetails: det(d.drugAllergy),
      }),
      ...(d.foodAllergy?.value != null && {
        foodAllergy: b(d.foodAllergy),
        foodAllergyDetails: det(d.foodAllergy),
      }),
      // Histórico Odontológico
      ...(d.previousDentist != null && { previousDentist: d.previousDentist === true }),
      ...(d.firstVisitAge != null && { firstVisitAge: d.firstVisitAge }),
      ...(d.lastDentalVisit != null && { lastDentalVisit: d.lastDentalVisit }),
      ...(d.lastVisitReason != null && { lastVisitReason: d.lastVisitReason }),
      ...(d.previousProcedures != null && { previousProcedures: d.previousProcedures }),
      ...(d.localAnesthesia != null && { localAnesthesia: d.localAnesthesia === true }),
      ...(d.anesthesiaGoodReaction != null && { anesthesiaGoodReaction: d.anesthesiaGoodReaction === true }),
      ...(d.anesthesiaAdverseReaction != null && { anesthesiaAdverseReaction: d.anesthesiaAdverseReaction }),
      ...(d.frequentCankerSores != null && { frequentCankerSores: d.frequentCankerSores === true }),
      ...(d.dentalTrauma?.value != null && {
        dentalTrauma: b(d.dentalTrauma),
        dentalTraumaDetails: det(d.dentalTrauma),
      }),
      ...(d.traumaAffectedTooth != null && { traumaAffectedTooth: d.traumaAffectedTooth }),
      ...(d.traumaReceivedTreatment != null && { traumaReceivedTreatment: d.traumaReceivedTreatment }),
      ...(d.chiefComplaint != null && { chiefComplaint: d.chiefComplaint }),
      // Higiene Oral
      ...(d.brushingBy != null && { brushingBy: d.brushingBy }),
      ...(d.brushingFrequency != null && { brushingFrequency: d.brushingFrequency }),
      ...(d.brushingStartAge != null && { brushingStartAge: d.brushingStartAge }),
      ...(d.hygieneInstruction != null && { hygieneInstruction: d.hygieneInstruction === true }),
      ...(d.fluorideToothpaste != null && { fluorideToothpaste: d.fluorideToothpaste === true }),
      ...(d.toothpasteBrand != null && { toothpasteBrand: d.toothpasteBrand }),
      ...(d.dentalFloss?.value != null && {
        dentalFloss: b(d.dentalFloss),
        dentalFlossDetails: det(d.dentalFloss),
      }),
      ...(d.mouthwash?.value != null && {
        mouthwash: b(d.mouthwash),
        mouthwashDetails: det(d.mouthwash),
      }),
      // Alimentação
      ...(d.wasBreastfed != null && { wasBreastfed: d.wasBreastfed === true }),
      ...(d.usedBottle?.value != null && {
        usedBottle: b(d.usedBottle),
        usedBottleDetails: det(d.usedBottle),
      }),
      ...(d.currentlyUsesBottle != null && { currentlyUsesBottle: d.currentlyUsesBottle === true }),
      ...(d.usesPacifier != null && { usesPacifier: d.usesPacifier === true }),
      ...(d.sugarFrequency != null && { sugarFrequency: d.sugarFrequency }),
      ...(d.sugarBeforeBed != null && { sugarBeforeBed: d.sugarBeforeBed === true }),
      ...(d.sleepsAfterSugarLiquid != null && { sleepsAfterSugarLiquid: d.sleepsAfterSugarLiquid === true }),
      // Hábitos Parafuncionais
      ...(d.nailBiting != null && { nailBiting: d.nailBiting === true }),
      ...(d.objectBiting != null && { objectBiting: d.objectBiting === true }),
      ...(d.thumbSucking != null && { thumbSucking: d.thumbSucking === true }),
      ...(d.prolongedPacifier != null && { prolongedPacifier: d.prolongedPacifier === true }),
      ...(d.teethGrinding?.value != null && {
        teethGrinding: b(d.teethGrinding),
        teethGrindingDetails: det(d.teethGrinding),
      }),
      ...(d.mouthBreathing != null && { mouthBreathing: d.mouthBreathing === true }),
      // Comportamento
      ...(d.behavior != null && { behavior: d.behavior }),
      ...(d.managementTechniques?.value != null && {
        managementTechniques: b(d.managementTechniques),
        managementTechniquesDetails: det(d.managementTechniques),
      }),
      // Exame Clínico
      ...(d.dentition != null && { dentition: d.dentition }),
      ...(d.plaqueIndex != null && { plaqueIndex: d.plaqueIndex }),
      ...(d.cariesLesions != null && { cariesLesions: d.cariesLesions }),
      ...(d.visibleBiofilm != null && { visibleBiofilm: d.visibleBiofilm }),
      ...(d.gingivalChanges != null && { gingivalChanges: d.gingivalChanges }),
      ...(d.mucosaChanges != null && { mucosaChanges: d.mucosaChanges }),
      ...(d.occlusalChanges != null && { occlusalChanges: d.occlusalChanges }),
      ...(d.radiographyNeeded != null && { radiographyNeeded: d.radiographyNeeded }),
      ...(d.treatmentPlan != null && { treatmentPlan: d.treatmentPlan }),
      // Extraoral
      ...(d.facialSymmetry != null && { facialSymmetry: d.facialSymmetry }),
      ...(d.facialProfile != null && { facialProfile: d.facialProfile }),
      ...(d.lipCompetence != null && { lipCompetence: d.lipCompetence }),
      ...(d.palpableLymphNodes?.value != null && {
        palpableLymphNodes: b(d.palpableLymphNodes),
        palpableLymphNodesDetails: det(d.palpableLymphNodes),
      }),
      ...(d.atm != null && { atm: d.atm }),
      ...(d.breathingType != null && { breathingType: d.breathingType }),
      // Intraoral
      ...(d.labialFrenum != null && { labialFrenum: d.labialFrenum }),
      ...(d.lingualFrenum != null && { lingualFrenum: d.lingualFrenum }),
      ...(d.jugalMucosa != null && { jugalMucosa: d.jugalMucosa }),
      ...(d.jugalMucosaDetails != null && { jugalMucosaDetails: d.jugalMucosaDetails }),
      ...(d.lips != null && { lips: d.lips }),
      ...(d.gingiva != null && { gingiva: d.gingiva }),
      ...(d.palate != null && { palate: d.palate }),
      ...(d.tongue != null && { tongue: d.tongue }),
      ...(d.tongueDetails != null && { tongueDetails: d.tongueDetails }),
      ...(d.oropharynxTonsils != null && { oropharynxTonsils: d.oropharynxTonsils }),
      ...(d.observedHygiene != null && { observedHygiene: d.observedHygiene }),
      // Hábitos Funcionais
      ...(d.deglutition != null && { deglutition: d.deglutition }),
      ...(d.alteredPhonation != null && { alteredPhonation: d.alteredPhonation === true }),
      // Avaliação Facial
      ...(d.facialPattern != null && { facialPattern: d.facialPattern }),
      // Avaliação Oclusal
      ...(d.angleClass != null && { angleClass: d.angleClass }),
      ...(d.crossbite != null && { crossbite: d.crossbite }),
      ...(d.openBite != null && { openBite: d.openBite }),
      ...(d.overjet != null && { overjet: d.overjet }),
      ...(d.overbite != null && { overbite: d.overbite }),
      ...(d.midlineDeviation != null && { midlineDeviation: d.midlineDeviation === true }),
      ...(d.observations != null && { observations: d.observations }),
    }));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);

      const data: any = {
        patient_id: patientId,
        date: form.date,
        // Histórico Médico
        pregnancy_type: form.pregnancyType || null,
        birth_type: form.birthType || null,
        pregnancy_complications: form.pregnancyComplications,
        pregnancy_complications_details: form.pregnancyComplications ? form.pregnancyComplicationsDetails || null : null,
        pregnancy_medications: form.pregnancyMedications,
        pregnancy_medications_details: form.pregnancyMedications ? form.pregnancyMedicationsDetails || null : null,
        birth_weight: form.birthWeight || null,
        exclusive_breastfeeding_duration: form.exclusiveBreastfeedingDuration || null,
        total_breastfeeding_duration: form.totalBreastfeedingDuration || null,
        current_health: form.currentHealth || null,
        chronic_disease: form.chronicDisease,
        chronic_disease_details: form.chronicDisease ? form.chronicDiseaseDetails || null : null,
        hospitalized: form.hospitalized,
        hospitalized_details: form.hospitalized ? form.hospitalizedDetails || null : null,
        surgery: form.surgery,
        surgery_details: form.surgery ? form.surgeryDetails || null : null,
        respiratory_problems: form.respiratoryProblems,
        respiratory_problems_details: form.respiratoryProblems ? form.respiratoryProblemsDetails || null : null,
        cardiopathy: form.cardiopathy,
        cardiopathy_details: form.cardiopathy ? form.cardiopathyDetails || null : null,
        continuous_medication: form.continuousMedication,
        continuous_medication_details: form.continuousMedication ? form.continuousMedicationDetails || null : null,
        frequent_antibiotics: form.frequentAntibiotics,
        frequent_antibiotics_details: form.frequentAntibiotics ? form.frequentAntibioticsDetails || null : null,
        drug_allergy: form.drugAllergy,
        drug_allergy_details: form.drugAllergy ? form.drugAllergyDetails || null : null,
        food_allergy: form.foodAllergy,
        food_allergy_details: form.foodAllergy ? form.foodAllergyDetails || null : null,
        // Histórico Odontológico
        previous_dentist: form.previousDentist,
        first_visit_age: form.firstVisitAge || null,
        last_dental_visit: form.lastDentalVisit || null,
        last_visit_reason: form.lastVisitReason || null,
        previous_procedures: form.previousProcedures.length > 0 ? form.previousProcedures.join(',') : null,
        local_anesthesia: form.localAnesthesia,
        anesthesia_good_reaction: form.anesthesiaGoodReaction,
        anesthesia_adverse_reaction: form.anesthesiaAdverseReaction || null,
        frequent_canker_sores: form.frequentCankerSores,
        dental_trauma: form.dentalTrauma,
        dental_trauma_details: form.dentalTrauma ? form.dentalTraumaDetails || null : null,
        trauma_affected_tooth: form.dentalTrauma ? form.traumaAffectedTooth || null : null,
        trauma_received_treatment: form.dentalTrauma ? form.traumaReceivedTreatment || null : null,
        chief_complaint: form.chiefComplaint || null,
        // Higiene Oral
        brushing_by: form.brushingBy || null,
        brushing_frequency: form.brushingFrequency || null,
        brushing_start_age: form.brushingStartAge || null,
        hygiene_instruction: form.hygieneInstruction,
        fluoride_toothpaste: form.fluorideToothpaste,
        toothpaste_brand: form.toothpasteBrand || null,
        dental_floss: form.dentalFloss,
        dental_floss_details: form.dentalFloss ? form.dentalFlossDetails || null : null,
        mouthwash: form.mouthwash,
        mouthwash_details: form.mouthwash ? form.mouthwashDetails || null : null,
        // Alimentação
        was_breastfed: form.wasBreastfed,
        used_bottle: form.usedBottle,
        used_bottle_details: form.usedBottle ? form.usedBottleDetails || null : null,
        currently_uses_bottle: form.currentlyUsesBottle,
        uses_pacifier: form.usesPacifier,
        sugar_frequency: form.sugarFrequency || null,
        sugar_before_bed: form.sugarBeforeBed,
        sleeps_after_sugar_liquid: form.sleepsAfterSugarLiquid,
        // Hábitos Parafuncionais
        nail_biting: form.nailBiting,
        object_biting: form.objectBiting,
        thumb_sucking: form.thumbSucking,
        prolonged_pacifier: form.prolongedPacifier,
        teeth_grinding: form.teethGrinding,
        teeth_grinding_details: form.teethGrinding ? form.teethGrindingDetails || null : null,
        mouth_breathing: form.mouthBreathing,
        // Comportamento
        behavior: form.behavior || null,
        management_techniques: form.managementTechniques,
        management_techniques_details: form.managementTechniques ? form.managementTechniquesDetails || null : null,
        // Exame Clínico
        dentition: form.dentition || null,
        plaque_index: form.plaqueIndex || null,
        caries_lesions: form.cariesLesions || null,
        visible_biofilm: form.visibleBiofilm || null,
        gingival_changes: form.gingivalChanges || null,
        mucosa_changes: form.mucosaChanges || null,
        occlusal_changes: form.occlusalChanges || null,
        radiography_needed: form.radiographyNeeded || null,
        treatment_plan: form.treatmentPlan || null,
        // Extraoral
        facial_symmetry: form.facialSymmetry || null,
        facial_profile: form.facialProfile || null,
        lip_competence: form.lipCompetence || null,
        palpable_lymph_nodes: form.palpableLymphNodes,
        palpable_lymph_nodes_details: form.palpableLymphNodes ? form.palpableLymphNodesDetails || null : null,
        atm: form.atm || null,
        breathing_type: form.breathingType || null,
        // Intraoral
        labial_frenum: form.labialFrenum || null,
        lingual_frenum: form.lingualFrenum || null,
        jugal_mucosa: form.jugalMucosa || null,
        jugal_mucosa_details: form.jugalMucosa === 'alterada' ? form.jugalMucosaDetails || null : null,
        lips: form.lips || null,
        gingiva: form.gingiva || null,
        palate: form.palate || null,
        tongue: form.tongue || null,
        tongue_details: form.tongue === 'outra' ? form.tongueDetails || null : null,
        oropharynx_tonsils: form.oropharynxTonsils || null,
        observed_hygiene: form.observedHygiene || null,
        deglutition: form.deglutition || null,
        altered_phonation: form.alteredPhonation,
        facial_pattern: form.facialPattern || null,
        angle_class: form.angleClass || null,
        crossbite: form.crossbite || null,
        open_bite: form.openBite || null,
        overjet: form.overjet || null,
        overbite: form.overbite || null,
        midline_deviation: form.midlineDeviation,
        observations: form.observations || null,
      };

      if (anamnesis) {
        await updateAnamnesis.mutateAsync({ id: anamnesis.id, data });
        toast.success('Anamnese infantil atualizada com sucesso!');
      } else {
        await createAnamnesis.mutateAsync(data);
        toast.success('Anamnese infantil registrada com sucesso!');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving child anamnesis:', error);
      toast.error(`Não foi possível ${anamnesis ? 'atualizar' : 'registrar'} a anamnese infantil`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{anamnesis ? 'Editar Anamnese Infantil' : 'Nova Anamnese Infantil'}</DialogTitle>
        </DialogHeader>

        {!anamnesis && (
          <div className="px-1 pb-2">
            <InlineVoiceRecorder
              patientId={patientId}
              onResult={handleVoiceResult}
              extractionType="child"
            />
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
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setForm({ ...form, date: `${y}-${m}-${d}` });
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* ===== 2. HISTÓRICO MÉDICO GERAL ===== */}
            <Separator />
            <h3 className="font-semibold text-foreground">Histórico Médico Geral</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gestação</Label>
                <Select value={form.pregnancyType} onValueChange={(v) => setForm({ ...form, pregnancyType: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_termo">A termo</SelectItem>
                    <SelectItem value="prematuro">Prematuro</SelectItem>
                    <SelectItem value="pos_termo">Pós-termo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de parto</Label>
                <Select value={form.birthType} onValueChange={(v) => setForm({ ...form, birthType: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="cesarea">Cesárea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <QuestionField
              label="Houve intercorrências na gestação?"
              value={form.pregnancyComplications}
              onValueChange={(v) => setForm({ ...form, pregnancyComplications: v })}
              details={form.pregnancyComplicationsDetails}
              onDetailsChange={(t) => setForm({ ...form, pregnancyComplicationsDetails: t })}
              detailsPlaceholder="Quais intercorrências?"
            />

            <QuestionField
              label="Uso de antibióticos ou medicações na gestação?"
              value={form.pregnancyMedications}
              onValueChange={(v) => setForm({ ...form, pregnancyMedications: v })}
              details={form.pregnancyMedicationsDetails}
              onDetailsChange={(t) => setForm({ ...form, pregnancyMedicationsDetails: t })}
              detailsPlaceholder="Quais medicações?"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Peso ao nascer</Label>
                <Input value={form.birthWeight} onChange={(e) => setForm({ ...form, birthWeight: e.target.value })} placeholder="Ex: 3.200g" />
              </div>
              <div className="space-y-2">
                <Label>Amamentação exclusiva</Label>
                <Input value={form.exclusiveBreastfeedingDuration} onChange={(e) => setForm({ ...form, exclusiveBreastfeedingDuration: e.target.value })} placeholder="Ex: 6 meses" />
              </div>
              <div className="space-y-2">
                <Label>Amamentação total</Label>
                <Input value={form.totalBreastfeedingDuration} onChange={(e) => setForm({ ...form, totalBreastfeedingDuration: e.target.value })} placeholder="Ex: 2 anos" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Saúde atual da criança</Label>
              <Textarea value={form.currentHealth} onChange={(e) => setForm({ ...form, currentHealth: e.target.value })} placeholder="Descreva a saúde atual..." className="min-h-[80px]" />
            </div>

            <QuestionField label="Possui alguma doença crônica?" value={form.chronicDisease} onValueChange={(v) => setForm({ ...form, chronicDisease: v })} details={form.chronicDiseaseDetails} onDetailsChange={(t) => setForm({ ...form, chronicDiseaseDetails: t })} detailsPlaceholder="Qual doença?" />
            <QuestionField label="Já foi hospitalizada?" value={form.hospitalized} onValueChange={(v) => setForm({ ...form, hospitalized: v })} details={form.hospitalizedDetails} onDetailsChange={(t) => setForm({ ...form, hospitalizedDetails: t })} detailsPlaceholder="Motivo da hospitalização" />
            <QuestionField label="Já realizou cirurgia?" value={form.surgery} onValueChange={(v) => setForm({ ...form, surgery: v })} details={form.surgeryDetails} onDetailsChange={(t) => setForm({ ...form, surgeryDetails: t })} detailsPlaceholder="Qual cirurgia?" />
            <QuestionField label="Possui problemas respiratórios?" value={form.respiratoryProblems} onValueChange={(v) => setForm({ ...form, respiratoryProblems: v })} details={form.respiratoryProblemsDetails} onDetailsChange={(t) => setForm({ ...form, respiratoryProblemsDetails: t })} detailsPlaceholder="Qual problema?" />
            <QuestionField label="Possui cardiopatia?" value={form.cardiopathy} onValueChange={(v) => setForm({ ...form, cardiopathy: v })} details={form.cardiopathyDetails} onDetailsChange={(t) => setForm({ ...form, cardiopathyDetails: t })} detailsPlaceholder="Qual?" />
            <QuestionField label="Faz uso contínuo de medicação?" value={form.continuousMedication} onValueChange={(v) => setForm({ ...form, continuousMedication: v })} details={form.continuousMedicationDetails} onDetailsChange={(t) => setForm({ ...form, continuousMedicationDetails: t })} detailsPlaceholder="Qual medicação?" />
            <QuestionField label="Já fez uso frequente de antibióticos?" value={form.frequentAntibiotics} onValueChange={(v) => setForm({ ...form, frequentAntibiotics: v })} details={form.frequentAntibioticsDetails} onDetailsChange={(t) => setForm({ ...form, frequentAntibioticsDetails: t })} detailsPlaceholder="Quais?" />
            <QuestionField label="Alergia medicamentosa?" value={form.drugAllergy} onValueChange={(v) => setForm({ ...form, drugAllergy: v })} details={form.drugAllergyDetails} onDetailsChange={(t) => setForm({ ...form, drugAllergyDetails: t })} detailsPlaceholder="Qual medicamento?" />
            <QuestionField label="Alergia alimentar?" value={form.foodAllergy} onValueChange={(v) => setForm({ ...form, foodAllergy: v })} details={form.foodAllergyDetails} onDetailsChange={(t) => setForm({ ...form, foodAllergyDetails: t })} detailsPlaceholder="Qual alimento?" />

            {/* ===== 3. HISTÓRICO ODONTOLÓGICO ===== */}
            <Separator />
            <h3 className="font-semibold text-foreground">Histórico Odontológico</h3>

            <QuestionField label="Já foi ao dentista antes?" value={form.previousDentist} onValueChange={(v) => setForm({ ...form, previousDentist: v })} showDetails={false} />

            {form.previousDentist && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-2">
                <div className="space-y-2">
                  <Label>Idade na 1ª consulta</Label>
                  <Input value={form.firstVisitAge} onChange={(e) => setForm({ ...form, firstVisitAge: e.target.value })} placeholder="Ex: 3 anos" />
                </div>
                <div className="space-y-2">
                  <Label>Última consulta</Label>
                  <Input value={form.lastDentalVisit} onChange={(e) => setForm({ ...form, lastDentalVisit: e.target.value })} placeholder="Ex: Jan/2026" />
                </div>
                <div className="space-y-2">
                  <Label>Motivo da última consulta</Label>
                  <Input value={form.lastVisitReason} onChange={(e) => setForm({ ...form, lastVisitReason: e.target.value })} placeholder="Ex: Revisão" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-normal">Já realizou:</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-2">
                {PROCEDURES_OPTIONS.map((proc) => (
                  <div key={proc.value} className="flex items-center gap-2">
                    <Switch
                      checked={form.previousProcedures.includes(proc.value)}
                      onCheckedChange={() => toggleProcedure(proc.value)}
                    />
                    <span className="text-sm">{proc.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <QuestionField label="Já precisou de anestesia local?" value={form.localAnesthesia} onValueChange={(v) => setForm({ ...form, localAnesthesia: v })} showDetails={false} />
            {form.localAnesthesia && (
              <div className="pl-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Reagiu bem?</Label>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${!form.anesthesiaGoodReaction ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Não</span>
                    <Switch checked={form.anesthesiaGoodReaction} onCheckedChange={(v) => setForm({ ...form, anesthesiaGoodReaction: v })} />
                    <span className={`text-sm ${form.anesthesiaGoodReaction ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Sim</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-normal">Alguma reação adversa?</Label>
                  <Input value={form.anesthesiaAdverseReaction} onChange={(e) => setForm({ ...form, anesthesiaAdverseReaction: e.target.value })} placeholder="Descreva a reação..." />
                </div>
              </div>
            )}

            <QuestionField label="Já apresentou aftas frequentes?" value={form.frequentCankerSores} onValueChange={(v) => setForm({ ...form, frequentCankerSores: v })} showDetails={false} />

            <QuestionField label="Já sofreu trauma dental?" value={form.dentalTrauma} onValueChange={(v) => setForm({ ...form, dentalTrauma: v })} details={form.dentalTraumaDetails} onDetailsChange={(t) => setForm({ ...form, dentalTraumaDetails: t })} detailsPlaceholder="Quando ocorreu?" />
            {form.dentalTrauma && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2">
                <div className="space-y-2">
                  <Label>Qual dente foi afetado?</Label>
                  <Input value={form.traumaAffectedTooth} onChange={(e) => setForm({ ...form, traumaAffectedTooth: e.target.value })} placeholder="Ex: Incisivo superior direito" />
                </div>
                <div className="space-y-2">
                  <Label>Recebeu atendimento?</Label>
                  <Input value={form.traumaReceivedTreatment} onChange={(e) => setForm({ ...form, traumaReceivedTreatment: e.target.value })} placeholder="Descreva o atendimento" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Queixa principal</Label>
              <Textarea value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} placeholder="Descreva a queixa principal..." className="min-h-[80px]" />
            </div>

            {/* ===== 4. HIGIENE ORAL ===== */}
            <Separator />
            <h3 className="font-semibold text-foreground">Higiene Oral</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quem realiza a escovação?</Label>
                <Select value={form.brushingBy} onValueChange={(v) => setForm({ ...form, brushingBy: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crianca">Criança</SelectItem>
                    <SelectItem value="pais">Pais</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequência diária</Label>
                <Select value={form.brushingFrequency} onValueChange={(v) => setForm({ ...form, brushingFrequency: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1x">1x</SelectItem>
                    <SelectItem value="2x">2x</SelectItem>
                    <SelectItem value="3x_ou_mais">3x ou mais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quando iniciou a escovação?</Label>
              <Input value={form.brushingStartAge} onChange={(e) => setForm({ ...form, brushingStartAge: e.target.value })} placeholder="Ex: 1 ano" />
            </div>

            <QuestionField label="Já recebeu instrução de higiene?" value={form.hygieneInstruction} onValueChange={(v) => setForm({ ...form, hygieneInstruction: v })} showDetails={false} />
            <QuestionField label="Utiliza dentifrício fluoretado?" value={form.fluorideToothpaste} onValueChange={(v) => setForm({ ...form, fluorideToothpaste: v })} showDetails={false} />
            {form.fluorideToothpaste && (
              <div className="pl-2 space-y-2">
                <Label>Marca / concentração</Label>
                <Input value={form.toothpasteBrand} onChange={(e) => setForm({ ...form, toothpasteBrand: e.target.value })} placeholder="Ex: Colgate 1100ppm" />
              </div>
            )}
            <QuestionField label="Usa fio dental?" value={form.dentalFloss} onValueChange={(v) => setForm({ ...form, dentalFloss: v })} details={form.dentalFlossDetails} onDetailsChange={(t) => setForm({ ...form, dentalFlossDetails: t })} detailsPlaceholder="Frequência de uso" />
            <QuestionField label="Usa enxaguante?" value={form.mouthwash} onValueChange={(v) => setForm({ ...form, mouthwash: v })} details={form.mouthwashDetails} onDetailsChange={(t) => setForm({ ...form, mouthwashDetails: t })} detailsPlaceholder="Qual enxaguante?" />

            {/* ===== 5. ALIMENTAÇÃO ===== */}
            <Separator />
            <h3 className="font-semibold text-foreground">Alimentação</h3>

            <QuestionField label="Foi amamentado?" value={form.wasBreastfed} onValueChange={(v) => setForm({ ...form, wasBreastfed: v })} showDetails={false} />
            <QuestionField label="Usou mamadeira?" value={form.usedBottle} onValueChange={(v) => setForm({ ...form, usedBottle: v })} details={form.usedBottleDetails} onDetailsChange={(t) => setForm({ ...form, usedBottleDetails: t })} detailsPlaceholder="Até que idade?" />
            <QuestionField label="Usa mamadeira atualmente?" value={form.currentlyUsesBottle} onValueChange={(v) => setForm({ ...form, currentlyUsesBottle: v })} showDetails={false} />
            <QuestionField label="Usa chupeta?" value={form.usesPacifier} onValueChange={(v) => setForm({ ...form, usesPacifier: v })} showDetails={false} />

            <div className="space-y-2">
              <Label>Frequência de ingestão de açúcar</Label>
              <Select value={form.sugarFrequency} onValueChange={(v) => setForm({ ...form, sugarFrequency: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="raramente">Raramente</SelectItem>
                  <SelectItem value="1x_dia">1x ao dia</SelectItem>
                  <SelectItem value="2_3x_dia">2-3x ao dia</SelectItem>
                  <SelectItem value="varias_vezes">Várias vezes ao dia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <QuestionField label="Consome açúcar antes de dormir?" value={form.sugarBeforeBed} onValueChange={(v) => setForm({ ...form, sugarBeforeBed: v })} showDetails={false} />
            <QuestionField label="Dorme após ingerir líquido açucarado?" value={form.sleepsAfterSugarLiquid} onValueChange={(v) => setForm({ ...form, sleepsAfterSugarLiquid: v })} showDetails={false} />

            {/* ===== 6. HÁBITOS PARAFUNCIONAIS ===== */}
            <Separator />
            <h3 className="font-semibold text-foreground">Hábitos Parafuncionais</h3>

            <QuestionField label="Rói unhas?" value={form.nailBiting} onValueChange={(v) => setForm({ ...form, nailBiting: v })} showDetails={false} />
            <QuestionField label="Morde objetos?" value={form.objectBiting} onValueChange={(v) => setForm({ ...form, objectBiting: v })} showDetails={false} />
            <QuestionField label="Chupa dedo?" value={form.thumbSucking} onValueChange={(v) => setForm({ ...form, thumbSucking: v })} showDetails={false} />
            <QuestionField label="Usa chupeta prolongadamente?" value={form.prolongedPacifier} onValueChange={(v) => setForm({ ...form, prolongedPacifier: v })} showDetails={false} />
            <QuestionField label="Range os dentes?" value={form.teethGrinding} onValueChange={(v) => setForm({ ...form, teethGrinding: v })} details={form.teethGrindingDetails} onDetailsChange={(t) => setForm({ ...form, teethGrindingDetails: t })} detailsPlaceholder="Noturno ou diurno?" />
            <QuestionField label="Respira pela boca?" value={form.mouthBreathing} onValueChange={(v) => setForm({ ...form, mouthBreathing: v })} showDetails={false} />

            {/* ===== 7. COMPORTAMENTO NA CONSULTA ===== */}
            <Separator />
            <h3 className="font-semibold text-foreground">Comportamento na Consulta</h3>

            <div className="space-y-2">
              <Label>Comportamento observado</Label>
              <Select value={form.behavior} onValueChange={(v) => setForm({ ...form, behavior: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cooperativo">Cooperativo</SelectItem>
                  <SelectItem value="ansioso">Ansioso</SelectItem>
                  <SelectItem value="medroso">Medroso</SelectItem>
                  <SelectItem value="choroso">Choroso</SelectItem>
                  <SelectItem value="nao_cooperativo">Não cooperativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <QuestionField label="Necessitou técnicas de manejo?" value={form.managementTechniques} onValueChange={(v) => setForm({ ...form, managementTechniques: v })} details={form.managementTechniquesDetails} onDetailsChange={(t) => setForm({ ...form, managementTechniquesDetails: t })} detailsPlaceholder="Quais técnicas?" />

            {/* ===== 8. EXAME CLÍNICO ===== */}
            <Separator />
            <h3 className="font-semibold text-foreground">Exame Clínico (Profissional)</h3>

            <div className="space-y-2">
              <Label>Dentição</Label>
              <Select value={form.dentition} onValueChange={(v) => setForm({ ...form, dentition: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="decidua">Decídua</SelectItem>
                  <SelectItem value="mista">Mista</SelectItem>
                  <SelectItem value="permanente">Permanente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Índice de placa</Label>
                <Input value={form.plaqueIndex} onChange={(e) => setForm({ ...form, plaqueIndex: e.target.value })} placeholder="Resultado" />
              </div>
              <div className="space-y-2">
                <Label>Lesões de cárie</Label>
                <Input value={form.cariesLesions} onChange={(e) => setForm({ ...form, cariesLesions: e.target.value })} placeholder="Descreva" />
              </div>
              <div className="space-y-2">
                <Label>Biofilme visível</Label>
                <Input value={form.visibleBiofilm} onChange={(e) => setForm({ ...form, visibleBiofilm: e.target.value })} placeholder="Descreva" />
              </div>
              <div className="space-y-2">
                <Label>Alterações gengivais</Label>
                <Input value={form.gingivalChanges} onChange={(e) => setForm({ ...form, gingivalChanges: e.target.value })} placeholder="Descreva" />
              </div>
              <div className="space-y-2">
                <Label>Alterações de mucosa</Label>
                <Input value={form.mucosaChanges} onChange={(e) => setForm({ ...form, mucosaChanges: e.target.value })} placeholder="Descreva" />
              </div>
              <div className="space-y-2">
                <Label>Alterações oclusais</Label>
                <Input value={form.occlusalChanges} onChange={(e) => setForm({ ...form, occlusalChanges: e.target.value })} placeholder="Descreva" />
              </div>
            </div>

            {/* EXTRAORAL */}
            <Separator />
            <h3 className="font-semibold text-foreground">Exame Extraoral</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Simetria facial</Label>
                <Select value={form.facialSymmetry} onValueChange={(v) => setForm({ ...form, facialSymmetry: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simetrica">Simétrica</SelectItem>
                    <SelectItem value="assimetria">Assimetria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Perfil facial</Label>
                <Select value={form.facialProfile} onValueChange={(v) => setForm({ ...form, facialProfile: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="convexo">Convexo</SelectItem>
                    <SelectItem value="reto">Reto</SelectItem>
                    <SelectItem value="concavo">Côncavo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Selamento labial</Label>
                <Select value={form.lipCompetence} onValueChange={(v) => setForm({ ...form, lipCompetence: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adequado">Adequado</SelectItem>
                    <SelectItem value="incompetente">Incompetente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <QuestionField label="Linfonodos palpáveis?" value={form.palpableLymphNodes} onValueChange={(v) => setForm({ ...form, palpableLymphNodes: v })} details={form.palpableLymphNodesDetails} onDetailsChange={(t) => setForm({ ...form, palpableLymphNodesDetails: t })} detailsPlaceholder="Quais?" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ATM (Dor / Estalido / Limitação)</Label>
                <Input value={form.atm} onChange={(e) => setForm({ ...form, atm: e.target.value })} placeholder="Descreva achados" />
              </div>
              <div className="space-y-2">
                <Label>Respiração</Label>
                <Select value={form.breathingType} onValueChange={(v) => setForm({ ...form, breathingType: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nasal">Nasal</SelectItem>
                    <SelectItem value="bucal">Bucal</SelectItem>
                    <SelectItem value="mista">Mista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* INTRAORAL */}
            <Separator />
            <h3 className="font-semibold text-foreground">Exame Intraoral</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Freio labial</Label>
                <Select value={form.labialFrenum} onValueChange={(v) => setForm({ ...form, labialFrenum: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alterado">Alterado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Freio lingual</Label>
                <Select value={form.lingualFrenum} onValueChange={(v) => setForm({ ...form, lingualFrenum: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="curto_anquiloglossia">Curto / Anquiloglossia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mucosa jugal</Label>
                <Select value={form.jugalMucosa} onValueChange={(v) => setForm({ ...form, jugalMucosa: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alterada">Alterada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.jugalMucosa === 'alterada' && (
                <div className="space-y-2">
                  <Label>Descreva a alteração</Label>
                  <Input value={form.jugalMucosaDetails} onChange={(e) => setForm({ ...form, jugalMucosaDetails: e.target.value })} placeholder="Descreva..." />
                </div>
              )}
              <div className="space-y-2">
                <Label>Lábios</Label>
                <Select value={form.lips} onValueChange={(v) => setForm({ ...form, lips: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normais">Normais</SelectItem>
                    <SelectItem value="alterados">Alterados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gengiva</Label>
                <Select value={form.gingiva} onValueChange={(v) => setForm({ ...form, gingiva: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saudavel">Saudável</SelectItem>
                    <SelectItem value="inflamada">Inflamada</SelectItem>
                    <SelectItem value="sangramento">Sangramento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Palato</Label>
                <Select value={form.palate} onValueChange={(v) => setForm({ ...form, palate: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="atresico">Atrésico</SelectItem>
                    <SelectItem value="ogival">Ogival</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Língua</Label>
                <Select value={form.tongue} onValueChange={(v) => setForm({ ...form, tongue: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="saburrosa">Saburrosa</SelectItem>
                    <SelectItem value="geografica">Geográfica</SelectItem>
                    <SelectItem value="outra">Outra alteração</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.tongue === 'outra' && (
                <div className="space-y-2">
                  <Label>Descreva a alteração</Label>
                  <Input value={form.tongueDetails} onChange={(e) => setForm({ ...form, tongueDetails: e.target.value })} placeholder="Descreva..." />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Orofaringe / Amígdalas</Label>
                <Input value={form.oropharynxTonsils} onChange={(e) => setForm({ ...form, oropharynxTonsils: e.target.value })} placeholder="Descreva" />
              </div>
              <div className="space-y-2">
                <Label>Higiene geral observada</Label>
                <Input value={form.observedHygiene} onChange={(e) => setForm({ ...form, observedHygiene: e.target.value })} placeholder="Descreva" />
              </div>
            </div>

            {/* HÁBITOS FUNCIONAIS */}
            <Separator />
            <h3 className="font-semibold text-foreground">Hábitos Funcionais</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deglutição</Label>
                <Select value={form.deglutition} onValueChange={(v) => setForm({ ...form, deglutition: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tipica">Típica</SelectItem>
                    <SelectItem value="atipica">Atípica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <QuestionField label="Fonação alterada?" value={form.alteredPhonation} onValueChange={(v) => setForm({ ...form, alteredPhonation: v })} showDetails={false} />

            {/* AVALIAÇÃO FACIAL */}
            <Separator />
            <h3 className="font-semibold text-foreground">Avaliação Facial</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Padrão facial</Label>
                <Select value={form.facialPattern} onValueChange={(v) => setForm({ ...form, facialPattern: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mesofacial">Mesofacial</SelectItem>
                    <SelectItem value="dolico">Dolicofacial</SelectItem>
                    <SelectItem value="braquifacial">Braquifacial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AVALIAÇÃO OCLUSAL */}
            <Separator />
            <h3 className="font-semibold text-foreground">Avaliação Oclusal</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Classe de Angle</Label>
                <Select value={form.angleClass} onValueChange={(v) => setForm({ ...form, angleClass: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="I">Classe I</SelectItem>
                    <SelectItem value="II">Classe II</SelectItem>
                    <SelectItem value="III">Classe III</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mordida cruzada</Label>
                <Select value={form.crossbite} onValueChange={(v) => setForm({ ...form, crossbite: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="anterior">Anterior</SelectItem>
                    <SelectItem value="posterior">Posterior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mordida aberta</Label>
                <Select value={form.openBite} onValueChange={(v) => setForm({ ...form, openBite: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="anterior">Anterior</SelectItem>
                    <SelectItem value="posterior">Posterior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Overjet</Label>
                <Input value={form.overjet} onChange={(e) => setForm({ ...form, overjet: e.target.value })} placeholder="Ex: 3mm" />
              </div>
              <div className="space-y-2">
                <Label>Overbite</Label>
                <Input value={form.overbite} onChange={(e) => setForm({ ...form, overbite: e.target.value })} placeholder="Ex: 2mm" />
              </div>
            </div>

            <QuestionField label="Desvio de linha média?" value={form.midlineDeviation} onValueChange={(v) => setForm({ ...form, midlineDeviation: v })} showDetails={false} />

            <Separator />

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} placeholder="Outras observações relevantes..." className="min-h-[100px]" />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : anamnesis ? 'Atualizar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
