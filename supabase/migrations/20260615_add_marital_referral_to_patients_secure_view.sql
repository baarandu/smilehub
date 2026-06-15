-- Fix: estado civil, "como conheceu a clínica" e "possui filhos" não apareciam
-- salvos no cadastro do paciente.
--
-- Causa: as colunas marital_status / has_children / children_count /
-- referral_source / referral_source_other foram adicionadas à tabela `patients`
-- (migration 20260327) e o frontend grava nelas corretamente, mas a view
-- `patients_secure` — origem de TODAS as leituras de paciente — tem lista de
-- colunas explícita e nunca passou a expor esses campos. A recriação posterior
-- (20260526) também os omitiu. Resultado: os dados eram gravados na tabela mas
-- liam-se sempre da view, retornando undefined, e o formulário reabria em branco.
--
-- Esta migration garante as colunas (idempotente, contra drift de produção) e
-- recria a view incluindo-as. Campos não são criptografados (text/boolean/int),
-- então entram diretamente, sem decrypt_pii.

-- Resolver objetos em public; pgcrypto (usado por decrypt_pii) vive em extensions.
SET search_path = public, extensions;

-- 1. Garantir que as colunas existem (no-op se 20260327 já rodou em produção)
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS has_children boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS children_count integer,
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS referral_source_other text;

-- 2. Recriar a view patients_secure expondo os campos demográficos faltantes
DROP VIEW IF EXISTS patients_secure;
CREATE VIEW patients_secure WITH (security_invoker = on) AS
SELECT
  id, clinic_id, user_id, name,
  phone,
  -- email é criptografado (Phase 2b / 20260310). decrypt_pii lida com valores
  -- mistos (enc:... antigos e texto puro novos), retornando o valor como está
  -- quando não tem prefixo enc:. NÃO listar email cru aqui (mostra ciphertext).
  decrypt_pii(email) AS email,
  email_hash,
  birth_date,
  decrypt_pii(cpf) AS cpf,
  decrypt_pii(rg) AS rg,
  cpf_last4,
  decrypt_pii(address) AS address,
  decrypt_pii(city) AS city,
  decrypt_pii(state) AS state,
  decrypt_pii(zip_code) AS zip_code,
  occupation,
  -- Campos demográficos (NOVO: expostos na view)
  marital_status, has_children, children_count,
  referral_source, referral_source_other,
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
  decrypt_pii(mother_cpf) AS mother_cpf,
  mother_email,
  decrypt_pii(father_name) AS father_name,
  father_occupation,
  decrypt_pii(father_phone) AS father_phone,
  decrypt_pii(father_cpf) AS father_cpf,
  father_email,
  legal_guardian,
  has_siblings, siblings_count, siblings_ages,

  created_at, updated_at
FROM patients
WHERE deleted_at IS NULL;

GRANT SELECT ON patients_secure TO authenticated;
GRANT SELECT ON patients_secure TO service_role;
