-- =============================================
-- Phase 3.4: Granular AI Consent (LGPD Art. 6-7)
-- Track patient consent for AI data processing
-- =============================================

-- 1. Patient consents table
CREATE TABLE IF NOT EXISTS patient_consents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL,
  consent_type text NOT NULL, -- 'ai_analysis', 'data_export'
  granted boolean NOT NULL DEFAULT false,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz,
  revoked_at timestamptz,
  notes text, -- how consent was obtained (verbal, written, digital)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, clinic_id, consent_type)
);

-- 2. RLS
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consents for their clinic"
  ON patient_consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.clinic_id = patient_consents.clinic_id
        AND clinic_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Dentists and admins can manage consents"
  ON patient_consents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.clinic_id = patient_consents.clinic_id
        AND clinic_users.user_id = auth.uid()
        AND clinic_users.role IN ('admin', 'dentist')
    )
  );

-- 3. Index for quick consent checks
CREATE INDEX IF NOT EXISTS idx_patient_consents_lookup
  ON patient_consents(patient_id, clinic_id, consent_type)
  WHERE granted = true AND revoked_at IS NULL;

-- 4. Helper function for Edge Functions (service role bypasses RLS)
-- Opt-out model: no record = consent assumed, only blocks if explicitly revoked
CREATE OR REPLACE FUNCTION check_patient_ai_consent(
  p_patient_id uuid,
  p_clinic_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  consent_record record;
BEGIN
  SELECT granted, revoked_at INTO consent_record
  FROM patient_consents
  WHERE patient_id = p_patient_id
    AND clinic_id = p_clinic_id
    AND consent_type = 'ai_analysis'
  ORDER BY updated_at DESC
  LIMIT 1;

  -- No record = consent assumed (opt-out model)
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  -- Explicitly revoked
  IF consent_record.revoked_at IS NOT NULL THEN
    RETURN false;
  END IF;

  RETURN consent_record.granted;
END;
$$;
