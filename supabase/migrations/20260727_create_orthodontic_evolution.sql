-- ============================================================
-- Evolução Ortodôntica — lightweight per-visit notes log
-- Lives as a sub-tab inside Procedimentos on the patient record.
-- Independent from the Central de Ortodontia (orthodontic_cases/
-- orthodontic_sessions): no case needs to exist first.
-- ============================================================

CREATE TABLE IF NOT EXISTS orthodontic_evolution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,

  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL,

  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  deleted_at timestamptz DEFAULT NULL,
  deleted_by uuid DEFAULT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_orthodontic_evolution_patient ON orthodontic_evolution(patient_id);
CREATE INDEX IF NOT EXISTS idx_orthodontic_evolution_clinic ON orthodontic_evolution(clinic_id);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_orthodontic_evolution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_orthodontic_evolution_updated_at
  BEFORE UPDATE ON orthodontic_evolution
  FOR EACH ROW EXECUTE FUNCTION update_orthodontic_evolution_updated_at();

-- ============================================================
-- Clinical record immutability (CFO/Lei 13.787 — 20yr retention,
-- no permanent deletion; see 20260223_clinical_record_immutability.sql)
-- ============================================================
CREATE OR REPLACE TRIGGER prevent_orthodontic_evolution_hard_delete
  BEFORE DELETE ON orthodontic_evolution FOR EACH ROW
  EXECUTE FUNCTION _prevent_clinical_hard_delete();

-- Include this table in the patient hard-delete guard and cascade soft-delete
CREATE OR REPLACE FUNCTION _prevent_patient_hard_delete()
RETURNS TRIGGER AS $$
DECLARE
  has_records boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM anamneses WHERE patient_id = OLD.id
    UNION ALL
    SELECT 1 FROM child_anamneses WHERE patient_id = OLD.id
    UNION ALL
    SELECT 1 FROM exams WHERE patient_id = OLD.id
    UNION ALL
    SELECT 1 FROM procedures WHERE patient_id = OLD.id
    UNION ALL
    SELECT 1 FROM consultations WHERE patient_id = OLD.id
    UNION ALL
    SELECT 1 FROM orthodontic_evolution WHERE patient_id = OLD.id
  ) INTO has_records;

  IF has_records THEN
    RAISE EXCEPTION 'Exclusão permanente de paciente com registros clínicos não é permitida. Use soft delete via soft_delete_patient().';
    RETURN NULL;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION soft_delete_patient(p_patient_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retention_locked_until timestamptz;
BEGIN
  SELECT retention_locked_until INTO v_retention_locked_until
  FROM patients WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paciente não encontrado.';
  END IF;

  UPDATE patients
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE id = p_patient_id AND deleted_at IS NULL;

  UPDATE anamneses
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE patient_id = p_patient_id AND deleted_at IS NULL;

  UPDATE child_anamneses
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE patient_id = p_patient_id AND deleted_at IS NULL;

  UPDATE exams
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE patient_id = p_patient_id AND deleted_at IS NULL;

  UPDATE procedures
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE patient_id = p_patient_id AND deleted_at IS NULL;

  UPDATE consultations
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE patient_id = p_patient_id AND deleted_at IS NULL;

  UPDATE orthodontic_evolution
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE patient_id = p_patient_id AND deleted_at IS NULL;
END;
$$;

-- ============================================================
-- RLS — same pattern as procedures (any clinic member with access
-- to the patient can read/write; deleted_at filtering happens at
-- the query layer, not in RLS, matching the procedures convention)
-- ============================================================
ALTER TABLE orthodontic_evolution ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ortho_evolution_select" ON orthodontic_evolution;
CREATE POLICY "ortho_evolution_select" ON orthodontic_evolution FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = orthodontic_evolution.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ortho_evolution_insert" ON orthodontic_evolution;
CREATE POLICY "ortho_evolution_insert" ON orthodontic_evolution FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = orthodontic_evolution.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ortho_evolution_update" ON orthodontic_evolution;
CREATE POLICY "ortho_evolution_update" ON orthodontic_evolution FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = orthodontic_evolution.patient_id
        AND cu.user_id = auth.uid()
    )
  );
