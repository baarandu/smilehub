import type {
  ExtractedAnamnesisData,
  AnamnesisCondition,
  ExtractedBudgetData,
} from '../../types/voiceConsultation';
import type { Location } from '../../services/locations';
import type { ToothEntry } from '../patients/budgetUtils';

// Anamnesis form state (camelCase, same as modal form)
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

export function extractedToFormState(extracted: ExtractedAnamnesisData | null): Partial<AnamnesisFormState> {
  if (!extracted) return {};

  const c = (cond: AnamnesisCondition | undefined) => ({
    value: cond?.value === true,
    details: cond?.details || '',
  });

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

export function extractedToBudgetForm(
  extracted: ExtractedBudgetData | null | undefined,
  locations: Location[],
): { items: ToothEntry[]; location: string } {
  if (!extracted || !extracted.items || extracted.items.length === 0) {
    return { items: [], location: '' };
  }

  let locationId = '';
  if (extracted.location) {
    const match = locations.find(
      (l) => l.name.toLowerCase() === extracted.location!.toLowerCase(),
    );
    if (match) locationId = match.id;
  }

  const items: ToothEntry[] = extracted.items.map((item) => ({
    tooth: item.tooth || '',
    treatments: item.treatments || [],
    values: item.values || {},
    status: 'pending' as const,
    faces: item.faces || [],
    materials: item.materials || {},
  }));

  return { items, location: locationId };
}
