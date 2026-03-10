-- =============================================
-- Phase 2b: Encrypt patient email
-- LGPD Compliance — Organiza Odonto
-- =============================================
-- Email is used in ILIKE search, so we create email_hash for exact-match lookup.
-- Partial search by email (e.g. "gmail") will no longer work.
-- =============================================

-- 0. Drop view (required to alter column types)
DROP VIEW IF EXISTS patients_secure;

-- 0.1 Ensure email column is text (may be varchar)
ALTER TABLE patients ALTER COLUMN email TYPE text;

-- 0.2 Add email_hash column for searchable exact-match
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email_hash text;

-- 1. Create helper to compute email hash (lowercase, trimmed, SHA-256)
CREATE OR REPLACE FUNCTION compute_email_hash(email_value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF email_value IS NULL OR email_value = '' THEN RETURN NULL; END IF;
  RETURN encode(digest(lower(trim(email_value)), 'sha256'), 'hex');
END;
$$;

-- 2. Update trigger to also encrypt email and compute email_hash
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

  -- === Email (Phase 2b) ===
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    IF NOT (NEW.email LIKE 'enc:%') THEN
      NEW.email_hash := compute_email_hash(NEW.email);
      NEW.email := encrypt_pii(NEW.email);
    END IF;
  ELSE
    NEW.email_hash := NULL;
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

-- 3. Recreate patients_secure view with email decryption
CREATE VIEW patients_secure WITH (security_invoker = on) AS
SELECT
  id, clinic_id, user_id, name,
  phone,        -- NOT encrypted (WhatsApp + search + AI secretary)
  decrypt_pii(email) AS email,  -- Encrypted in Phase 2b
  email_hash,   -- Plaintext hash for exact-match search
  birth_date,   -- NOT encrypted (birthday alert LIKE filter)

  -- Encrypted since Phase 1
  decrypt_pii(cpf) AS cpf,
  decrypt_pii(rg) AS rg,
  cpf_last4,

  -- Encrypted in Phase 2
  decrypt_pii(address) AS address,
  decrypt_pii(city) AS city,
  decrypt_pii(state) AS state,
  decrypt_pii(zip_code) AS zip_code,
  occupation,
  decrypt_pii(emergency_contact) AS emergency_contact,
  decrypt_pii(emergency_phone) AS emergency_phone,
  health_insurance,
  decrypt_pii(health_insurance_number) AS health_insurance_number,
  decrypt_pii(allergies) AS allergies,
  decrypt_pii(medications) AS medications,
  decrypt_pii(medical_history) AS medical_history,
  notes,
  return_alert_flag, return_alert_date, avatar_url,

  -- Child patient fields
  patient_type, gender,
  birthplace, school, school_grade,
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

-- 4. Index on email_hash for fast exact-match lookups
CREATE INDEX IF NOT EXISTS idx_patients_email_hash
  ON patients(email_hash) WHERE email_hash IS NOT NULL;

-- 5. Encrypt existing email data in batches
DO $$
DECLARE
  batch_size int := 100;
  affected int := 1;
BEGIN
  WHILE affected > 0 LOOP
    WITH batch AS (
      SELECT id FROM patients
      WHERE email IS NOT NULL
        AND email != ''
        AND NOT (email LIKE 'enc:%')
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
