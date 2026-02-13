-- =============================================
-- Security Advisor Fixes
-- Resolves: 1 error, 11 SQL warnings, 4 info items
-- =============================================
-- NOTE: "Leaked Password Protection Disabled" must be enabled in the
-- Supabase Dashboard: Authentication > Providers > Email > Leaked Password Protection.
-- It cannot be set via SQL migration.

-- NOTE: nbn_fila_mensagens and nbn_historico_mensagens (flagged as "RLS Enabled No Policy")
-- are not part of this codebase. Add deny-all policies manually if they exist in production:
--   CREATE POLICY "deny_all" ON public.nbn_fila_mensagens FOR ALL USING (false) WITH CHECK (false);
--   CREATE POLICY "deny_all" ON public.nbn_historico_mensagens FOR ALL USING (false) WITH CHECK (false);


-- ===== ERROR: Security Definer View on patients_secure =====
-- Recreate with security_invoker = on so it respects the caller's RLS
-- instead of running with the view owner's privileges.
-- decrypt_pii() is SECURITY DEFINER and still works regardless.
DROP VIEW IF EXISTS patients_secure;
CREATE VIEW patients_secure WITH (security_invoker = on) AS
SELECT id, clinic_id, user_id, name, phone, email, birth_date,
  decrypt_pii(cpf) AS cpf, decrypt_pii(rg) AS rg, cpf_last4,
  address, city, state, zip_code, occupation,
  emergency_contact, emergency_phone,
  health_insurance, health_insurance_number,
  allergies, medications, medical_history, notes,
  return_alert_flag, return_alert_date, avatar_url,
  created_at, updated_at
FROM patients;
GRANT SELECT ON patients_secure TO authenticated;
GRANT SELECT ON patients_secure TO service_role;


-- ===== WARNINGS: Function Search Path Mutable (9 functions) =====
ALTER FUNCTION public.update_voice_consultation_sessions_updated_at()
  SET search_path = public;

ALTER FUNCTION public.update_dentist_conversation_metadata()
  SET search_path = public;

ALTER FUNCTION public.cleanup_rate_limits()
  SET search_path = public;

ALTER FUNCTION public.extract_cpf_last4(text)
  SET search_path = public;

ALTER FUNCTION public.update_conversation_metadata()
  SET search_path = public;

ALTER FUNCTION public.calculate_factor_r(uuid, date, date)
  SET search_path = public;

ALTER FUNCTION public.calculate_simples_tax(uuid, date, integer)
  SET search_path = public;

ALTER FUNCTION public.validate_bookkeeping(uuid, date)
  SET search_path = public;

ALTER FUNCTION public.get_monthly_summary(uuid, date)
  SET search_path = public;


-- ===== WARNINGS: RLS Policy Always True on audit_logs =====
-- Drop ALL existing policies (there may be extra ones created outside migrations)
-- then recreate with proper restrictive conditions.
-- Edge Functions use service_role (bypasses RLS) so they are unaffected.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'audit_logs' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', pol.policyname);
  END LOOP;
END;
$$;

-- INSERT: clinic members can insert logs for their own clinic
CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND clinic_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE clinic_users.clinic_id = audit_logs.clinic_id
      AND clinic_users.user_id = auth.uid()
    )
  );

-- SELECT: admins can view their clinic's logs (NULL clinic_id rows visible only via RPC)
CREATE POLICY "audit_logs_select"
  ON public.audit_logs FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE clinic_users.clinic_id = audit_logs.clinic_id
      AND clinic_users.user_id = auth.uid()
      AND clinic_users.role = 'admin'
    )
  );


-- ===== INFO: RLS Enabled No Policy (tables accessed only via service role) =====
-- Add explicit deny-all policies to silence the warnings.
-- These tables are intentionally inaccessible via the API:
-- _encryption_config is locked via REVOKE ALL, api_rate_limits via service role only.

CREATE POLICY "No direct access to encryption config"
  ON public._encryption_config FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct access to rate limits"
  ON public.api_rate_limits FOR ALL
  USING (false)
  WITH CHECK (false);
