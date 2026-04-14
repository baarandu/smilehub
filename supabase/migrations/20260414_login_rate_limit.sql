-- =====================================================================
-- Server-side login rate limit
-- =====================================================================
-- The existing client-side limiter (src/lib/rateLimit.ts) is bypassable
-- (localStorage). This adds a DB-backed record of login attempts that
-- is authoritative. The client still calls the local limiter for UX,
-- but the server check is what actually enforces the lockout.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash text NOT NULL, -- sha256(lower(email)); avoids storing raw email for failed guesses
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON public.login_attempts (email_hash, attempted_at DESC);

-- RLS: block all direct access. Only the SECURITY DEFINER RPCs touch this table.
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_attempts FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public._login_email_hash(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(lower(trim(p_email)), 'sha256'), 'hex');
$$;


-- Check whether this email is currently locked out.
-- Threshold: 5 failed attempts within 15 minutes → lockout for 15 minutes
--            from the most recent failure.
CREATE OR REPLACE FUNCTION public.check_login_lockout(p_email text)
RETURNS TABLE(locked boolean, minutes_remaining int, remaining_attempts int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_hash text;
  v_window_start timestamptz;
  v_fail_count int;
  v_last_fail timestamptz;
  v_max_attempts constant int := 5;
  v_window_minutes constant int := 15;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN QUERY SELECT false, 0, v_max_attempts;
    RETURN;
  END IF;

  v_hash := public._login_email_hash(p_email);
  v_window_start := now() - (v_window_minutes || ' minutes')::interval;

  SELECT count(*), max(attempted_at)
  INTO v_fail_count, v_last_fail
  FROM public.login_attempts
  WHERE email_hash = v_hash
    AND success = false
    AND attempted_at >= v_window_start;

  IF v_fail_count >= v_max_attempts THEN
    RETURN QUERY SELECT
      true,
      GREATEST(
        0,
        ceil(extract(epoch FROM (v_last_fail + (v_window_minutes || ' minutes')::interval - now())) / 60)::int
      ),
      0;
  ELSE
    RETURN QUERY SELECT false, 0, GREATEST(0, v_max_attempts - v_fail_count);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_login_lockout(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_login_lockout(text) TO anon, authenticated;


-- Record a login attempt (success or failure).
-- Returns the resulting lockout state so the client can react.
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean)
RETURNS TABLE(locked boolean, minutes_remaining int, remaining_attempts int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RETURN QUERY SELECT false, 0, 5;
    RETURN;
  END IF;

  v_hash := public._login_email_hash(p_email);

  INSERT INTO public.login_attempts (email_hash, success)
  VALUES (v_hash, COALESCE(p_success, false));

  -- On success: drop the failure history for this email so the counter resets.
  IF p_success THEN
    DELETE FROM public.login_attempts
    WHERE email_hash = v_hash AND success = false;
  END IF;

  -- Opportunistic cleanup of very old rows (keeps the table bounded).
  DELETE FROM public.login_attempts
  WHERE attempted_at < now() - interval '1 day';

  RETURN QUERY SELECT * FROM public.check_login_lockout(p_email);
END;
$$;

REVOKE ALL ON FUNCTION public.record_login_attempt(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean) TO anon, authenticated;
