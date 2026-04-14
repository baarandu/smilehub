-- =====================================================================
-- Prevent privilege escalation via profiles UPDATE
-- =====================================================================
-- The profiles_update RLS policy (20260228_p0_security_critical_fixes.sql)
-- allows a user to update their own profile row using `id = auth.uid()`.
-- RLS does not restrict columns, so a user could run:
--     UPDATE profiles SET is_super_admin = true WHERE id = auth.uid();
-- and escalate to super admin.
--
-- Fix: a BEFORE UPDATE trigger that blocks any attempt to change
-- `is_super_admin` unless the caller is already a super admin OR the
-- update is running as service_role (bypassed by trigger owner).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.prevent_super_admin_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_super_admin boolean;
BEGIN
  -- Allow when the flag is unchanged
  IF NEW.is_super_admin IS NOT DISTINCT FROM OLD.is_super_admin THEN
    RETURN NEW;
  END IF;

  -- service_role bypass (no JWT → auth.uid() is NULL and current_user is service_role or supabase_admin)
  IF current_user IN ('service_role', 'supabase_admin', 'postgres') THEN
    RETURN NEW;
  END IF;

  -- Only an existing super admin can modify the flag
  SELECT COALESCE(p.is_super_admin, false) INTO caller_is_super_admin
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF NOT COALESCE(caller_is_super_admin, false) THEN
    RAISE EXCEPTION 'privilege escalation denied: is_super_admin cannot be modified by this user'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_super_admin_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_super_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_super_admin_escalation();


-- =====================================================================
-- RPC: is_super_admin() — server-side check for Edge Functions
-- =====================================================================
-- Admin Edge Functions should call this via supabase.rpc('is_super_admin')
-- with the user's JWT, rather than trusting a client-provided flag.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT p.is_super_admin FROM public.profiles p WHERE p.id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;
