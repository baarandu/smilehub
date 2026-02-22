-- Migration: Create child_anamneses table for pediatric dental anamnesis
-- Date: 2026-02-19

CREATE TABLE IF NOT EXISTS child_anamneses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES clinics(id),
  date date NOT NULL DEFAULT CURRENT_DATE,

  -- 2. HISTÓRICO MÉDICO GERAL
  pregnancy_type text, -- 'a_termo', 'prematuro', 'pos_termo'
  birth_type text, -- 'normal', 'cesarea'
  pregnancy_complications boolean DEFAULT false,
  pregnancy_complications_details text,
  pregnancy_medications boolean DEFAULT false,
  pregnancy_medications_details text,
  birth_weight text,
  exclusive_breastfeeding_duration text,
  total_breastfeeding_duration text,
  current_health text,
  chronic_disease boolean DEFAULT false,
  chronic_disease_details text,
  hospitalized boolean DEFAULT false,
  hospitalized_details text,
  surgery boolean DEFAULT false,
  surgery_details text,
  respiratory_problems boolean DEFAULT false,
  respiratory_problems_details text,
  cardiopathy boolean DEFAULT false,
  cardiopathy_details text,
  continuous_medication boolean DEFAULT false,
  continuous_medication_details text,
  frequent_antibiotics boolean DEFAULT false,
  frequent_antibiotics_details text,
  drug_allergy boolean DEFAULT false,
  drug_allergy_details text,
  food_allergy boolean DEFAULT false,
  food_allergy_details text,

  -- 3. HISTÓRICO ODONTOLÓGICO
  previous_dentist boolean DEFAULT false,
  first_visit_age text,
  last_dental_visit text,
  last_visit_reason text,
  previous_procedures text, -- comma-separated: restauracao,extracao,endodontia,selante,fluor,ortodontia
  local_anesthesia boolean DEFAULT false,
  anesthesia_good_reaction boolean DEFAULT false,
  anesthesia_adverse_reaction text,
  frequent_canker_sores boolean DEFAULT false,
  dental_trauma boolean DEFAULT false,
  dental_trauma_details text,
  trauma_affected_tooth text,
  trauma_received_treatment text,
  chief_complaint text,

  -- 4. HIGIENE ORAL
  brushing_by text, -- 'crianca', 'pais', 'ambos'
  brushing_frequency text, -- '1x', '2x', '3x_ou_mais'
  brushing_start_age text,
  hygiene_instruction boolean DEFAULT false,
  fluoride_toothpaste boolean DEFAULT false,
  toothpaste_brand text,
  dental_floss boolean DEFAULT false,
  dental_floss_details text,
  mouthwash boolean DEFAULT false,
  mouthwash_details text,

  -- 5. ALIMENTAÇÃO
  was_breastfed boolean DEFAULT false,
  used_bottle boolean DEFAULT false,
  used_bottle_details text,
  currently_uses_bottle boolean DEFAULT false,
  uses_pacifier boolean DEFAULT false,
  sugar_frequency text, -- 'raramente', '1x_dia', '2_3x_dia', 'varias_vezes'
  sugar_before_bed boolean DEFAULT false,
  sleeps_after_sugar_liquid boolean DEFAULT false,

  -- 6. HÁBITOS PARAFUNCIONAIS
  nail_biting boolean DEFAULT false,
  object_biting boolean DEFAULT false,
  thumb_sucking boolean DEFAULT false,
  prolonged_pacifier boolean DEFAULT false,
  teeth_grinding boolean DEFAULT false,
  teeth_grinding_details text, -- noturno/diurno
  mouth_breathing boolean DEFAULT false,

  -- 7. COMPORTAMENTO NA CONSULTA
  behavior text, -- 'cooperativo', 'ansioso', 'medroso', 'choroso', 'nao_cooperativo'
  management_techniques boolean DEFAULT false,
  management_techniques_details text,

  -- 8. EXAME CLÍNICO (PROFISSIONAL)
  dentition text, -- 'decidua', 'mista', 'permanente'
  plaque_index text,
  caries_lesions text,
  visible_biofilm text,
  gingival_changes text,
  mucosa_changes text,
  occlusal_changes text,
  radiography_needed text,
  treatment_plan text,

  -- EXTRAORAL
  facial_symmetry text,
  facial_profile text,
  lip_competence text,
  palpable_lymph_nodes boolean DEFAULT false,
  palpable_lymph_nodes_details text,
  atm text, -- dor/estalido/limitação
  breathing_type text, -- 'nasal', 'bucal', 'mista'

  -- INTRAORAL
  labial_frenum text, -- 'normal', 'alterado'
  lingual_frenum text, -- 'normal', 'curto_anquiloglossia'
  jugal_mucosa text, -- 'normal', 'alterada'
  jugal_mucosa_details text,
  lips text, -- 'normais', 'alterados'
  gingiva text, -- 'saudavel', 'inflamada', 'sangramento'
  palate text, -- 'normal', 'atresico', 'ogival'
  tongue text, -- 'normal', 'saburrosa', 'geografica', 'outra'
  tongue_details text,
  oropharynx_tonsils text,
  observed_hygiene text,

  -- HÁBITOS FUNCIONAIS
  deglutition text, -- 'tipica', 'atipica'
  altered_phonation boolean DEFAULT false,

  -- AVALIAÇÃO FACIAL
  facial_pattern text, -- 'mesofacial', 'dolico', 'braquifacial'

  -- AVALIAÇÃO OCLUSAL
  angle_class text, -- 'I', 'II', 'III'
  crossbite text, -- 'nao', 'anterior', 'posterior'
  open_bite text, -- 'nao', 'anterior', 'posterior'
  overjet text,
  overbite text,
  midline_deviation boolean DEFAULT false,

  -- Observações gerais
  observations text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE child_anamneses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage child anamneses for their clinic patients"
  ON child_anamneses FOR ALL
  USING (
    patient_id IN (
      SELECT p.id FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE cu.user_id = auth.uid()
    )
  );

-- Index
CREATE INDEX idx_child_anamneses_patient_id ON child_anamneses(patient_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_child_anamneses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_child_anamneses_updated_at
  BEFORE UPDATE ON child_anamneses
  FOR EACH ROW
  EXECUTE FUNCTION update_child_anamneses_updated_at();
