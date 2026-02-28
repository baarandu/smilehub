-- =============================================================
-- P0 Security Critical Fixes
-- Created: 2026-02-28
-- Fixes: P0.1 (get_profiles_for_users), P0.2 (handle_new_user roles),
--        P0.3 (soft_delete_patient), P0.5 (exams bucket), P0.6 (RLS)
-- =============================================================

-- =============================================================
-- P0.1: REGRESSION — get_profiles_for_users without clinic restriction
-- The 20260215 migration recreated this without the shared-clinic check.
-- Fix: Only return profiles of users who share a clinic with the caller.
-- =============================================================

DROP FUNCTION IF EXISTS get_profiles_for_users(uuid[]);
CREATE FUNCTION get_profiles_for_users(user_ids uuid[])
RETURNS TABLE (id uuid, email text, full_name text, cro text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_clinic_ids uuid[];
BEGIN
  -- Get all clinics the caller belongs to
  SELECT ARRAY_AGG(cu.clinic_id)
  INTO caller_clinic_ids
  FROM clinic_users cu
  WHERE cu.user_id = auth.uid();

  -- Only return profiles of users who share at least one clinic
  RETURN QUERY
  SELECT DISTINCT u.id, u.email::text, p.full_name, p.cro
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  INNER JOIN clinic_users cu ON cu.user_id = u.id
  WHERE u.id = ANY(user_ids)
    AND cu.clinic_id = ANY(caller_clinic_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION get_profiles_for_users(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profiles_for_users(uuid[]) TO service_role;


-- =============================================================
-- P0.2: REGRESSION — handle_new_user doesn't populate roles array
-- The 20260223 consolidation migration recreated handle_new_user
-- without setting the roles column. New users get roles = '{}' (empty).
-- Fix: Include roles = ARRAY[role_value] in both INSERT paths.
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_clinic_id uuid;
  invite_record record;
  trial_plan_id uuid;
  clinic_display_name text;
  role_val text;
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, gender)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'gender'
  );

  -- 2. Check for Pending Invites
  SELECT * INTO invite_record
  FROM public.clinic_invites
  WHERE email = new.email AND status = 'pending'
  LIMIT 1;

  IF invite_record IS NOT NULL THEN
    role_val := COALESCE(invite_record.role, 'viewer');
    INSERT INTO public.clinic_users (user_id, clinic_id, role, roles)
    VALUES (new.id, invite_record.clinic_id, role_val, ARRAY[role_val]);

    UPDATE public.clinic_invites SET status = 'accepted' WHERE id = invite_record.id;

  ELSE
    IF new.raw_user_meta_data->>'account_type' = 'clinic' THEN
      clinic_display_name := COALESCE(new.raw_user_meta_data->>'clinic_name', 'Minha Clínica');
    ELSE
      clinic_display_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Meu Consultório');
    END IF;

    INSERT INTO public.clinics (name)
    VALUES (clinic_display_name)
    RETURNING id INTO new_clinic_id;

    INSERT INTO public.clinic_users (user_id, clinic_id, role, roles)
    VALUES (new.id, new_clinic_id, 'admin', ARRAY['admin']);

    -- Get the Profissional plan specifically for trial (slug = 'profissional_v2')
    SELECT id INTO trial_plan_id
    FROM public.subscription_plans
    WHERE slug = 'profissional_v2' AND is_active = true
    LIMIT 1;

    -- Fallback: get most expensive active plan
    IF trial_plan_id IS NULL THEN
      SELECT id INTO trial_plan_id
      FROM public.subscription_plans
      WHERE is_active = true
      ORDER BY price_monthly DESC
      LIMIT 1;
    END IF;

    IF trial_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (
        clinic_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end
      ) VALUES (
        new_clinic_id,
        trial_plan_id,
        'trialing',
        NOW(),
        NOW() + INTERVAL '30 days',
        false
      );
    END IF;

  END IF;

  RETURN new;
END;
$$;


-- =============================================================
-- P0.3: soft_delete_patient without clinic verification
-- SECURITY DEFINER function bypasses RLS. Any authenticated user
-- can soft-delete patients from any clinic.
-- Fix: Verify caller is a member of the patient's clinic.
-- =============================================================

CREATE OR REPLACE FUNCTION soft_delete_patient(p_patient_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retention_locked_until timestamptz;
  v_clinic_id uuid;
BEGIN
  -- Get patient's clinic_id and retention lock
  SELECT clinic_id, retention_locked_until
  INTO v_clinic_id, v_retention_locked_until
  FROM patients WHERE id = p_patient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paciente não encontrado.';
  END IF;

  -- Verify caller belongs to the patient's clinic
  IF NOT EXISTS (
    SELECT 1 FROM clinic_users
    WHERE user_id = auth.uid()
      AND clinic_id = v_clinic_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não pertence à clínica deste paciente.';
  END IF;

  -- Verify caller has admin or dentist role
  IF NOT EXISTS (
    SELECT 1 FROM clinic_users
    WHERE user_id = auth.uid()
      AND clinic_id = v_clinic_id
      AND roles && ARRAY['admin', 'dentist']
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores e dentistas podem excluir pacientes.';
  END IF;

  -- Mark patient as soft-deleted
  UPDATE patients
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE id = p_patient_id AND deleted_at IS NULL;

  -- Soft-delete all clinical records
  UPDATE anamneses
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE patient_id = p_patient_id AND deleted_at IS NULL;

  UPDATE child_anamneses
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE patient_id = p_patient_id AND deleted_at IS NULL;

  UPDATE exams
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE patient_id = p_patient_id AND deleted_at IS NULL;

  UPDATE procedures
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE patient_id = p_patient_id AND deleted_at IS NULL;

  UPDATE consultations
  SET deleted_at = NOW(), deleted_by = p_user_id
  WHERE patient_id = p_patient_id AND deleted_at IS NULL;
END;
$$;


-- =============================================================
-- P0.5: exams storage bucket is public
-- Clinical images (X-rays, photos) accessible without auth.
-- Fix: Set bucket to private. RLS policies already enforce
-- tenant isolation via clinic_id folder structure.
-- =============================================================

UPDATE storage.buckets SET public = false WHERE id = 'exams';


-- =============================================================
-- P0.6: Enable RLS on core tables missing it
-- Many critical tables have no RLS enabled.
-- Using ENABLE ROW LEVEL SECURITY (idempotent if already on).
-- =============================================================

-- ---- financial_transactions ----
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ft_select" ON financial_transactions;
CREATE POLICY "ft_select" ON financial_transactions FOR SELECT
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ft_insert" ON financial_transactions;
CREATE POLICY "ft_insert" ON financial_transactions FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ft_update" ON financial_transactions;
CREATE POLICY "ft_update" ON financial_transactions FOR UPDATE
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ft_delete" ON financial_transactions;
CREATE POLICY "ft_delete" ON financial_transactions FOR DELETE
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );


-- ---- budgets ----
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budgets_select" ON budgets;
CREATE POLICY "budgets_select" ON budgets FOR SELECT
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "budgets_insert" ON budgets;
CREATE POLICY "budgets_insert" ON budgets FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "budgets_update" ON budgets;
CREATE POLICY "budgets_update" ON budgets FOR UPDATE
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "budgets_delete" ON budgets;
CREATE POLICY "budgets_delete" ON budgets FOR DELETE
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );


-- ---- budget_items (via budgets) ----
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bi_select" ON budget_items;
CREATE POLICY "bi_select" ON budget_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      JOIN clinic_users cu ON cu.clinic_id = b.clinic_id
      WHERE b.id = budget_items.budget_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bi_insert" ON budget_items;
CREATE POLICY "bi_insert" ON budget_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets b
      JOIN clinic_users cu ON cu.clinic_id = b.clinic_id
      WHERE b.id = budget_items.budget_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bi_update" ON budget_items;
CREATE POLICY "bi_update" ON budget_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      JOIN clinic_users cu ON cu.clinic_id = b.clinic_id
      WHERE b.id = budget_items.budget_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bi_delete" ON budget_items;
CREATE POLICY "bi_delete" ON budget_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      JOIN clinic_users cu ON cu.clinic_id = b.clinic_id
      WHERE b.id = budget_items.budget_id
        AND cu.user_id = auth.uid()
    )
  );


