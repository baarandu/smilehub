-- Fix: Ensure patients_secure view filters out soft-deleted patients.
-- This view may have lost the WHERE clause if migrations ran out of order.

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
