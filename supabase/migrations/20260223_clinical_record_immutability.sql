-- =============================================================
-- Migration: Clinical Record Immutability (P0 Compliance)
-- CFO: 20-year retention for dental records
-- Lei 13.787: No permanent deletion of clinical data
-- =============================================================

-- 1a. Add soft-delete columns to patients
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS retention_locked_until timestamptz DEFAULT (NOW() + INTERVAL '20 years');

-- 1a. Add soft-delete columns to clinical tables
ALTER TABLE anamneses
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL REFERENCES auth.users(id);

ALTER TABLE child_anamneses
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL REFERENCES auth.users(id);

ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL REFERENCES auth.users(id);

ALTER TABLE procedures
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL REFERENCES auth.users(id);

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid DEFAULT NULL REFERENCES auth.users(id);

-- 1b. Change CASCADE → RESTRICT on clinical FKs
ALTER TABLE anamneses
  DROP CONSTRAINT IF EXISTS anamneses_patient_id_fkey,
  ADD CONSTRAINT anamneses_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;

ALTER TABLE child_anamneses
  DROP CONSTRAINT IF EXISTS child_anamneses_patient_id_fkey,
  ADD CONSTRAINT child_anamneses_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;

ALTER TABLE exams
  DROP CONSTRAINT IF EXISTS exams_patient_id_fkey,
  ADD CONSTRAINT exams_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;

ALTER TABLE procedures
  DROP CONSTRAINT IF EXISTS procedures_patient_id_fkey,
  ADD CONSTRAINT procedures_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;

ALTER TABLE consultations
  DROP CONSTRAINT IF EXISTS consultations_patient_id_fkey,
  ADD CONSTRAINT consultations_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT;

-- 1c. Trigger: Prevent hard delete on clinical tables
CREATE OR REPLACE FUNCTION _prevent_clinical_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Exclusão permanente de registros clínicos não é permitida. Use soft delete (deleted_at). Retenção mínima: 20 anos (CFO/Lei 13.787).';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER prevent_anamneses_hard_delete
  BEFORE DELETE ON anamneses FOR EACH ROW
  EXECUTE FUNCTION _prevent_clinical_hard_delete();

CREATE OR REPLACE TRIGGER prevent_child_anamneses_hard_delete
  BEFORE DELETE ON child_anamneses FOR EACH ROW
  EXECUTE FUNCTION _prevent_clinical_hard_delete();

CREATE OR REPLACE TRIGGER prevent_exams_hard_delete
  BEFORE DELETE ON exams FOR EACH ROW
  EXECUTE FUNCTION _prevent_clinical_hard_delete();

CREATE OR REPLACE TRIGGER prevent_procedures_hard_delete
  BEFORE DELETE ON procedures FOR EACH ROW
  EXECUTE FUNCTION _prevent_clinical_hard_delete();

CREATE OR REPLACE TRIGGER prevent_consultations_hard_delete
  BEFORE DELETE ON consultations FOR EACH ROW
  EXECUTE FUNCTION _prevent_clinical_hard_delete();

-- 1c. Trigger: Prevent hard delete on patients if clinical records exist
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
  ) INTO has_records;

  IF has_records THEN
    RAISE EXCEPTION 'Exclusão permanente de paciente com registros clínicos não é permitida. Use soft delete via soft_delete_patient().';
    RETURN NULL;
  END IF;

  -- Patient without clinical records can be hard deleted
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER prevent_patient_hard_delete
  BEFORE DELETE ON patients FOR EACH ROW
  EXECUTE FUNCTION _prevent_patient_hard_delete();

-- 1d. RPC: Soft delete patient and all clinical records
CREATE OR REPLACE FUNCTION soft_delete_patient(p_patient_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retention_locked_until timestamptz;
BEGIN
  -- Check retention lock
  SELECT retention_locked_until INTO v_retention_locked_until
  FROM patients WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paciente não encontrado.';
  END IF;

  -- Mark patient as soft-deleted
  UPDATE patients
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE id = p_patient_id AND deleted_at IS NULL;

  -- Soft-delete all clinical records
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
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION soft_delete_patient(uuid, uuid) TO authenticated;

-- 1e. Recreate patients_secure view with deleted_at filter
DROP VIEW IF EXISTS patients_secure;

CREATE VIEW patients_secure WITH (security_invoker = on) AS
SELECT id, clinic_id, user_id, name, phone, email, birth_date,
  decrypt_pii(cpf) AS cpf, decrypt_pii(rg) AS rg, cpf_last4,
  address, city, state, zip_code, occupation,
  emergency_contact, emergency_phone,
  health_insurance, health_insurance_number,
  allergies, medications, medical_history, notes,
  return_alert_flag, return_alert_date, avatar_url,
  patient_type, gender, birthplace, school, school_grade,
  mother_name, mother_occupation, mother_phone,
  father_name, father_occupation, father_phone,
  legal_guardian, has_siblings, siblings_count, siblings_ages,
  created_at, updated_at
FROM patients
WHERE deleted_at IS NULL;

GRANT SELECT ON patients_secure TO authenticated;
GRANT SELECT ON patients_secure TO service_role;