-- ---- consultations (via patients) ----
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consult_select" ON consultations;
CREATE POLICY "consult_select" ON consultations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = consultations.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "consult_insert" ON consultations;
CREATE POLICY "consult_insert" ON consultations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = consultations.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "consult_update" ON consultations;
CREATE POLICY "consult_update" ON consultations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = consultations.patient_id
        AND cu.user_id = auth.uid()
    )
  );


-- ---- exams ----
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exams_select" ON exams;
CREATE POLICY "exams_select" ON exams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = exams.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "exams_insert" ON exams;
CREATE POLICY "exams_insert" ON exams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = exams.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "exams_update" ON exams;
CREATE POLICY "exams_update" ON exams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = exams.patient_id
        AND cu.user_id = auth.uid()
    )
  );


-- ---- anamneses ----
ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anam_select" ON anamneses;
CREATE POLICY "anam_select" ON anamneses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = anamneses.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "anam_insert" ON anamneses;
CREATE POLICY "anam_insert" ON anamneses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = anamneses.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "anam_update" ON anamneses;
CREATE POLICY "anam_update" ON anamneses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = anamneses.patient_id
        AND cu.user_id = auth.uid()
    )
  );


-- ---- procedures ----
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proc_select" ON procedures;
CREATE POLICY "proc_select" ON procedures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = procedures.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "proc_insert" ON procedures;
CREATE POLICY "proc_insert" ON procedures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = procedures.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "proc_update" ON procedures;
CREATE POLICY "proc_update" ON procedures FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = procedures.patient_id
        AND cu.user_id = auth.uid()
    )
  );


