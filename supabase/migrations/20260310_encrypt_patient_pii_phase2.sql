-- =============================================
-- Phase 2: Encrypt additional Patient PII fields
-- LGPD Compliance — Organiza Odonto
-- =============================================
-- Scope: Display-only fields that are NEVER used in WHERE/ILIKE/JOIN.
-- This means ZERO application code changes are needed.
-- All reads already go through patients_secure view.
-- All writes go to patients table (trigger handles encryption).
--
-- Fields encrypted in this migration:
--   address, city, state, zip_code,
--   emergency_contact, emergency_phone,
--   health_insurance_number,
--   mother_name, mother_phone,
--   father_name, father_phone,
--   allergies, medications, medical_history
--
-- Fields NOT encrypted (used in search/filter/integration):
--   phone  — WhatsApp integration + ILIKE search + AI secretary RPCs
--   email  — ILIKE search + OTP sending
--   name   — ILIKE search everywhere
--   birth_date — LIKE pattern for birthday alerts
--   health_insurance — convênio name (not a personal identifier)
--
-- Safety: encrypt_pii() already handles NULL, empty, and 'enc:' prefix.
-- =============================================

-- 0. Drop view first — PostgreSQL won't let us ALTER columns used by a view
DROP VIEW IF EXISTS patients_secure;

-- 0.1 Expand columns to TEXT to hold encrypted payloads
--     (some may be varchar(100) etc., encrypted values are much longer)
ALTER TABLE patients ALTER COLUMN address TYPE text;
ALTER TABLE patients ALTER COLUMN city TYPE text;
ALTER TABLE patients ALTER COLUMN state TYPE text;
ALTER TABLE patients ALTER COLUMN zip_code TYPE text;
ALTER TABLE patients ALTER COLUMN emergency_contact TYPE text;
ALTER TABLE patients ALTER COLUMN emergency_phone TYPE text;
ALTER TABLE patients ALTER COLUMN health_insurance_number TYPE text;
ALTER TABLE patients ALTER COLUMN mother_name TYPE text;
ALTER TABLE patients ALTER COLUMN mother_phone TYPE text;
ALTER TABLE patients ALTER COLUMN father_name TYPE text;
ALTER TABLE patients ALTER COLUMN father_phone TYPE text;
ALTER TABLE patients ALTER COLUMN allergies TYPE text;
ALTER TABLE patients ALTER COLUMN medications TYPE text;
ALTER TABLE patients ALTER COLUMN medical_history TYPE text;

