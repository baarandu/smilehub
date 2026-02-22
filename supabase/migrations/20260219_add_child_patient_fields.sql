-- Migration: Add child patient (odontopediatria) fields
-- Date: 2026-02-19

-- 1. Add new columns to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_type text NOT NULL DEFAULT 'adult';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS birthplace text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS school text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS school_grade text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS mother_name text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS mother_occupation text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS mother_phone text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS father_name text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS father_occupation text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS father_phone text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS legal_guardian text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS has_siblings boolean DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS siblings_count text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS siblings_ages text;

-- 2. Add check constraint for patient_type
ALTER TABLE patients ADD CONSTRAINT chk_patient_type CHECK (patient_type IN ('adult', 'child'));

-- 3. Recreate patients_secure view to include new columns
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
FROM patients;
GRANT SELECT ON patients_secure TO authenticated;
GRANT SELECT ON patients_secure TO service_role;