-- ---- patient_documents ----
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pd_select" ON patient_documents;
CREATE POLICY "pd_select" ON patient_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = patient_documents.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pd_insert" ON patient_documents;
CREATE POLICY "pd_insert" ON patient_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = patient_documents.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pd_update" ON patient_documents;
CREATE POLICY "pd_update" ON patient_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = patient_documents.patient_id
        AND cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pd_delete" ON patient_documents;
CREATE POLICY "pd_delete" ON patient_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN clinic_users cu ON cu.clinic_id = p.clinic_id
      WHERE p.id = patient_documents.patient_id
        AND cu.user_id = auth.uid()
    )
  );


-- ---- locations ----
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loc_select" ON locations;
CREATE POLICY "loc_select" ON locations FOR SELECT
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "loc_insert" ON locations;
CREATE POLICY "loc_insert" ON locations FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "loc_update" ON locations;
CREATE POLICY "loc_update" ON locations FOR UPDATE
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "loc_delete" ON locations;
CREATE POLICY "loc_delete" ON locations FOR DELETE
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.roles && ARRAY['admin']
    )
  );


-- ---- clinic_settings (per-user) ----
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cs_select" ON clinic_settings;
CREATE POLICY "cs_select" ON clinic_settings FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "cs_insert" ON clinic_settings;
CREATE POLICY "cs_insert" ON clinic_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cs_update" ON clinic_settings;
CREATE POLICY "cs_update" ON clinic_settings FOR UPDATE
  USING (user_id = auth.uid());


-- ---- financial_settings (per-user) ----
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fs_select" ON financial_settings;
CREATE POLICY "fs_select" ON financial_settings FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "fs_insert" ON financial_settings;
CREATE POLICY "fs_insert" ON financial_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "fs_update" ON financial_settings;
CREATE POLICY "fs_update" ON financial_settings FOR UPDATE
  USING (user_id = auth.uid());


