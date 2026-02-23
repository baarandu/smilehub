-- Audit Logs Immutability
-- Prevents UPDATE and DELETE on audit_logs table via database triggers.
-- This ensures audit trail integrity even for service_role or direct SQL access.

-- 1. Trigger that prevents UPDATE on audit_logs
CREATE OR REPLACE FUNCTION public._prevent_audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs são imutáveis e não podem ser alterados';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_log_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public._prevent_audit_log_update();

-- 2. Trigger that prevents DELETE on audit_logs
CREATE OR REPLACE FUNCTION public._prevent_audit_log_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs são imutáveis e não podem ser deletados';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_log_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public._prevent_audit_log_delete();
