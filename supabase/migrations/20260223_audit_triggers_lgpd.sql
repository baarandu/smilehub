-- Migration: Audit Triggers for LGPD Legal Compliance
-- Adds database-level triggers to capture ALL data mutations with Portuguese descriptions
-- Ensures no CRUD operation can bypass audit logging

SET search_path = public, extensions;

-- ============================================================
-- 1. Add new columns to audit_logs
-- ============================================================
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_data jsonb;

CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx ON public.audit_logs(table_name);

-- ============================================================
-- 2. Helper: resolve clinic_id for tables without direct clinic_id
-- ============================================================
CREATE OR REPLACE FUNCTION public._audit_resolve_clinic_id(p_table text, p_record jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id uuid;
BEGIN
  -- Direct clinic_id on the record
  IF p_record ? 'clinic_id' AND (p_record->>'clinic_id') IS NOT NULL THEN
    RETURN (p_record->>'clinic_id')::uuid;
  END IF;

  -- Via patient_id (anamneses, child_anamneses, exams, patient_consents, patient_documents)
  IF p_record ? 'patient_id' AND (p_record->>'patient_id') IS NOT NULL THEN
    SELECT clinic_id INTO v_clinic_id FROM public.patients WHERE id = (p_record->>'patient_id')::uuid;
    IF v_clinic_id IS NOT NULL THEN RETURN v_clinic_id; END IF;
  END IF;

  -- Via appointment_id (procedures)
  IF p_record ? 'appointment_id' AND (p_record->>'appointment_id') IS NOT NULL THEN
    SELECT clinic_id INTO v_clinic_id FROM public.appointments WHERE id = (p_record->>'appointment_id')::uuid;
    IF v_clinic_id IS NOT NULL THEN RETURN v_clinic_id; END IF;
  END IF;

  -- Via budget_id (budget_items)
  IF p_record ? 'budget_id' AND (p_record->>'budget_id') IS NOT NULL THEN
    SELECT clinic_id INTO v_clinic_id FROM public.budgets WHERE id = (p_record->>'budget_id')::uuid;
    IF v_clinic_id IS NOT NULL THEN RETURN v_clinic_id; END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- ============================================================
-- 3. Helper: sanitize record — remove sensitive/large fields
-- ============================================================
CREATE OR REPLACE FUNCTION public._audit_sanitize_record(p_table text, p_record jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_record IS NULL THEN RETURN NULL; END IF;

  -- Remove encrypted/sensitive fields
  p_record := p_record - 'cpf' - 'rg' - 'cpf_encrypted' - 'rg_encrypted' - 'password' - 'token';

  -- Remove large text fields per table
  IF p_table = 'patients' THEN
    p_record := p_record - 'medical_history' - 'allergies' - 'medications';
  END IF;
  IF p_table = 'consultations' THEN
    p_record := p_record - 'notes';
  END IF;

  RETURN p_record;
END;
$$;

-- ============================================================
-- 4. Helper: compute diff — returns only changed fields
-- ============================================================
CREATE OR REPLACE FUNCTION public._audit_compute_diff(p_old jsonb, p_new jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_diff jsonb := '{}'::jsonb;
  v_key text;
BEGIN
  IF p_old IS NULL OR p_new IS NULL THEN RETURN p_new; END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_new)
  LOOP
    IF v_key IN ('updated_at', 'created_at') THEN CONTINUE; END IF;
    IF NOT (p_old ? v_key) OR p_old->v_key IS DISTINCT FROM p_new->v_key THEN
      v_diff := v_diff || jsonb_build_object(v_key, p_new->v_key);
    END IF;
  END LOOP;

  RETURN v_diff;
END;
$$;

-- ============================================================
-- 5. Helper: generate description in Portuguese
-- ============================================================
CREATE OR REPLACE FUNCTION public._audit_generate_description(
  p_table text, p_op text, p_old jsonb, p_new jsonb
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_rec jsonb;
  v_name text;
  v_changed_keys text[];
  v_key text;
BEGIN
  v_rec := COALESCE(p_new, p_old);
  IF v_rec IS NULL THEN RETURN p_op || ' em ' || p_table; END IF;

  -- Build changed keys list for UPDATE
  IF p_op = 'UPDATE' AND p_old IS NOT NULL AND p_new IS NOT NULL THEN
    FOR v_key IN SELECT jsonb_object_keys(p_new)
    LOOP
      IF v_key NOT IN ('updated_at', 'created_at', 'id') AND
         (NOT (p_old ? v_key) OR p_old->v_key IS DISTINCT FROM p_new->v_key) THEN
        v_changed_keys := array_append(v_changed_keys, v_key);
      END IF;
    END LOOP;
  END IF;

  CASE p_table

    -- PATIENTS
    WHEN 'patients' THEN
      v_name := COALESCE(v_rec->>'name', 'sem nome');
      CASE p_op
        WHEN 'INSERT' THEN RETURN 'Cadastrou paciente ' || v_name;
        WHEN 'UPDATE' THEN
          IF v_changed_keys IS NOT NULL AND array_length(v_changed_keys, 1) > 0 THEN
            RETURN 'Atualizou paciente ' || v_name || ' (campos: ' || array_to_string(v_changed_keys, ', ') || ')';
          END IF;
          RETURN 'Atualizou paciente ' || v_name;
        WHEN 'DELETE' THEN RETURN 'Excluiu paciente ' || COALESCE(p_old->>'name', v_name);
        ELSE RETURN p_op || ' paciente';
      END CASE;

    -- APPOINTMENTS
    WHEN 'appointments' THEN
      CASE p_op
        WHEN 'INSERT' THEN
          RETURN 'Agendou consulta em ' ||
            COALESCE(to_char((v_rec->>'date')::date, 'DD/MM/YYYY'), '?') ||
            ' às ' || COALESCE(v_rec->>'time', '?');
        WHEN 'UPDATE' THEN
          IF p_old IS NOT NULL AND p_new IS NOT NULL AND p_old->>'status' IS DISTINCT FROM p_new->>'status' THEN
            RETURN 'Alterou status da consulta para ' || COALESCE(p_new->>'status', '?');
          END IF;
          RETURN 'Atualizou consulta em ' || COALESCE(to_char((v_rec->>'date')::date, 'DD/MM/YYYY'), '?');
        WHEN 'DELETE' THEN
          RETURN 'Excluiu consulta em ' || COALESCE(to_char((COALESCE(p_old, v_rec)->>'date')::date, 'DD/MM/YYYY'), '?');
        ELSE RETURN p_op || ' consulta';
      END CASE;

    -- ANAMNESES
    WHEN 'anamneses' THEN
      CASE p_op
        WHEN 'INSERT' THEN RETURN 'Criou anamnese do paciente';
        WHEN 'UPDATE' THEN RETURN 'Atualizou anamnese do paciente';
        WHEN 'DELETE' THEN RETURN 'Excluiu anamnese do paciente';
        ELSE RETURN p_op || ' anamnese';
      END CASE;

    -- CHILD_ANAMNESES
    WHEN 'child_anamneses' THEN
      CASE p_op
        WHEN 'INSERT' THEN RETURN 'Criou anamnese infantil do paciente';
        WHEN 'UPDATE' THEN RETURN 'Atualizou anamnese infantil do paciente';
        WHEN 'DELETE' THEN RETURN 'Excluiu anamnese infantil do paciente';
        ELSE RETURN p_op || ' anamnese infantil';
      END CASE;

    -- CONSULTATIONS
    WHEN 'consultations' THEN
      CASE p_op
        WHEN 'INSERT' THEN
          RETURN 'Registrou consulta em ' || COALESCE(to_char((v_rec->>'date')::date, 'DD/MM/YYYY'), to_char(now(), 'DD/MM/YYYY'));
        WHEN 'UPDATE' THEN
          RETURN 'Atualizou consulta em ' || COALESCE(to_char((v_rec->>'date')::date, 'DD/MM/YYYY'), '?');
        WHEN 'DELETE' THEN RETURN 'Excluiu consulta';
        ELSE RETURN p_op || ' consulta';
      END CASE;

    -- PROCEDURES
    WHEN 'procedures' THEN
      CASE p_op
        WHEN 'INSERT' THEN
          RETURN 'Adicionou procedimento: ' || COALESCE(v_rec->>'description', v_rec->>'name', '?');
        WHEN 'UPDATE' THEN
          IF p_old IS NOT NULL AND p_new IS NOT NULL AND p_old->>'status' IS DISTINCT FROM p_new->>'status' THEN
            RETURN 'Atualizou status do procedimento para ' || COALESCE(p_new->>'status', '?');
          END IF;
          RETURN 'Atualizou procedimento: ' || COALESCE(v_rec->>'description', v_rec->>'name', '?');
        WHEN 'DELETE' THEN
          RETURN 'Excluiu procedimento: ' || COALESCE(COALESCE(p_old, v_rec)->>'description', '?');
        ELSE RETURN p_op || ' procedimento';
      END CASE;

    -- BUDGETS
    WHEN 'budgets' THEN
      CASE p_op
        WHEN 'INSERT' THEN
          RETURN 'Criou orçamento R$ ' || COALESCE(v_rec->>'total_value', v_rec->>'value', '0');
        WHEN 'UPDATE' THEN
          IF p_old IS NOT NULL AND p_new IS NOT NULL AND p_old->>'status' IS DISTINCT FROM p_new->>'status' THEN
            RETURN 'Atualizou status do orçamento para ' || COALESCE(p_new->>'status', '?');
          END IF;
          RETURN 'Atualizou orçamento R$ ' || COALESCE(v_rec->>'total_value', v_rec->>'value', '0');
        WHEN 'DELETE' THEN RETURN 'Excluiu orçamento';
        ELSE RETURN p_op || ' orçamento';
      END CASE;

    -- BUDGET_ITEMS
    WHEN 'budget_items' THEN
      CASE p_op
        WHEN 'INSERT' THEN
          RETURN 'Adicionou item ao orçamento: ' || COALESCE(v_rec->>'description', v_rec->>'name', '?');
        WHEN 'UPDATE' THEN
          RETURN 'Atualizou item do orçamento: ' || COALESCE(v_rec->>'description', v_rec->>'name', '?');
        WHEN 'DELETE' THEN RETURN 'Excluiu item do orçamento';
        ELSE RETURN p_op || ' item de orçamento';
      END CASE;

    -- FINANCIAL_TRANSACTIONS
    WHEN 'financial_transactions' THEN
      v_name := CASE WHEN v_rec->>'type' = 'income' THEN 'receita' ELSE 'despesa' END;
      CASE p_op
        WHEN 'INSERT' THEN
          RETURN 'Registrou ' || v_name || ' R$ ' || COALESCE(v_rec->>'amount', '0') ||
            ' - ' || COALESCE(v_rec->>'description', '');
        WHEN 'UPDATE' THEN
          RETURN 'Atualizou ' || v_name || ' R$ ' || COALESCE(v_rec->>'amount', '0');
        WHEN 'DELETE' THEN RETURN 'Excluiu transação financeira';
        ELSE RETURN p_op || ' transação financeira';
      END CASE;

    -- PROSTHESIS_ORDERS
    WHEN 'prosthesis_orders' THEN
      CASE p_op
        WHEN 'INSERT' THEN
          RETURN 'Criou pedido de prótese: ' || COALESCE(v_rec->>'type', v_rec->>'prosthesis_type', '?');
        WHEN 'UPDATE' THEN
          IF p_old IS NOT NULL AND p_new IS NOT NULL AND p_old->>'status' IS DISTINCT FROM p_new->>'status' THEN
            RETURN 'Atualizou status da prótese para ' || COALESCE(p_new->>'status', '?');
          END IF;
          RETURN 'Atualizou pedido de prótese: ' || COALESCE(v_rec->>'type', v_rec->>'prosthesis_type', '?');
        WHEN 'DELETE' THEN RETURN 'Excluiu pedido de prótese';
        ELSE RETURN p_op || ' pedido de prótese';
      END CASE;

    -- EXAMS
    WHEN 'exams' THEN
      CASE p_op
        WHEN 'INSERT' THEN
          RETURN 'Adicionou exame: ' || COALESCE(v_rec->>'title', v_rec->>'name', '?');
        WHEN 'UPDATE' THEN
          RETURN 'Atualizou exame: ' || COALESCE(v_rec->>'title', v_rec->>'name', '?');
        WHEN 'DELETE' THEN
          RETURN 'Excluiu exame: ' || COALESCE(COALESCE(p_old, v_rec)->>'title', '?');
        ELSE RETURN p_op || ' exame';
      END CASE;

    -- PATIENT_CONSENTS
    WHEN 'patient_consents' THEN
      v_name := CASE WHEN (v_rec->>'granted')::boolean THEN 'concedeu' ELSE 'revogou' END;
      CASE p_op
        WHEN 'INSERT' THEN
          RETURN 'Paciente ' || v_name || ' consentimento: ' || COALESCE(v_rec->>'consent_type', '?');
        WHEN 'UPDATE' THEN
          RETURN 'Paciente ' || v_name || ' consentimento: ' || COALESCE(v_rec->>'consent_type', '?');
        WHEN 'DELETE' THEN RETURN 'Removeu registro de consentimento';
        ELSE RETURN p_op || ' consentimento';
      END CASE;

    -- PATIENT_DOCUMENTS
    WHEN 'patient_documents' THEN
      CASE p_op
        WHEN 'INSERT' THEN
          RETURN 'Enviou documento: ' || COALESCE(v_rec->>'name', v_rec->>'file_name', '?');
        WHEN 'UPDATE' THEN
          RETURN 'Atualizou documento: ' || COALESCE(v_rec->>'name', v_rec->>'file_name', '?');
        WHEN 'DELETE' THEN
          RETURN 'Excluiu documento: ' || COALESCE(COALESCE(p_old, v_rec)->>'name', COALESCE(p_old, v_rec)->>'file_name', '?');
        ELSE RETURN p_op || ' documento';
      END CASE;

    -- DEFAULT
    ELSE
      CASE p_op
        WHEN 'INSERT' THEN RETURN 'Criou registro em ' || p_table;
        WHEN 'UPDATE' THEN RETURN 'Atualizou registro em ' || p_table;
        WHEN 'DELETE' THEN RETURN 'Excluiu registro em ' || p_table;
        ELSE RETURN p_op || ' em ' || p_table;
      END CASE;
  END CASE;

  -- Fallback (should not reach here)
  RETURN p_op || ' em ' || p_table;
END;
$$;

-- ============================================================
-- 6. Main trigger function (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public._audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_json jsonb;
  v_new_json jsonb;
  v_old_sanitized jsonb;
  v_new_sanitized jsonb;
  v_diff jsonb;
  v_record_id uuid;
  v_clinic_id uuid;
  v_user_id uuid;
  v_description text;
  v_op text;
BEGIN
  v_op := TG_OP;

  -- Convert OLD/NEW to jsonb
  IF TG_OP = 'DELETE' THEN
    v_old_json := to_jsonb(OLD);
    v_new_json := NULL;
    v_record_id := (v_old_json->>'id')::uuid;
  ELSIF TG_OP = 'INSERT' THEN
    v_old_json := NULL;
    v_new_json := to_jsonb(NEW);
    v_record_id := (v_new_json->>'id')::uuid;
  ELSE -- UPDATE
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);
    v_record_id := (v_new_json->>'id')::uuid;

    -- Skip if nothing actually changed (identical update)
    IF v_old_json = v_new_json THEN
      RETURN COALESCE(NEW, OLD);
    END IF;

    -- Skip prosthesis_orders updates that only change position (drag & drop)
    IF TG_TABLE_NAME = 'prosthesis_orders' THEN
      DECLARE
        v_check_diff jsonb;
      BEGIN
        v_check_diff := public._audit_compute_diff(v_old_json, v_new_json);
        -- Remove position and updated_at from diff check
        v_check_diff := v_check_diff - 'position' - 'updated_at' - 'created_at';
        IF v_check_diff = '{}'::jsonb OR v_check_diff IS NULL THEN
          RETURN NEW;
        END IF;
      END;
    END IF;
  END IF;

  -- Get current user from JWT (may be NULL for service_role operations)
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Resolve clinic_id
  v_clinic_id := public._audit_resolve_clinic_id(TG_TABLE_NAME, COALESCE(v_new_json, v_old_json));

  -- Sanitize records for storage
  v_old_sanitized := public._audit_sanitize_record(TG_TABLE_NAME, v_old_json);
  v_new_sanitized := public._audit_sanitize_record(TG_TABLE_NAME, v_new_json);

  -- For UPDATE, store only the diff as new_data
  IF TG_OP = 'UPDATE' THEN
    v_diff := public._audit_compute_diff(v_old_sanitized, v_new_sanitized);
    v_new_sanitized := v_diff;
  END IF;

  -- Generate Portuguese description
  v_description := public._audit_generate_description(TG_TABLE_NAME, v_op, v_old_json, v_new_json);

  -- Insert audit log entry
  INSERT INTO public.audit_logs (
    clinic_id,
    user_id,
    action,
    table_name,
    record_id,
    new_data,
    old_data,
    description,
    source
  ) VALUES (
    v_clinic_id,
    v_user_id,
    v_op,
    TG_TABLE_NAME,
    v_record_id,
    COALESCE(v_new_sanitized, '{}'::jsonb),
    v_old_sanitized,
    v_description,
    'database_trigger'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- 7. Create triggers on all audited tables
-- ============================================================

-- Drop existing triggers first (idempotent)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'patients', 'appointments', 'anamneses', 'child_anamneses',
    'consultations', 'procedures', 'budgets', 'budget_items',
    'financial_transactions', 'prosthesis_orders', 'exams',
    'patient_consents', 'patient_documents'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger_%s ON public.%I', t, t);
  END LOOP;
END;
$$;

-- Create AFTER triggers
CREATE TRIGGER audit_trigger_patients
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_appointments
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_anamneses
  AFTER INSERT OR UPDATE OR DELETE ON public.anamneses
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_child_anamneses
  AFTER INSERT OR UPDATE OR DELETE ON public.child_anamneses
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_consultations
  AFTER INSERT OR UPDATE OR DELETE ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_procedures
  AFTER INSERT OR UPDATE OR DELETE ON public.procedures
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_budgets
  AFTER INSERT OR UPDATE OR DELETE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_budget_items
  AFTER INSERT OR UPDATE OR DELETE ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_financial_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_prosthesis_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.prosthesis_orders
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_exams
  AFTER INSERT OR UPDATE OR DELETE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_patient_consents
  AFTER INSERT OR UPDATE OR DELETE ON public.patient_consents
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

CREATE TRIGGER audit_trigger_patient_documents
  AFTER INSERT OR UPDATE OR DELETE ON public.patient_documents
  FOR EACH ROW EXECUTE FUNCTION public._audit_trigger_fn();

-- ============================================================
-- 8. Recreate RPC with new fields and filters
--    Adds: description, old_data, p_table_name filter, p_user_id filter
-- ============================================================
DROP FUNCTION IF EXISTS public.admin_get_security_audit_logs(int, int, text, text, text, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.admin_get_security_audit_logs(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_action text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_function_name text DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_table_name text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
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
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (p_table_name IS NULL OR al.table_name = p_table_name)
    AND (p_user_id IS NULL OR al.user_id = p_user_id);

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
      'old_data', al.old_data,
      'description', al.description,
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
      AND (p_table_name IS NULL OR al.table_name = p_table_name)
      AND (p_user_id IS NULL OR al.user_id = p_user_id)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) sub;

  RETURN result;
END;
$$;

-- Grant execute (RPCs enforce super_admin check internally)
GRANT EXECUTE ON FUNCTION public.admin_get_security_audit_logs(int, int, text, text, text, timestamptz, timestamptz, text, uuid) TO authenticated;

-- Also recreate metrics RPC to keep in sync
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

  SELECT count(*) INTO v_total
  FROM public.audit_logs
  WHERE created_at >= p_start_date AND created_at <= p_end_date;

  SELECT count(*) INTO v_auth_failures
  FROM public.audit_logs
  WHERE action = 'AUTH_FAILURE'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  SELECT count(*) INTO v_ai_requests
  FROM public.audit_logs
  WHERE action = 'AI_REQUEST'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  SELECT count(*) INTO v_exports
  FROM public.audit_logs
  WHERE action = 'EXPORT'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  SELECT count(*) INTO v_patient_reads
  FROM public.audit_logs
  WHERE action = 'READ' AND table_name = 'patients'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  SELECT count(*) INTO v_rate_limits
  FROM public.audit_logs
  WHERE action = 'RATE_LIMIT_EXCEEDED'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  SELECT count(*) INTO v_consent_denials
  FROM public.audit_logs
  WHERE action = 'CONSENT_DENIED'
    AND created_at >= p_start_date AND created_at <= p_end_date;

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