-- ---- shopping_orders ----
ALTER TABLE shopping_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "so_select" ON shopping_orders;
CREATE POLICY "so_select" ON shopping_orders FOR SELECT
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "so_insert" ON shopping_orders;
CREATE POLICY "so_insert" ON shopping_orders FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "so_update" ON shopping_orders;
CREATE POLICY "so_update" ON shopping_orders FOR UPDATE
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "so_delete" ON shopping_orders;
CREATE POLICY "so_delete" ON shopping_orders FOR DELETE
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );


-- ---- clinics ----
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinics_select" ON clinics;
CREATE POLICY "clinics_select" ON clinics FOR SELECT
  USING (
    id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "clinics_update" ON clinics;
CREATE POLICY "clinics_update" ON clinics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users cu
      WHERE cu.clinic_id = clinics.id
        AND cu.user_id = auth.uid()
        AND cu.roles && ARRAY['admin']
    )
  );

-- INSERT needed by handle_new_user (SECURITY DEFINER), no direct user insert
-- Service role bypasses RLS, so no explicit insert policy needed


-- ---- clinic_users ----
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cu_select" ON clinic_users;
CREATE POLICY "cu_select" ON clinic_users FOR SELECT
  USING (
    clinic_id IN (
      SELECT cu2.clinic_id FROM clinic_users cu2 WHERE cu2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "cu_insert" ON clinic_users;
CREATE POLICY "cu_insert" ON clinic_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_users cu2
      WHERE cu2.clinic_id = clinic_users.clinic_id
        AND cu2.user_id = auth.uid()
        AND cu2.roles && ARRAY['admin']
    )
  );

DROP POLICY IF EXISTS "cu_update" ON clinic_users;
CREATE POLICY "cu_update" ON clinic_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users cu2
      WHERE cu2.clinic_id = clinic_users.clinic_id
        AND cu2.user_id = auth.uid()
        AND cu2.roles && ARRAY['admin']
    )
  );

DROP POLICY IF EXISTS "cu_delete" ON clinic_users;
CREATE POLICY "cu_delete" ON clinic_users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users cu2
      WHERE cu2.clinic_id = clinic_users.clinic_id
        AND cu2.user_id = auth.uid()
        AND cu2.roles && ARRAY['admin']
    )
  );


-- ---- profiles ----
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can always read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (id = auth.uid());

-- Users can read profiles of people in the same clinic
DROP POLICY IF EXISTS "profiles_select_clinic" ON profiles;
CREATE POLICY "profiles_select_clinic" ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users cu1
      JOIN clinic_users cu2 ON cu2.clinic_id = cu1.clinic_id
      WHERE cu1.user_id = auth.uid()
        AND cu2.user_id = profiles.id
    )
  );

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- INSERT handled by handle_new_user (SECURITY DEFINER)


-- ---- subscriptions ----
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sub_select" ON subscriptions;
CREATE POLICY "sub_select" ON subscriptions FOR SELECT
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sub_update" ON subscriptions;
CREATE POLICY "sub_update" ON subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users cu
      WHERE cu.clinic_id = subscriptions.clinic_id
        AND cu.user_id = auth.uid()
        AND cu.roles && ARRAY['admin']
    )
  );

-- INSERT/DELETE handled by service role (Stripe webhooks, handle_new_user)


-- ---- fiscal_documents ----
ALTER TABLE fiscal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fd_select" ON fiscal_documents;
CREATE POLICY "fd_select" ON fiscal_documents FOR SELECT
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fd_insert" ON fiscal_documents;
CREATE POLICY "fd_insert" ON fiscal_documents FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fd_update" ON fiscal_documents;
CREATE POLICY "fd_update" ON fiscal_documents FOR UPDATE
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "fd_delete" ON fiscal_documents;
CREATE POLICY "fd_delete" ON fiscal_documents FOR DELETE
  USING (
    clinic_id IN (
      SELECT cu.clinic_id FROM clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );


-- =============================================================
-- Grant service_role bypass (service role already bypasses RLS by default)
-- No additional grants needed — Supabase service_role ignores RLS.
-- =============================================================
