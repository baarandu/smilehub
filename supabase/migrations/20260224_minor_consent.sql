-- Minor consent support (Art. 14 LGPD)
-- Adds guardian_name and ip_address columns to patient_consents

ALTER TABLE patient_consents
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS ip_address text;

-- RPC to check if a minor patient has valid consent
CREATE OR REPLACE FUNCTION check_minor_consent(p_patient_id uuid, p_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_consent boolean;
BEGIN
  -- Fail-closed: no record = no consent
  SELECT granted INTO v_has_consent
  FROM patient_consents
  WHERE patient_id = p_patient_id
    AND clinic_id = p_clinic_id
    AND consent_type = 'minor_data_processing'
    AND revoked_at IS NULL
  ORDER BY granted_at DESC
  LIMIT 1;

  RETURN COALESCE(v_has_consent, false);
END;
$$;
