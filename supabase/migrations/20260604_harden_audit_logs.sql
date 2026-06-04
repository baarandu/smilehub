-- Harden audit_logs access after pentest findings #9 and #17.
-- Logs become append-only and readable by clinic admins for their own clinic.

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Direct client writes are no longer allowed. Frontend code must use
-- public.log_audit_event, which validates the authenticated user's clinic.
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public._prevent_audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs sao imutaveis e nao podem ser alterados';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public._prevent_audit_log_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs sao imutaveis e nao podem ser deletados';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_update ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public._prevent_audit_log_update();

DROP TRIGGER IF EXISTS trg_prevent_audit_log_delete ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public._prevent_audit_log_delete();

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_clinic_id uuid,
  p_action text,
  p_table_name text,
  p_record_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.clinic_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.clinic_id = p_clinic_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized clinic';
  END IF;

  INSERT INTO public.audit_logs (
    clinic_id,
    user_id,
    action,
    table_name,
    record_id,
    new_data,
    source
  )
  VALUES (
    p_clinic_id,
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    COALESCE(p_details, '{}'::jsonb),
    'frontend'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_audit_event(uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, text, jsonb) TO authenticated;

DROP POLICY IF EXISTS "Clinic members can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_select_super_admin" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_select_clinic_admin" ON public.audit_logs;

CREATE POLICY "audit_select_clinic_admin"
  ON public.audit_logs
  FOR SELECT
  USING (
    (
      audit_logs.clinic_id IS NOT NULL
      AND user_has_any_role(auth.uid(), audit_logs.clinic_id, ARRAY['admin'])
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_super_admin = true
    )
  );
