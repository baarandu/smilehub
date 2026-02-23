/**
 * Content Hash — Canonicalização e SHA-256 para prontuários clínicos
 * IMPORTANTE: Esta lógica DEVE ser idêntica no backend (supabase/functions/_shared/contentHash.ts)
 */

const PROCEDURE_FIELDS = [
  'budget_links', 'date', 'description', 'installments', 'location',
  'patient_id', 'payment_method', 'status', 'value',
];

const ANAMNESIS_FIELDS = [
  'allergy', 'allergy_details', 'anesthesia_reaction', 'anesthesia_reaction_details',
  'arthritis', 'arthritis_details', 'blood_pressure', 'bruxism_dtm_orofacial_pain',
  'bruxism_dtm_orofacial_pain_details', 'current_medication', 'current_medication_details',
  'date', 'depression_anxiety_panic', 'depression_anxiety_panic_details', 'diabetes',
  'diabetes_details', 'drug_allergy', 'drug_allergy_details', 'fasting', 'fasting_details',
  'gastritis_reflux', 'gastritis_reflux_details', 'healing_problems', 'healing_problems_details',
  'heart_disease', 'heart_disease_details', 'hypertension', 'hypertension_details',
  'infectious_disease', 'infectious_disease_details', 'local_anesthesia_history',
  'local_anesthesia_history_details', 'medical_treatment', 'medical_treatment_details',
  'observation', 'pacemaker', 'pacemaker_details', 'patient_id', 'pregnant_or_breastfeeding',
  'pregnant_or_breastfeeding_details', 'recent_surgery', 'recent_surgery_details',
  'seizure_epilepsy', 'seizure_epilepsy_details', 'smoker_or_drinker', 'smoker_or_drinker_details',
];

const EXAM_FIELDS = [
  'exam_date', 'file_type', 'file_url', 'file_urls', 'name', 'order_date', 'patient_id',
];

function getFieldsForType(recordType: string): string[] {
  switch (recordType) {
    case 'procedure': return PROCEDURE_FIELDS;
    case 'anamnesis': return ANAMNESIS_FIELDS;
    case 'exam': return EXAM_FIELDS;
    default: throw new Error(`Unknown record type: ${recordType}`);
  }
}

export function canonicalizeRecord(record: Record<string, unknown>, recordType: string): string {
  const fields = getFieldsForType(recordType);
  const sorted: Record<string, unknown> = {};

  for (const key of fields) {
    let value = record[key];

    if (value === undefined) {
      value = null;
    } else if (typeof value === 'string') {
      value = value.trim();
    }

    sorted[key] = value;
  }

  return JSON.stringify(sorted);
}

export async function computeRecordHash(record: Record<string, unknown>, recordType: string): Promise<string> {
  const canonical = canonicalizeRecord(record, recordType);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
