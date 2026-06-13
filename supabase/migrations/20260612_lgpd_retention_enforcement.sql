-- Enforce LGPD data retention on patients after pentest finding #3 (Lote 6).
--
-- Background: patients.retention_locked_until holds the legal retention deadline
-- (default NOW() + 20 years). anonymize_patient_data() already refuses to run
-- while the lock is active. Two bypasses remained:
--   1. retention_locked_until was a normal column: any user allowed to UPDATE a
--      patient could move it to the past and then anonymize/erase the record.
--   2. A direct hard DELETE on the table was not blocked while the lock was
--      active, destroying data that must legally be kept.
--
-- Both are closed here with BEFORE triggers, which fire regardless of RLS or
-- SECURITY DEFINER, so they cover direct PostgREST calls and the RPCs alike.
-- A privileged escape hatch is provided via the session GUC
-- app.bypass_retention_lock = 'on', which only a SECURITY DEFINER function or a
-- DBA can set, for legitimate court-ordered changes.

-- =============================================================
-- 1. retention_locked_until is immutable once set
-- =============================================================

CREATE OR REPLACE FUNCTION public._prevent_retention_unlock()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow setting a value where none existed (backfill / first write).
  IF OLD.retention_locked_until IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow privileged callers (DBA / dedicated SECURITY DEFINER RPC) to change it.
  IF current_setting('app.bypass_retention_lock', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.retention_locked_until IS DISTINCT FROM OLD.retention_locked_until THEN
    RAISE EXCEPTION 'retention_locked_until e protegido e nao pode ser alterado (retencao legal LGPD)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_retention_unlock ON public.patients;
CREATE TRIGGER trg_prevent_retention_unlock
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public._prevent_retention_unlock();

-- =============================================================
-- 2. Block hard DELETE while retention is active
-- =============================================================

CREATE OR REPLACE FUNCTION public._prevent_retention_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Privileged escape hatch (court order / post-retention purge job).
  IF current_setting('app.bypass_retention_lock', true) = 'on' THEN
    RETURN OLD;
  END IF;

  IF OLD.retention_locked_until IS NOT NULL AND OLD.retention_locked_until > now() THEN
    RAISE EXCEPTION 'Dados protegidos por retencao legal ate %. Exclusao definitiva bloqueada.',
      OLD.retention_locked_until::date;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_retention_delete ON public.patients;
CREATE TRIGGER trg_prevent_retention_delete
  BEFORE DELETE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public._prevent_retention_delete();
