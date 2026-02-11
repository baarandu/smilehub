-- =============================================
-- Phase 3.3: Data Retention Policy (LGPD Art. 15-16)
-- Automatic cleanup of temporary/session data
-- =============================================

-- 1. Data retention configuration table
CREATE TABLE IF NOT EXISTS data_retention_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid DEFAULT NULL, -- NULL = global default
  entity_type text NOT NULL,
  retention_days integer NOT NULL DEFAULT 90,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, entity_type)
);

ALTER TABLE data_retention_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage retention config
CREATE POLICY "Admins can manage retention config"
  ON data_retention_config
  FOR ALL
  USING (
    clinic_id IS NULL
    OR EXISTS (
      SELECT 1 FROM clinic_users
      WHERE clinic_users.clinic_id = data_retention_config.clinic_id
        AND clinic_users.user_id = auth.uid()
        AND clinic_users.role = 'admin'
    )
  );

-- 2. Default retention policies
INSERT INTO data_retention_config (clinic_id, entity_type, retention_days) VALUES
  (NULL, 'voice_sessions', 90),
  (NULL, 'ai_conversations', 180),
  (NULL, 'rate_limits', 1),
  (NULL, 'audit_logs', 730)
ON CONFLICT (clinic_id, entity_type) DO NOTHING;

-- 3. Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  voice_days int;
  ai_days int;
  rate_days int;
  voice_deleted int := 0;
  ai_deleted int := 0;
  rate_deleted int := 0;
BEGIN
  -- Get retention periods (global defaults)
  SELECT retention_days INTO voice_days
    FROM data_retention_config
    WHERE entity_type = 'voice_sessions' AND clinic_id IS NULL;
  voice_days := COALESCE(voice_days, 90);

  SELECT retention_days INTO ai_days
    FROM data_retention_config
    WHERE entity_type = 'ai_conversations' AND clinic_id IS NULL;
  ai_days := COALESCE(ai_days, 180);

  SELECT retention_days INTO rate_days
    FROM data_retention_config
    WHERE entity_type = 'rate_limits' AND clinic_id IS NULL;
  rate_days := COALESCE(rate_days, 1);

  -- Delete expired voice consultation sessions
  DELETE FROM voice_consultation_sessions
  WHERE created_at < NOW() - (voice_days || ' days')::interval;
  GET DIAGNOSTICS voice_deleted = ROW_COUNT;

  -- Delete expired AI secretary conversations
  DELETE FROM ai_secretary_conversations
  WHERE created_at < NOW() - (ai_days || ' days')::interval;
  GET DIAGNOSTICS ai_deleted = ROW_COUNT;

  -- Delete expired rate limit records
  DELETE FROM api_rate_limits
  WHERE created_at < NOW() - (rate_days || ' days')::interval;
  GET DIAGNOSTICS rate_deleted = ROW_COUNT;

  -- Note: audit_logs are NOT auto-deleted (730 days retention for manual review only)

  RETURN jsonb_build_object(
    'voice_sessions_deleted', voice_deleted,
    'ai_conversations_deleted', ai_deleted,
    'rate_limits_deleted', rate_deleted,
    'executed_at', now()
  );
END;
$$;

-- 4. Enable pg_cron for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 3:00 AM UTC
SELECT cron.schedule(
  'cleanup-expired-data',
  '0 3 * * *',
  $$SELECT cleanup_expired_data()$$
);