-- 1. Update trigger to encrypt new fields on INSERT/UPDATE
CREATE OR REPLACE FUNCTION trigger_encrypt_patient_pii()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  -- === CPF (existing) ===
  IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
    IF NOT (NEW.cpf LIKE 'enc:%') THEN
      NEW.cpf_last4 := extract_cpf_last4(NEW.cpf);
      NEW.cpf := encrypt_pii(NEW.cpf);
    END IF;
  ELSE
    NEW.cpf_last4 := NULL;
  END IF;

  -- === RG (existing) ===
  IF NEW.rg IS NOT NULL AND NEW.rg != '' THEN
    IF NOT (NEW.rg LIKE 'enc:%') THEN
      NEW.rg := encrypt_pii(NEW.rg);
    END IF;
  END IF;

  -- === Address fields ===
  IF NEW.address IS NOT NULL AND NEW.address != '' AND NOT (NEW.address LIKE 'enc:%') THEN
    NEW.address := encrypt_pii(NEW.address);
  END IF;

  IF NEW.city IS NOT NULL AND NEW.city != '' AND NOT (NEW.city LIKE 'enc:%') THEN
    NEW.city := encrypt_pii(NEW.city);
  END IF;

  IF NEW.state IS NOT NULL AND NEW.state != '' AND NOT (NEW.state LIKE 'enc:%') THEN
    NEW.state := encrypt_pii(NEW.state);
  END IF;

  IF NEW.zip_code IS NOT NULL AND NEW.zip_code != '' AND NOT (NEW.zip_code LIKE 'enc:%') THEN
    NEW.zip_code := encrypt_pii(NEW.zip_code);
  END IF;

  -- === Emergency contact ===
  IF NEW.emergency_contact IS NOT NULL AND NEW.emergency_contact != '' AND NOT (NEW.emergency_contact LIKE 'enc:%') THEN
    NEW.emergency_contact := encrypt_pii(NEW.emergency_contact);
  END IF;

  IF NEW.emergency_phone IS NOT NULL AND NEW.emergency_phone != '' AND NOT (NEW.emergency_phone LIKE 'enc:%') THEN
    NEW.emergency_phone := encrypt_pii(NEW.emergency_phone);
  END IF;

  -- === Health insurance number ===
  IF NEW.health_insurance_number IS NOT NULL AND NEW.health_insurance_number != '' AND NOT (NEW.health_insurance_number LIKE 'enc:%') THEN
    NEW.health_insurance_number := encrypt_pii(NEW.health_insurance_number);
  END IF;

  -- === Family data (child patients) ===
  IF NEW.mother_name IS NOT NULL AND NEW.mother_name != '' AND NOT (NEW.mother_name LIKE 'enc:%') THEN
    NEW.mother_name := encrypt_pii(NEW.mother_name);
  END IF;

  IF NEW.mother_phone IS NOT NULL AND NEW.mother_phone != '' AND NOT (NEW.mother_phone LIKE 'enc:%') THEN
    NEW.mother_phone := encrypt_pii(NEW.mother_phone);
  END IF;

  IF NEW.father_name IS NOT NULL AND NEW.father_name != '' AND NOT (NEW.father_name LIKE 'enc:%') THEN
    NEW.father_name := encrypt_pii(NEW.father_name);
  END IF;

  IF NEW.father_phone IS NOT NULL AND NEW.father_phone != '' AND NOT (NEW.father_phone LIKE 'enc:%') THEN
    NEW.father_phone := encrypt_pii(NEW.father_phone);
  END IF;

  -- === Medical data ===
  IF NEW.allergies IS NOT NULL AND NEW.allergies != '' AND NOT (NEW.allergies LIKE 'enc:%') THEN
    NEW.allergies := encrypt_pii(NEW.allergies);
  END IF;

  IF NEW.medications IS NOT NULL AND NEW.medications != '' AND NOT (NEW.medications LIKE 'enc:%') THEN
    NEW.medications := encrypt_pii(NEW.medications);
  END IF;

  IF NEW.medical_history IS NOT NULL AND NEW.medical_history != '' AND NOT (NEW.medical_history LIKE 'enc:%') THEN
    NEW.medical_history := encrypt_pii(NEW.medical_history);
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Recreate patients_secure view with decryption for new fields
CREATE VIEW patients_secure WITH (security_invoker = on) AS
SELECT
  id, clinic_id, user_id, name,
  phone,   -- NOT encrypted (WhatsApp + search + AI secretary)
  email,   -- NOT encrypted (search + OTP)
  birth_date,  -- NOT encrypted (birthday alert LIKE filter)

  -- Encrypted since Phase 1
  decrypt_pii(cpf) AS cpf,
  decrypt_pii(rg) AS rg,
  cpf_last4,

  -- Encrypted in Phase 2 (this migration)
  decrypt_pii(address) AS address,
  decrypt_pii(city) AS city,
  decrypt_pii(state) AS state,
  decrypt_pii(zip_code) AS zip_code,
  occupation,  -- NOT encrypted (not PII)
  decrypt_pii(emergency_contact) AS emergency_contact,
  decrypt_pii(emergency_phone) AS emergency_phone,
  health_insurance,  -- NOT encrypted (convênio name, not PII)
  decrypt_pii(health_insurance_number) AS health_insurance_number,
  decrypt_pii(allergies) AS allergies,
  decrypt_pii(medications) AS medications,
  decrypt_pii(medical_history) AS medical_history,
  notes,  -- NOT encrypted (internal clinical notes, not PII)
  return_alert_flag, return_alert_date, avatar_url,

  -- Child patient fields
  patient_type, gender,
  birthplace,  -- NOT encrypted (low sensitivity)
  school, school_grade,
  decrypt_pii(mother_name) AS mother_name,
  mother_occupation,
  decrypt_pii(mother_phone) AS mother_phone,
  decrypt_pii(father_name) AS father_name,
  father_occupation,
  decrypt_pii(father_phone) AS father_phone,
  legal_guardian,
  has_siblings, siblings_count, siblings_ages,

  created_at, updated_at
FROM patients
WHERE deleted_at IS NULL;

GRANT SELECT ON patients_secure TO authenticated;
GRANT SELECT ON patients_secure TO service_role;

