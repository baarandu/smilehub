-- P2-4: Fix encrypt_voice_transcription to use correct column names
-- Table schema: _encryption_config (key text PK, value text)
-- The phase6 migration had `WHERE id = 1` which is wrong — `id` column doesn't exist.
-- Correct lookup: WHERE key = 'encryption_key', SELECT value INTO v_key

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
  SELECT value INTO v_key FROM _encryption_config WHERE key = 'encryption_key';
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
