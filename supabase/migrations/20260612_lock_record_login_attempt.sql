-- Pentest finding #18: record_login_attempt was callable by anon, letting any
-- unauthenticated client poison the login_attempts table for arbitrary emails
-- (lock a victim out of their own account without knowing the password).
--
-- ==> APPLY THIS LAST <==
-- Only after the `login-attempt` edge function AND the frontend build that calls
-- it (src/lib/rateLimit.ts -> supabase.functions.invoke('login-attempt')) are
-- live and verified. The frontend fails open, so an out-of-order apply does not
-- break login; it merely disables server-side lockout until the new build is up.
--
-- After this migration the recorder is reachable only through the edge function,
-- which runs with the service role and throttles by IP.
--
-- check_login_lockout stays granted to anon: it is read-only (cannot poison the
-- table) and the login UI needs it pre-auth to show "locked, X min remaining".

REVOKE EXECUTE ON FUNCTION public.record_login_attempt(text, boolean) FROM anon, authenticated;

-- The edge function calls it via the service role.
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean) TO service_role;