-- 3. Update anonymize_patient_data snapshot to include new encrypted fields
--    The snapshot stores encrypted values (which is fine for audit),
--    but we add the new fields for completeness.
CREATE OR REPLACE FUNCTION anonymize_patient_data(
  p_patient_id uuid,
  p_user_id uuid,
  p_override_retention boolean DEFAULT false,
  p_override_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_patient record;
  v_retention_locked_until timestamptz;
  v_snapshot jsonb;
BEGIN
  -- Fetch patient
  SELECT * INTO v_patient FROM patients WHERE id = p_patient_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paciente não encontrado.';
  END IF;

  -- Check retention lock
  v_retention_locked_until := v_patient.retention_locked_until;
  IF v_retention_locked_until IS NOT NULL AND v_retention_locked_until > now() THEN
    IF NOT p_override_retention THEN
      RAISE EXCEPTION 'Dados protegidos por retenção legal até %.', v_retention_locked_until::date;
    END IF;
    IF p_override_reason IS NULL OR length(trim(p_override_reason)) < 10 THEN
      RAISE EXCEPTION 'Justificativa de override deve ter pelo menos 10 caracteres.';
    END IF;
  END IF;

  -- Snapshot for audit (pre-anonymization) — stores encrypted values as-is
  v_snapshot := jsonb_build_object(
    'name', v_patient.name,
    'cpf', v_patient.cpf,
    'rg', v_patient.rg,
    'email', v_patient.email,
    'phone', v_patient.phone,
    'address', v_patient.address,
    'city', v_patient.city,
    'state', v_patient.state,
    'zip_code', v_patient.zip_code,
    'emergency_contact', v_patient.emergency_contact,
    'emergency_phone', v_patient.emergency_phone,
    'health_insurance_number', v_patient.health_insurance_number,
    'mother_name', v_patient.mother_name,
    'mother_phone', v_patient.mother_phone,
    'father_name', v_patient.father_name,
    'father_phone', v_patient.father_phone,
    'allergies', v_patient.allergies,
    'medications', v_patient.medications,
    'medical_history', v_patient.medical_history,
    'override_retention', p_override_retention,
    'override_reason', p_override_reason
  );

  INSERT INTO audit_logs (
    action, table_name, record_id, user_id,
    new_data, created_at
  ) VALUES (
    'ANONYMIZE_SNAPSHOT', 'patients', p_patient_id, p_user_id,
    v_snapshot, now()
  );

  -- Anonymize patients table
  UPDATE patients SET
    name = 'PACIENTE ANONIMIZADO',
    cpf = NULL,
    rg = NULL,
    email = NULL,
    phone = NULL,
    address = NULL,
    city = NULL,
    state = NULL,
    zip_code = NULL,
    occupation = NULL,
    emergency_contact = NULL,
    emergency_phone = NULL,
    health_insurance_number = NULL,
    mother_name = NULL,
    father_name = NULL,
    mother_phone = NULL,
    father_phone = NULL,
    mother_occupation = NULL,
    father_occupation = NULL,
    legal_guardian = NULL,
    school = NULL,
    birthplace = NULL,
    allergies = NULL,
    medications = NULL,
    medical_history = NULL,
    cpf_last4 = NULL,
    deleted_at = COALESCE(deleted_at, now()),
    updated_at = now()
  WHERE id = p_patient_id;

  -- Anonymize voice consultation sessions
  UPDATE voice_consultation_sessions SET
    transcription = '[ANONIMIZADO]',
    extracted_data = '{}'::jsonb,
    updated_at = now()
  WHERE patient_id = p_patient_id;

  -- Revoke all consents
  UPDATE patient_consents SET
    granted = false,
    revoked_at = now(),
    updated_at = now()
  WHERE patient_id = p_patient_id
    AND revoked_at IS NULL;

  -- Audit log for completion
  INSERT INTO audit_logs (
    action, table_name, record_id, user_id,
    new_data, created_at
  ) VALUES (
    'ANONYMIZE_COMPLETE', 'patients', p_patient_id, p_user_id,
    jsonb_build_object('override', p_override_retention, 'reason', p_override_reason),
    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION anonymize_patient_data FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anonymize_patient_data TO service_role;

-- 4. Encrypt existing data in-place
-- The trigger fires on UPDATE, encrypting all plaintext fields.
-- We use a no-op update (SET updated_at = updated_at) to trigger encryption
-- without changing any actual values.
-- Run in batches to avoid locking the table for too long on large datasets.

DO $$
DECLARE
  batch_size int := 100;
  affected int := 1;
BEGIN
  WHILE affected > 0 LOOP
    WITH batch AS (
      SELECT id FROM patients
      WHERE deleted_at IS NULL
        AND (
          (address IS NOT NULL AND address != '' AND NOT (address LIKE 'enc:%'))
          OR (city IS NOT NULL AND city != '' AND NOT (city LIKE 'enc:%'))
          OR (state IS NOT NULL AND state != '' AND NOT (state LIKE 'enc:%'))
          OR (zip_code IS NOT NULL AND zip_code != '' AND NOT (zip_code LIKE 'enc:%'))
          OR (emergency_contact IS NOT NULL AND emergency_contact != '' AND NOT (emergency_contact LIKE 'enc:%'))
          OR (emergency_phone IS NOT NULL AND emergency_phone != '' AND NOT (emergency_phone LIKE 'enc:%'))
          OR (health_insurance_number IS NOT NULL AND health_insurance_number != '' AND NOT (health_insurance_number LIKE 'enc:%'))
          OR (mother_name IS NOT NULL AND mother_name != '' AND NOT (mother_name LIKE 'enc:%'))
          OR (mother_phone IS NOT NULL AND mother_phone != '' AND NOT (mother_phone LIKE 'enc:%'))
          OR (father_name IS NOT NULL AND father_name != '' AND NOT (father_name LIKE 'enc:%'))
          OR (father_phone IS NOT NULL AND father_phone != '' AND NOT (father_phone LIKE 'enc:%'))
          OR (allergies IS NOT NULL AND allergies != '' AND NOT (allergies LIKE 'enc:%'))
          OR (medications IS NOT NULL AND medications != '' AND NOT (medications LIKE 'enc:%'))
          OR (medical_history IS NOT NULL AND medical_history != '' AND NOT (medical_history LIKE 'enc:%'))
        )
      LIMIT batch_size
    )
    UPDATE patients p
    SET updated_at = updated_at
    FROM batch
    WHERE p.id = batch.id;

    GET DIAGNOSTICS affected = ROW_COUNT;
  END LOOP;
END;
$$;
