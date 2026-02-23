-- Anonymize patient data (Art. 18 IV LGPD)
-- RPC that anonymizes all PII for a given patient

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

  -- Snapshot for audit (pre-anonymization)
  v_snapshot := jsonb_build_object(
    'name', v_patient.name,
    'cpf', v_patient.cpf,
    'rg', v_patient.rg,
    'email', v_patient.email,
    'phone', v_patient.phone,
    'address', v_patient.address,
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
    mother_name = NULL,
    father_name = NULL,
    mother_phone = NULL,
    father_phone = NULL,
    mother_occupation = NULL,
    father_occupation = NULL,
    legal_guardian = NULL,
    school = NULL,
    birthplace = NULL,
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

-- Only service_role can call this
REVOKE ALL ON FUNCTION anonymize_patient_data FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anonymize_patient_data TO service_role;
