-- Phase 4: Audit Logging & Monitoring
-- Extends existing audit_logs table with source/function tracking
-- Adds RPCs for security dashboard

-- 1. Add new columns to audit_logs
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS source text DEFAULT 'frontend';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS function_name text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS request_id text;

-- 2. Allow NULL clinic_id (Edge Functions like send-invite/ai-secretary may not have one)
ALTER TABLE public.audit_logs ALTER COLUMN clinic_id DROP NOT NULL;

-- 3. Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_source_idx ON public.audit_logs(source);
CREATE INDEX IF NOT EXISTS audit_logs_function_name_idx ON public.audit_logs(function_name);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);

-- 4. Add RLS policy to allow edge functions (service role) to insert without clinic_id
-- The existing insert policy requires clinic membership, but edge functions use service role
-- which bypasses RLS, so no new policy needed.

-- 5. RPC: Fetch audit logs with filtering (super_admin only)
CREATE OR REPLACE FUNCTION public.admin_get_security_audit_logs(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_action text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_function_name text DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_count bigint;
BEGIN
  -- Only super admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: super admin required';
  END IF;

  -- Get total count with filters
  SELECT count(*) INTO total_count
  FROM public.audit_logs al
  WHERE (p_action IS NULL OR al.action = p_action)
    AND (p_source IS NULL OR al.source = p_source)
    AND (p_function_name IS NULL OR al.function_name = p_function_name)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date);

  -- Get paginated results with user/clinic info
  SELECT jsonb_build_object(
    'total', total_count,
    'logs', COALESCE(jsonb_agg(row_data ORDER BY created_at DESC), '[]'::jsonb)
  ) INTO result
  FROM (
    SELECT jsonb_build_object(
      'id', al.id,
      'action', al.action,
      'table_name', al.table_name,
      'record_id', al.record_id,
      'new_data', al.new_data,
      'source', al.source,
      'function_name', al.function_name,
      'request_id', al.request_id,
      'created_at', al.created_at,
      'user_id', al.user_id,
      'user_email', p.email,
      'user_name', p.full_name,
      'clinic_id', al.clinic_id,
      'clinic_name', c.name
    ) AS row_data,
    al.created_at
    FROM public.audit_logs al
    LEFT JOIN public.profiles p ON p.id = al.user_id
    LEFT JOIN public.clinics c ON c.id = al.clinic_id
    WHERE (p_action IS NULL OR al.action = p_action)
      AND (p_source IS NULL OR al.source = p_source)
      AND (p_function_name IS NULL OR al.function_name = p_function_name)
      AND (p_start_date IS NULL OR al.created_at >= p_start_date)
      AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) sub;

  RETURN result;
END;
$$;

-- 6. RPC: Security metrics aggregation (super_admin only)
CREATE OR REPLACE FUNCTION public.admin_get_security_metrics(
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_total bigint;
  v_auth_failures bigint;
  v_ai_requests bigint;
  v_exports bigint;
  v_patient_reads bigint;
  v_rate_limits bigint;
  v_consent_denials bigint;
  v_events_by_action jsonb;
  v_events_by_function jsonb;
  v_daily_events jsonb;
BEGIN
  -- Only super admins can call this
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: super admin required';
  END IF;

  -- Total events in range
  SELECT count(*) INTO v_total
  FROM public.audit_logs
  WHERE created_at >= p_start_date AND created_at <= p_end_date;

  -- Auth failures
  SELECT count(*) INTO v_auth_failures
  FROM public.audit_logs
  WHERE action = 'AUTH_FAILURE'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  -- AI requests
  SELECT count(*) INTO v_ai_requests
  FROM public.audit_logs
  WHERE action = 'AI_REQUEST'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  -- Exports
  SELECT count(*) INTO v_exports
  FROM public.audit_logs
  WHERE action = 'EXPORT'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  -- Patient reads
  SELECT count(*) INTO v_patient_reads
  FROM public.audit_logs
  WHERE action = 'READ' AND table_name = 'patients'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  -- Rate limit exceeded
  SELECT count(*) INTO v_rate_limits
  FROM public.audit_logs
  WHERE action = 'RATE_LIMIT_EXCEEDED'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  -- Consent denials
  SELECT count(*) INTO v_consent_denials
  FROM public.audit_logs
  WHERE action = 'CONSENT_DENIED'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  -- Events by action (top 10)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('action', action, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_events_by_action
  FROM (
    SELECT action, count(*) AS cnt
    FROM public.audit_logs
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY action
    ORDER BY cnt DESC
    LIMIT 10
  ) sub;

  -- Events by function (top 10)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('function_name', fn, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_events_by_function
  FROM (
    SELECT COALESCE(function_name, 'frontend') AS fn, count(*) AS cnt
    FROM public.audit_logs
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY function_name
    ORDER BY cnt DESC
    LIMIT 10
  ) sub;

  -- Daily events (last 30 days)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d, 'count', cnt) ORDER BY d), '[]'::jsonb)
  INTO v_daily_events
  FROM (
    SELECT date_trunc('day', created_at)::date AS d, count(*) AS cnt
    FROM public.audit_logs
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY d
    ORDER BY d
  ) sub;

  result := jsonb_build_object(
    'total', v_total,
    'auth_failures', v_auth_failures,
    'ai_requests', v_ai_requests,
    'exports', v_exports,
    'patient_reads', v_patient_reads,
    'rate_limits', v_rate_limits,
    'consent_denials', v_consent_denials,
    'events_by_action', v_events_by_action,
    'events_by_function', v_events_by_function,
    'daily_events', v_daily_events
  );

  RETURN result;
END;
$$;

-- 7. Grant execute permissions to authenticated users (RPCs enforce super_admin check internally)
GRANT EXECUTE ON FUNCTION public.admin_get_security_audit_logs(int, int, text, text, text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_security_metrics(timestamptz, timestamptz) TO authenticated;
