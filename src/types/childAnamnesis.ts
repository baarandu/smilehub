export interface ChildAnamnesis {
  id: string;
  patient_id: string;
  clinic_id: string | null;
  date: string;

  // Histórico Médico Geral
  pregnancy_type: string | null;
  birth_type: string | null;
  pregnancy_complications: boolean;
  pregnancy_complications_details: string | null;
  pregnancy_medications: boolean;
  pregnancy_medications_details: string | null;
  birth_weight: string | null;
  exclusive_breastfeeding_duration: string | null;
  total_breastfeeding_duration: string | null;
  current_health: string | null;
  chronic_disease: boolean;
  chronic_disease_details: string | null;
  hospitalized: boolean;
  hospitalized_details: string | null;
  surgery: boolean;
  surgery_details: string | null;
  respiratory_problems: boolean;
  respiratory_problems_details: string | null;
  cardiopathy: boolean;
  cardiopathy_details: string | null;
  continuous_medication: boolean;
  continuous_medication_details: string | null;
  frequent_antibiotics: boolean;
  frequent_antibiotics_details: string | null;
  drug_allergy: boolean;
  drug_allergy_details: string | null;
  food_allergy: boolean;
  food_allergy_details: string | null;

  // Histórico Odontológico
  previous_dentist: boolean;
  first_visit_age: string | null;
  last_dental_visit: string | null;
  last_visit_reason: string | null;
  previous_procedures: string | null;
  local_anesthesia: boolean;
  anesthesia_good_reaction: boolean;
  anesthesia_adverse_reaction: string | null;
  frequent_canker_sores: boolean;
  dental_trauma: boolean;
  dental_trauma_details: string | null;
  trauma_affected_tooth: string | null;
  trauma_received_treatment: string | null;
  chief_complaint: string | null;

  // Higiene Oral
  brushing_by: string | null;
  brushing_frequency: string | null;
  brushing_start_age: string | null;
  hygiene_instruction: boolean;
  fluoride_toothpaste: boolean;
  toothpaste_brand: string | null;
  dental_floss: boolean;
  dental_floss_details: string | null;
  mouthwash: boolean;
  mouthwash_details: string | null;

  // Alimentação
  was_breastfed: boolean;
  used_bottle: boolean;
  used_bottle_details: string | null;
  currently_uses_bottle: boolean;
  uses_pacifier: boolean;
  sugar_frequency: string | null;
  sugar_before_bed: boolean;
  sleeps_after_sugar_liquid: boolean;

  // Hábitos Parafuncionais
  nail_biting: boolean;
  object_biting: boolean;
  thumb_sucking: boolean;
  prolonged_pacifier: boolean;
  teeth_grinding: boolean;
  teeth_grinding_details: string | null;
  mouth_breathing: boolean;

  // Comportamento na Consulta
  behavior: string | null;
  management_techniques: boolean;
  management_techniques_details: string | null;

  // Exame Clínico
  dentition: string | null;
  plaque_index: string | null;
  caries_lesions: string | null;
  visible_biofilm: string | null;
  gingival_changes: string | null;
  mucosa_changes: string | null;
  occlusal_changes: string | null;
  radiography_needed: string | null;
  treatment_plan: string | null;

  // Extraoral
  facial_symmetry: string | null;
  facial_profile: string | null;
  lip_competence: string | null;
  palpable_lymph_nodes: boolean;
  palpable_lymph_nodes_details: string | null;
  atm: string | null;
  breathing_type: string | null;

  // Intraoral
  labial_frenum: string | null;
  lingual_frenum: string | null;
  jugal_mucosa: string | null;
  jugal_mucosa_details: string | null;
  lips: string | null;
  gingiva: string | null;
  palate: string | null;
  tongue: string | null;
  tongue_details: string | null;
  oropharynx_tonsils: string | null;
  observed_hygiene: string | null;

  // Hábitos Funcionais
  deglutition: string | null;
  altered_phonation: boolean;

  // Avaliação Facial
  facial_pattern: string | null;

  // Avaliação Oclusal
  angle_class: string | null;
  crossbite: string | null;
  open_bite: string | null;
  overjet: string | null;
  overbite: string | null;
  midline_deviation: boolean;

  observations: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type ChildAnamnesisInsert = Omit<ChildAnamnesis, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ChildAnamnesisUpdate = Partial<ChildAnamnesisInsert>;
