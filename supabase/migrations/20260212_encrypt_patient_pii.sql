-- =============================================
-- Phase 3.1: Encryption of Patient PII (CPF and RG)
-- LGPD Compliance — Organiza Odonto
-- =============================================
-- NOTE: Already applied to production. This file is for reference.
-- Encryption key is stored in _encryption_config table (not in code).

-- 1. Drop view that depends on cpf/rg columns
DROP VIEW IF EXISTS patients_secure;

-- 2. Expand CPF/RG columns to hold encrypted values
ALTER TABLE patients ALTER COLUMN cpf TYPE text;
ALTER TABLE patients ALTER COLUMN rg TYPE text;

-- 3. pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 4. Secure config table (inaccessible via API)
CREATE TABLE IF NOT EXISTS _encryption_config (
  key text PRIMARY KEY,
  value text NOT NULL
);
ALTER TABLE _encryption_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON _encryption_config FROM anon, authenticated, service_role;

-- IMPORTANT: Set your encryption key here before running
-- INSERT INTO _encryption_config (key, value)
-- VALUES ('encryption_key', 'YOUR_KEY_HERE')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 5. cpf_last4 column for searchable partial CPF
ALTER TABLE patients ADD COLUMN IF NOT EXISTS cpf_last4 text;

-- 6. Helper to read key (SECURITY DEFINER bypasses RLS/grants)
CREATE OR REPLACE FUNCTION _get_encryption_key()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE enc_key text;
BEGIN
  SELECT value INTO enc_key FROM _encryption_config WHERE key = 'encryption_key';
  RETURN enc_key;
END;
$$;
REVOKE EXECUTE ON FUNCTION _get_encryption_key() FROM anon, authenticated, service_role;

-- 7. Encrypt function
CREATE OR REPLACE FUNCTION encrypt_pii(plain_text text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE encryption_key text;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN RETURN plain_text; END IF;
  IF plain_text LIKE 'enc:%' THEN RETURN plain_text; END IF;
  encryption_key := _get_encryption_key();
  IF encryption_key IS NULL OR encryption_key = '' THEN RETURN plain_text; END IF;
  RETURN 'enc:' || encode(pgp_sym_encrypt(plain_text, encryption_key), 'base64');
END;
$$;

-- 8. Decrypt function
CREATE OR REPLACE FUNCTION decrypt_pii(encrypted_text text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE encryption_key text;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN RETURN encrypted_text; END IF;
  IF NOT (encrypted_text LIKE 'enc:%') THEN RETURN encrypted_text; END IF;
  encryption_key := _get_encryption_key();
  IF encryption_key IS NULL OR encryption_key = '' THEN RETURN '[ENCRYPTED]'; END IF;
  RETURN pgp_sym_decrypt(decode(substring(encrypted_text from 5), 'base64'), encryption_key);
EXCEPTION WHEN OTHERS THEN
  RETURN '[DECRYPT_ERROR]';
END;
$$;

-- 9. Extract last 4 CPF digits
CREATE OR REPLACE FUNCTION extract_cpf_last4(cpf_value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE digits text;
BEGIN
  IF cpf_value IS NULL OR cpf_value = '' THEN RETURN NULL; END IF;
  digits := regexp_replace(cpf_value, '[^0-9]', '', 'g');
  IF length(digits) < 4 THEN RETURN digits; END IF;
  RETURN right(digits, 4);
END;
$$;

-- 10. Trigger: auto-encrypt on INSERT/UPDATE
CREATE OR REPLACE FUNCTION trigger_encrypt_patient_pii()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
    IF NOT (NEW.cpf LIKE 'enc:%') THEN
      NEW.cpf_last4 := extract_cpf_last4(NEW.cpf);
      NEW.cpf := encrypt_pii(NEW.cpf);
    END IF;
  ELSE NEW.cpf_last4 := NULL;
  END IF;
  IF NEW.rg IS NOT NULL AND NEW.rg != '' THEN
    IF NOT (NEW.rg LIKE 'enc:%') THEN
      NEW.rg := encrypt_pii(NEW.rg);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_patient_pii ON patients;
CREATE TRIGGER trg_encrypt_patient_pii
  BEFORE INSERT OR UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION trigger_encrypt_patient_pii();

-- 11. Secure view with transparent decryption
CREATE OR REPLACE VIEW patients_secure AS
SELECT id, clinic_id, user_id, name, phone, email, birth_date,
  decrypt_pii(cpf) AS cpf, decrypt_pii(rg) AS rg, cpf_last4,
  address, city, state, zip_code, occupation,
  emergency_contact, emergency_phone,
  health_insurance, health_insurance_number,
  allergies, medications, medical_history, notes,
  return_alert_flag, return_alert_date, avatar_url,
  created_at, updated_at
FROM patients;
GRANT SELECT ON patients_secure TO authenticated;
GRANT SELECT ON patients_secure TO service_role;

-- 12. Index
CREATE INDEX IF NOT EXISTS idx_patients_cpf_last4
  ON patients(cpf_last4) WHERE cpf_last4 IS NOT NULL;

-- 13. Encrypt existing data
UPDATE patients SET cpf = cpf, rg = rg
WHERE (cpf IS NOT NULL AND cpf != '' AND NOT (cpf LIKE 'enc:%'))
   OR (rg IS NOT NULL AND rg != '' AND NOT (rg LIKE 'enc:%'));
