import type { PatientFormData } from './database';

// Session status
export type VoiceConsultationStatus = 'recording' | 'processing' | 'review' | 'completed' | 'discarded';

// Confidence levels
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// Database row
export interface VoiceConsultationSession {
  id: string;
  clinic_id: string;
  user_id: string;
  appointment_id: string | null;
  patient_id: string | null;
  status: VoiceConsultationStatus;
  is_new_patient: boolean;
  consent_given: boolean;
  consent_given_at: string | null;
  audio_duration_seconds: number | null;
  transcription: string | null;
  extracted_patient_data: ExtractedPatientData | null;
  extracted_anamnesis_data: ExtractedAnamnesisData | null;
  extracted_consultation_data: ExtractedConsultationData | null;
  extracted_procedures_data: ExtractedProcedureData[] | null;
  extracted_budget_data: ExtractedBudgetData | null;
  saved_patient_id: string | null;
  saved_anamnesis_id: string | null;
  saved_consultation_id: string | null;
  saved_procedure_ids: string[];
  saved_budget_id: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  processing_error: string | null;
  whisper_tokens_used: number;
  gpt_tokens_used: number;
  estimated_cost_usd: number;
  created_at: string;
  updated_at: string;
}

// Insert type
export interface VoiceConsultationSessionInsert {
  id?: string;
  clinic_id: string;
  user_id: string;
  appointment_id?: string | null;
  patient_id?: string | null;
  status?: VoiceConsultationStatus;
  is_new_patient?: boolean;
  consent_given?: boolean;
  consent_given_at?: string | null;
  audio_duration_seconds?: number | null;
  transcription?: string | null;
  extracted_patient_data?: ExtractedPatientData | null;
  extracted_anamnesis_data?: ExtractedAnamnesisData | null;
  extracted_consultation_data?: ExtractedConsultationData | null;
  extracted_procedures_data?: ExtractedProcedureData[] | null;
  extracted_budget_data?: ExtractedBudgetData | null;
}

// Update type
export interface VoiceConsultationSessionUpdate {
  status?: VoiceConsultationStatus;
  consent_given?: boolean;
  consent_given_at?: string | null;
  audio_duration_seconds?: number | null;
  transcription?: string | null;
  extracted_patient_data?: ExtractedPatientData | null;
  extracted_anamnesis_data?: ExtractedAnamnesisData | null;
  extracted_consultation_data?: ExtractedConsultationData | null;
  extracted_procedures_data?: ExtractedProcedureData[] | null;
  extracted_budget_data?: ExtractedBudgetData | null;
  saved_patient_id?: string | null;
  saved_anamnesis_id?: string | null;
  saved_consultation_id?: string | null;
  saved_procedure_ids?: string[];
  saved_budget_id?: string | null;
  processing_started_at?: string | null;
  processing_completed_at?: string | null;
  processing_error?: string | null;
  whisper_tokens_used?: number;
  gpt_tokens_used?: number;
  estimated_cost_usd?: number;
}

// Extracted patient data from AI
export interface ExtractedPatientData {
  name: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  cpf: string | null;
  rg: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  occupation: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  healthInsurance: string | null;
  healthInsuranceNumber: string | null;
  allergies: string | null;
  medications: string | null;
}

// Single anamnesis condition
export interface AnamnesisCondition {
  value: boolean | null;
  details: string | null;
}

// Extracted anamnesis data from AI
export interface ExtractedAnamnesisData {
  medicalTreatment: AnamnesisCondition;
  recentSurgery: AnamnesisCondition;
  healingProblems: AnamnesisCondition;
  respiratoryProblems: AnamnesisCondition;
  currentMedication: AnamnesisCondition;
  allergy: AnamnesisCondition;
  drugAllergy: AnamnesisCondition;
  continuousMedication: AnamnesisCondition;
  localAnesthesiaHistory: AnamnesisCondition;
  anesthesiaReaction: AnamnesisCondition;
  pregnantOrBreastfeeding: AnamnesisCondition;
  smokerOrDrinker: AnamnesisCondition;
  fasting: AnamnesisCondition;
  diabetes: AnamnesisCondition;
  depressionAnxietyPanic: AnamnesisCondition;
  seizureEpilepsy: AnamnesisCondition;
  heartDisease: AnamnesisCondition;
  hypertension: AnamnesisCondition;
  pacemaker: AnamnesisCondition;
  infectiousDisease: AnamnesisCondition;
  arthritis: AnamnesisCondition;
  gastritisReflux: AnamnesisCondition;
  bruxismDtmOrofacialPain: AnamnesisCondition;
  notes: string | null;
  observations: string | null;
}

// Extracted consultation data from AI
export interface ExtractedConsultationData {
  chiefComplaint: string | null;
  procedures: string | null;
  treatmentPlan: string | null;
  suggestedReturnDate: string | null;
  notes: string | null;
}

// Extracted structured procedure from AI
export interface ExtractedProcedureData {
  description: string | null;
  tooth: string | null;
  treatment: string | null;
  material: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  location: string | null;
}

// Extracted budget item from AI
export interface ExtractedBudgetItem {
  tooth: string;
  treatments: string[];
  values: Record<string, string>;
  faces: string[];
  materials: Record<string, string>;
}

// Extracted budget data from AI
export interface ExtractedBudgetData {
  items: ExtractedBudgetItem[];
  location: string | null;
}

// Full extraction result from GPT
export interface ExtractionResult {
  patient: ExtractedPatientData;
  anamnesis: ExtractedAnamnesisData;
  consultation: ExtractedConsultationData;
  procedures: ExtractedProcedureData[];
  budget: ExtractedBudgetData;
  confidence: {
    patient: ConfidenceLevel;
    anamnesis: ConfidenceLevel;
    consultation: ConfidenceLevel;
    procedures: ConfidenceLevel;
    budget: ConfidenceLevel;
  };
}

// Processing step for UI
export type ProcessingStep = 'transcribing' | 'extracting' | 'preparing';

// Stepper phases
export type ConsultationPhase = 'consent' | 'recording' | 'processing' | 'review';

// Audio recorder state
export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  analyserNode: AnalyserNode | null;
  error: string | null;
}

// Transcription response
export interface TranscriptionResponse {
  text: string;
  duration_seconds: number;
}

// Extraction response
export interface ExtractionResponse {
  data: ExtractionResult;
  tokens_used: number;
}
