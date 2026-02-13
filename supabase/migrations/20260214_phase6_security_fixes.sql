-- =============================================
-- Phase 6 Security Fixes
-- 1. get_profiles_for_users: restrict to shared clinic members
-- 2. Voice transcription encryption
-- =============================================

-- ===== 1. Secure get_profiles_for_users =====
-- Only return profiles for users that share at least one clinic with the caller.
CREATE OR REPLACE FUNCTION get_profiles_for_users(user_ids uuid[])
RETURNS TABLE (id uuid, email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT DISTINCT u.id, u.email::text, p.full_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = ANY(user_ids)
    AND EXISTS (
      SELECT 1 FROM clinic_users cu1
      INNER JOIN clinic_users cu2 ON cu1.clinic_id = cu2.clinic_id
      WHERE cu1.user_id = auth.uid()
        AND cu2.user_id = u.id
    );
END;
$$;

-- ===== 2. Voice transcription encryption =====
-- Add encrypted column for transcriptions
ALTER TABLE voice_consultation_sessions
  ADD COLUMN IF NOT EXISTS transcription_encrypted bytea;

-- Function to encrypt and store transcription
CREATE OR REPLACE FUNCTION encrypt_voice_transcription(
  p_session_id uuid,
  p_transcription text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key text;
BEGIN
  SELECT key INTO v_key FROM _encryption_config WHERE id = 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;

  UPDATE voice_consultation_sessions
  SET
    transcription_encrypted = pgp_sym_encrypt(p_transcription, v_key),
    transcription = NULL
  WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION encrypt_voice_transcription(uuid, text) TO service_role;

-- Secure view for reading transcriptions (decrypts on read)
CREATE OR REPLACE VIEW voice_consultation_sessions_secure
WITH (security_invoker = on)
AS
SELECT
  id, clinic_id, patient_id, appointment_id, user_id,
  status, is_new_patient, consent_given, consent_given_at,
  audio_duration_seconds,
  CASE
    WHEN transcription_encrypted IS NOT NULL THEN
      decrypt_pii(encode(transcription_encrypted, 'base64'))
    ELSE
      transcription
  END AS transcription,
  extracted_patient_data, extracted_anamnesis_data, extracted_consultation_data,
  saved_patient_id, saved_anamnesis_id, saved_consultation_id,
  processing_started_at, processing_completed_at, processing_error,
  whisper_tokens_used, gpt_tokens_used, estimated_cost_usd,
  created_at, updated_at
FROM voice_consultation_sessions;

GRANT SELECT ON voice_consultation_sessions_secure TO authenticated;
GRANT SELECT ON voice_consultation_sessions_secure TO service_role;

-- Set search_path on encrypt function
ALTER FUNCTION encrypt_voice_transcription(uuid, text)
  SET search_path = public, extensions;
