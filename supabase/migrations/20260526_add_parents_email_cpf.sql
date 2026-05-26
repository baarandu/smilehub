-- =============================================
-- Adiciona campos de CPF e Email para os pais dos pacientes
-- Mantendo padrão de criptografia PII e conformidade LGPD
-- =============================================

-- 1. Adicionar colunas na tabela base
-- Usamos TEXT para os CPFs pois eles armazenarão o payload criptografado (enc:...)
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS mother_cpf TEXT,
ADD COLUMN IF NOT EXISTS mother_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS father_cpf TEXT,
ADD COLUMN IF NOT EXISTS father_email VARCHAR(255);

-- 2. Atualizar trigger de criptografia
CREATE OR REPLACE FUNCTION trigger_encrypt_patient_pii()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  -- === CPF do Paciente ===
  IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
    IF NOT (NEW.cpf LIKE 'enc:%') THEN
      NEW.cpf_last4 := extract_cpf_last4(NEW.cpf);
      NEW.cpf := encrypt_pii(NEW.cpf);
    END IF;
  ELSE
    NEW.cpf_last4 := NULL;
  END IF;

  -- === RG ===
  IF NEW.rg IS NOT NULL AND NEW.rg != '' THEN
    IF NOT (NEW.rg LIKE 'enc:%') THEN
      NEW.rg := encrypt_pii(NEW.rg);
    END IF;
  END IF;

  -- === Campos de Endereço ===
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

  -- === Contato de Emergência ===
  IF NEW.emergency_contact IS NOT NULL AND NEW.emergency_contact != '' AND NOT (NEW.emergency_contact LIKE 'enc:%') THEN
    NEW.emergency_contact := encrypt_pii(NEW.emergency_contact);
  END IF;

  IF NEW.emergency_phone IS NOT NULL AND NEW.emergency_phone != '' AND NOT (NEW.emergency_phone LIKE 'enc:%') THEN
    NEW.emergency_phone := encrypt_pii(NEW.emergency_phone);
  END IF;

  -- === Número do Convênio ===
  IF NEW.health_insurance_number IS NOT NULL AND NEW.health_insurance_number != '' AND NOT (NEW.health_insurance_number LIKE 'enc:%') THEN
    NEW.health_insurance_number := encrypt_pii(NEW.health_insurance_number);
  END IF;

  -- === Dados da Família (Pacientes Crianças) ===
  IF NEW.mother_name IS NOT NULL AND NEW.mother_name != '' AND NOT (NEW.mother_name LIKE 'enc:%') THEN
    NEW.mother_name := encrypt_pii(NEW.mother_name);
  END IF;

  IF NEW.mother_phone IS NOT NULL AND NEW.mother_phone != '' AND NOT (NEW.mother_phone LIKE 'enc:%') THEN
    NEW.mother_phone := encrypt_pii(NEW.mother_phone);
  END IF;

  -- NOVO: CPF da Mãe
  IF NEW.mother_cpf IS NOT NULL AND NEW.mother_cpf != '' AND NOT (NEW.mother_cpf LIKE 'enc:%') THEN
    NEW.mother_cpf := encrypt_pii(NEW.mother_cpf);
  END IF;

  IF NEW.father_name IS NOT NULL AND NEW.father_name != '' AND NOT (NEW.father_name LIKE 'enc:%') THEN
    NEW.father_name := encrypt_pii(NEW.father_name);
  END IF;

  IF NEW.father_phone IS NOT NULL AND NEW.father_phone != '' AND NOT (NEW.father_phone LIKE 'enc:%') THEN
    NEW.father_phone := encrypt_pii(NEW.father_phone);
  END IF;

  -- NOVO: CPF do Pai
  IF NEW.father_cpf IS NOT NULL AND NEW.father_cpf != '' AND NOT (NEW.father_cpf LIKE 'enc:%') THEN
    NEW.father_cpf := encrypt_pii(NEW.father_cpf);
  END IF;

  -- === Dados Médicos ===
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

-- 3. Recriar a view patients_secure com descriptografia
DROP VIEW IF EXISTS patients_secure;
CREATE VIEW patients_secure WITH (security_invoker = on) AS
SELECT
  id, clinic_id, user_id, name,
  phone, email, birth_date,
  decrypt_pii(cpf) AS cpf,
  decrypt_pii(rg) AS rg,
  cpf_last4,
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
  patient_type, gender, birthplace, school, school_grade,
  decrypt_pii(mother_name) AS mother_name,
  mother_occupation,
  decrypt_pii(mother_phone) AS mother_phone,
  decrypt_pii(mother_cpf) AS mother_cpf,   -- NOVO
  mother_email,                            -- NOVO
  decrypt_pii(father_name) AS father_name,
  father_occupation,
  decrypt_pii(father_phone) AS father_phone,
  decrypt_pii(father_cpf) AS father_cpf,   -- NOVO
  father_email,                            -- NOVO
  legal_guardian,
  has_siblings, siblings_count, siblings_ages,
  
  created_at, updated_at
FROM patients
WHERE deleted_at IS NULL;

GRANT SELECT ON patients_secure TO authenticated;
GRANT SELECT ON patients_secure TO service_role;

-- 4. Atualizar função de anonimização (Snapshot e Update)
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
  SELECT * INTO v_patient FROM patients WHERE id = p_patient_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paciente não encontrado.';
  END IF;

  v_retention_locked_until := v_patient.retention_locked_until;
  IF v_retention_locked_until IS NOT NULL AND v_retention_locked_until > now() THEN
    IF NOT p_override_retention THEN
      RAISE EXCEPTION 'Dados protegidos por retenção legal até %.', v_retention_locked_until::date;
    END IF;
  END IF;

  -- Snapshot para auditoria
  v_snapshot := jsonb_build_object(
    'name', v_patient.name,
    'cpf', v_patient.cpf,
    'mother_cpf', v_patient.mother_cpf,
    'mother_email', v_patient.mother_email,
    'father_cpf', v_patient.father_cpf,
    'father_email', v_patient.father_email,
    'override_reason', p_override_reason
  );

  INSERT INTO audit_logs (action, table_name, record_id, user_id, new_data)
  VALUES ('ANONYMIZE_SNAPSHOT', 'patients', p_patient_id, p_user_id, v_snapshot);

  -- Anonimizar tabela patients
  UPDATE patients SET
    name = 'PACIENTE ANONIMIZADO',
    cpf = NULL, rg = NULL, email = NULL, phone = NULL,
    address = NULL, city = NULL, state = NULL, zip_code = NULL,
    mother_name = NULL, mother_phone = NULL, mother_cpf = NULL, mother_email = NULL,
    father_name = NULL, father_phone = NULL, father_cpf = NULL, father_email = NULL,
    deleted_at = COALESCE(deleted_at, now()),
    updated_at = now()
  WHERE id = p_patient_id;
END;
$$;
