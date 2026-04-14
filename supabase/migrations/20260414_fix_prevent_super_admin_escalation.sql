-- =====================================================================
-- Fix: prevent_super_admin_escalation trigger
-- =====================================================================
-- Bug in 20260414_prevent_super_admin_escalation.sql: the trigger function
-- was SECURITY DEFINER, so inside it `current_user` became the function
-- owner (postgres). The bypass branch `current_user IN ('postgres', ...)`
-- then matched for EVERY caller, including end-users — letting any
-- authenticated user set is_super_admin = true.
--
-- Fix: use auth.uid() IS NULL to detect non-user callers (service_role /
-- backend / direct DB), and run the trigger as SECURITY INVOKER so the
-- RLS-protected SELECT against profiles behaves correctly.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.prevent_super_admin_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
-- SECURITY INVOKER (default) — we want auth.uid() / RLS to reflect the caller
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  caller_is_super_admin boolean;
BEGIN
  -- Allow when the flag is unchanged
  IF NEW.is_super_admin IS NOT DISTINCT FROM OLD.is_super_admin THEN
    RETURN NEW;
  END IF;

  caller_id := auth.uid();

  -- No JWT context = backend / service_role / direct DB admin: allow.
  -- (Backend code that legitimately promotes a user runs with service_role.)
  IF caller_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Otherwise, the caller must already be a super admin themselves.
  -- This SELECT runs as the invoker; RLS on profiles lets a user read
  -- their own row, so a real super admin will see is_super_admin=true.
  SELECT COALESCE(p.is_super_admin, false) INTO caller_is_super_admin
  FROM public.profiles p
  WHERE p.id = caller_id;

  IF NOT COALESCE(caller_is_super_admin, false) THEN
    RAISE EXCEPTION 'privilege escalation denied: is_super_admin cannot be modified by this user'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach the trigger (definition unchanged, but safe to recreate).
DROP TRIGGER IF EXISTS trg_prevent_super_admin_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_super_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_super_admin_escalation();
