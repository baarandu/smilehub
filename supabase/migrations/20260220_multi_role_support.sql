-- =============================================
-- Migration: Multi-Role Support
-- Created: 2026-02-20
-- Purpose: Allow users to have multiple roles per clinic
-- Adds roles text[] column with bidirectional sync to role column
-- =============================================

-- =============================================
-- PART 1A: Schema Changes
-- =============================================

-- Add roles array column
ALTER TABLE clinic_users ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';

-- Populate from existing single role
UPDATE clinic_users SET roles = ARRAY[role] WHERE roles = '{}';

-- Add valid roles CHECK on role column (drop old one first if exists)
DO $$
BEGIN
  -- Drop any existing check constraints on role column
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'clinic_users' AND column_name = 'role'
    AND constraint_name IN (
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'clinic_users' AND constraint_type = 'CHECK'
    )
  ) THEN
    DECLARE
      cname text;
    BEGIN
      FOR cname IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'clinic_users'
          AND tc.constraint_type = 'CHECK'
          AND ccu.column_name = 'role'
      LOOP
        EXECUTE format('ALTER TABLE clinic_users DROP CONSTRAINT IF EXISTS %I', cname);
      END LOOP;
    END;
  END IF;
END $$;

-- Add updated CHECK constraint on role
ALTER TABLE clinic_users ADD CONSTRAINT clinic_users_role_check
  CHECK (role IN ('admin', 'dentist', 'assistant', 'manager', 'editor', 'viewer'));

-- =============================================
-- PART 1B: Helper Functions
-- =============================================

-- Check if user has any of the specified roles in a clinic
CREATE OR REPLACE FUNCTION user_has_any_role(
  p_user_id uuid,
  p_clinic_id uuid,
  p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinic_users
    WHERE user_id = p_user_id
      AND clinic_id = p_clinic_id
      AND roles && p_roles
  );
$$;

-- Check if user is a member of a clinic (any role)
CREATE OR REPLACE FUNCTION user_is_clinic_member(
  p_user_id uuid,
  p_clinic_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinic_users
    WHERE user_id = p_user_id
      AND clinic_id = p_clinic_id
  );
$$;

-- GIN index for array overlap queries
CREATE INDEX IF NOT EXISTS idx_clinic_users_roles ON clinic_users USING GIN (roles);

-- =============================================
-- PART 1C: Sync Triggers
-- =============================================

-- When roles array changes, sync primary role (highest priority)
CREATE OR REPLACE FUNCTION sync_primary_role()
RETURNS TRIGGER AS $$
DECLARE
  priority_order text[] := ARRAY['admin', 'dentist', 'manager', 'editor', 'assistant', 'viewer'];
  r text;
BEGIN
  -- Only sync if roles array actually changed
  IF NEW.roles IS DISTINCT FROM OLD.roles OR TG_OP = 'INSERT' THEN
    -- Find highest priority role
    FOREACH r IN ARRAY priority_order
    LOOP
      IF r = ANY(NEW.roles) THEN
        NEW.role := r;
        RETURN NEW;
      END IF;
    END LOOP;
    -- Fallback: use first role in array
    IF array_length(NEW.roles, 1) > 0 THEN
      NEW.role := NEW.roles[1];
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_primary_role ON clinic_users;
CREATE TRIGGER trg_sync_primary_role
  BEFORE INSERT OR UPDATE OF roles ON clinic_users
  FOR EACH ROW
  EXECUTE FUNCTION sync_primary_role();

-- When single role column changes (backward compat), sync to roles array
CREATE OR REPLACE FUNCTION sync_roles_from_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if role changed but roles didn't (i.e. old code writing to role directly)
  IF NEW.role IS DISTINCT FROM OLD.role AND NEW.roles IS NOT DISTINCT FROM OLD.roles THEN
    NEW.roles := ARRAY[NEW.role];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_roles_from_role ON clinic_users;
CREATE TRIGGER trg_sync_roles_from_role
  BEFORE UPDATE OF role ON clinic_users
  FOR EACH ROW
  EXECUTE FUNCTION sync_roles_from_role();

-- =============================================
-- PART 1D: Rewrite RLS Policies to use roles array
-- =============================================

-- ---- clinic_invites ----
DROP POLICY IF EXISTS "Admins can view invites for their clinic" ON public.clinic_invites;
DROP POLICY IF EXISTS "Admins can insert invites for their clinic" ON public.clinic_invites;
DROP POLICY IF EXISTS "Admins can delete invites for their clinic" ON public.clinic_invites;

CREATE POLICY "Admins can view invites for their clinic"
  ON public.clinic_invites FOR SELECT
  USING (
    user_has_any_role(auth.uid(), clinic_invites.clinic_id, ARRAY['admin'])
  );

CREATE POLICY "Admins can insert invites for their clinic"
  ON public.clinic_invites FOR INSERT
  WITH CHECK (
    user_has_any_role(auth.uid(), clinic_invites.clinic_id, ARRAY['admin'])
  );

CREATE POLICY "Admins can delete invites for their clinic"
  ON public.clinic_invites FOR DELETE
  USING (
    user_has_any_role(auth.uid(), clinic_invites.clinic_id, ARRAY['admin'])
  );

-- ---- patients ----
DROP POLICY IF EXISTS "Users can view patients in their clinic" ON public.patients;
DROP POLICY IF EXISTS "Users can insert patients in their clinic" ON public.patients;
DROP POLICY IF EXISTS "Users can update patients in their clinic" ON public.patients;
DROP POLICY IF EXISTS "Users can delete patients in their clinic" ON public.patients;

CREATE POLICY "Users can view patients in their clinic" ON public.patients
  FOR SELECT USING (
    user_is_clinic_member(auth.uid(), patients.clinic_id)
  );

CREATE POLICY "Users can insert patients in their clinic" ON public.patients
  FOR INSERT WITH CHECK (
    user_has_any_role(auth.uid(), patients.clinic_id, ARRAY['admin', 'manager', 'dentist', 'editor'])
  );

CREATE POLICY "Users can update patients in their clinic" ON public.patients
  FOR UPDATE USING (
    user_has_any_role(auth.uid(), patients.clinic_id, ARRAY['admin', 'manager', 'dentist', 'editor'])
  );

CREATE POLICY "Users can delete patients in their clinic" ON public.patients
  FOR DELETE USING (
    user_has_any_role(auth.uid(), patients.clinic_id, ARRAY['admin', 'manager', 'dentist'])
  );

-- ---- appointments ----
DROP POLICY IF EXISTS "Users can view appointments in their clinic" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert appointments in their clinic" ON public.appointments;
DROP POLICY IF EXISTS "Users can update appointments in their clinic" ON public.appointments;
DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;

CREATE POLICY "Users can view appointments in their clinic" ON public.appointments
  FOR SELECT USING (
    user_is_clinic_member(auth.uid(), appointments.clinic_id)
  );

CREATE POLICY "Users can insert appointments in their clinic" ON public.appointments
  FOR INSERT WITH CHECK (
    user_has_any_role(auth.uid(), appointments.clinic_id, ARRAY['admin', 'manager', 'dentist', 'editor'])
  );

CREATE POLICY "Users can update appointments in their clinic" ON public.appointments
  FOR UPDATE USING (
    user_has_any_role(auth.uid(), appointments.clinic_id, ARRAY['admin', 'manager', 'dentist', 'editor'])
  );

CREATE POLICY "Admins can delete appointments" ON public.appointments
  FOR DELETE USING (
    user_has_any_role(auth.uid(), appointments.clinic_id, ARRAY['admin', 'manager'])
  );

-- ---- audit_logs (replace Phase 6 policies) ----
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

CREATE POLICY "audit_logs_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND clinic_id IS NOT NULL
    AND user_is_clinic_member(auth.uid(), clinic_id)
  );

CREATE POLICY "audit_logs_select"
  ON public.audit_logs FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND clinic_id IS NOT NULL
    AND user_has_any_role(auth.uid(), clinic_id, ARRAY['admin'])
  );

-- ---- patient_consents ----
DROP POLICY IF EXISTS "Users can view consents for their clinic" ON patient_consents;
DROP POLICY IF EXISTS "Dentists and admins can manage consents" ON patient_consents;

CREATE POLICY "Users can view consents for their clinic"
  ON patient_consents FOR SELECT
  USING (
    user_is_clinic_member(auth.uid(), patient_consents.clinic_id)
  );

CREATE POLICY "Dentists and admins can manage consents"
  ON patient_consents FOR ALL
  USING (
    user_has_any_role(auth.uid(), patient_consents.clinic_id, ARRAY['admin', 'dentist'])
  );

-- ---- data_retention_config ----
DROP POLICY IF EXISTS "Admins can manage retention config" ON data_retention_config;

CREATE POLICY "Admins can manage retention config"
  ON data_retention_config FOR ALL
  USING (
    clinic_id IS NULL
    OR user_has_any_role(auth.uid(), data_retention_config.clinic_id, ARRAY['admin'])
  );

-- ---- dentist_agent_conversations ----
DROP POLICY IF EXISTS "Dentists can view their clinic's conversations" ON dentist_agent_conversations;
DROP POLICY IF EXISTS "Dentists can create conversations for their clinic" ON dentist_agent_conversations;
DROP POLICY IF EXISTS "Dentists can update their clinic's conversations" ON dentist_agent_conversations;
DROP POLICY IF EXISTS "Dentists can delete their clinic's conversations" ON dentist_agent_conversations;

CREATE POLICY "Dentists can view their clinic's conversations"
  ON dentist_agent_conversations FOR SELECT
  USING (
    user_has_any_role(auth.uid(), clinic_id, ARRAY['admin', 'dentist'])
  );

CREATE POLICY "Dentists can create conversations for their clinic"
  ON dentist_agent_conversations FOR INSERT
  WITH CHECK (
    user_has_any_role(auth.uid(), clinic_id, ARRAY['admin', 'dentist'])
    AND user_id = auth.uid()
  );

CREATE POLICY "Dentists can update their clinic's conversations"
  ON dentist_agent_conversations FOR UPDATE
  USING (
    user_has_any_role(auth.uid(), clinic_id, ARRAY['admin', 'dentist'])
  );

CREATE POLICY "Dentists can delete their clinic's conversations"
  ON dentist_agent_conversations FOR DELETE
  USING (
    user_has_any_role(auth.uid(), clinic_id, ARRAY['admin', 'dentist'])
  );

-- ---- dentist_agent_messages ----
DROP POLICY IF EXISTS "Dentists can view messages from their clinic's conversations" ON dentist_agent_messages;
DROP POLICY IF EXISTS "Dentists can create messages in their clinic's conversations" ON dentist_agent_messages;

CREATE POLICY "Dentists can view messages from their clinic's conversations"
  ON dentist_agent_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM dentist_agent_conversations
      WHERE user_has_any_role(auth.uid(), clinic_id, ARRAY['admin', 'dentist'])
    )
  );

CREATE POLICY "Dentists can create messages in their clinic's conversations"
  ON dentist_agent_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM dentist_agent_conversations
      WHERE user_has_any_role(auth.uid(), clinic_id, ARRAY['admin', 'dentist'])
    )
  );

-- ---- digital_signatures ----
DROP POLICY IF EXISTS "digital_signatures_select" ON digital_signatures;
DROP POLICY IF EXISTS "digital_signatures_insert" ON digital_signatures;
DROP POLICY IF EXISTS "digital_signatures_update" ON digital_signatures;

CREATE POLICY "digital_signatures_select" ON digital_signatures
  FOR SELECT USING (
    user_is_clinic_member(auth.uid(), clinic_id)
  );

CREATE POLICY "digital_signatures_insert" ON digital_signatures
  FOR INSERT WITH CHECK (
    user_has_any_role(auth.uid(), clinic_id, ARRAY['admin', 'dentist'])
  );

CREATE POLICY "digital_signatures_update" ON digital_signatures
  FOR UPDATE USING (
    user_has_any_role(auth.uid(), clinic_id, ARRAY['admin', 'dentist'])
  );

-- =============================================
-- PART 1E: Update Stored Procedures
-- =============================================

-- invite_or_add_user: check admin via roles array, insert with roles
CREATE OR REPLACE FUNCTION public.invite_or_add_user(
    p_clinic_id uuid,
    p_email text,
    p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_already_member boolean;
BEGIN
    -- 1. Check if current user is admin of this clinic (via roles array)
    IF NOT EXISTS (
        SELECT 1 FROM clinic_users
        WHERE clinic_id = p_clinic_id
        AND user_id = auth.uid()
        AND 'admin' = ANY(roles)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você não tem permissão para convidar usuários');
    END IF;

    -- 2. Check if user already exists in auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(p_email);

    IF v_user_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM clinic_users
            WHERE clinic_id = p_clinic_id AND user_id = v_user_id
        ) INTO v_already_member;

        IF v_already_member THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este usuário já faz parte da clínica');
        END IF;

        -- Add user directly with roles array
        INSERT INTO clinic_users (user_id, clinic_id, role, roles)
        VALUES (v_user_id, p_clinic_id, p_role, ARRAY[p_role]);

        RETURN jsonb_build_object(
            'success', true,
            'action', 'added_directly',
            'message', 'Usuário adicionado à clínica com sucesso!'
        );
    ELSE
        -- User doesn't exist, create pending invite
        IF EXISTS (
            SELECT 1 FROM clinic_invites
            WHERE clinic_id = p_clinic_id
            AND LOWER(email) = LOWER(p_email)
            AND status = 'pending'
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Já existe um convite pendente para este email');
        END IF;

        INSERT INTO clinic_invites (clinic_id, email, role, status)
        VALUES (p_clinic_id, LOWER(p_email), p_role, 'pending');

        RETURN jsonb_build_object(
            'success', true,
            'action', 'invite_created',
            'message', 'Convite enviado! O usuário será adicionado quando criar uma conta.'
        );
    END IF;
END;
$$;

-- handle_new_user: insert with roles array
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
    -- User was invited: Add to existing clinic with roles array
    INSERT INTO public.clinic_users (user_id, clinic_id, role, roles)
    VALUES (new.id, invite_record.clinic_id, invite_record.role, ARRAY[invite_record.role]);

    UPDATE public.clinic_invites SET status = 'accepted' WHERE id = invite_record.id;

  ELSE
    -- New user: Create new clinic + trial subscription
    clinic_display_name := COALESCE(
      NULLIF(TRIM(new.raw_user_meta_data->>'clinic_name'), ''),
      new.raw_user_meta_data->>'full_name',
      'Meu Consultório'
    );

    INSERT INTO public.clinics (name)
    VALUES (clinic_display_name)
    RETURNING id INTO new_clinic_id;

    -- Add user as admin with roles array
    INSERT INTO public.clinic_users (user_id, clinic_id, role, roles)
    VALUES (new.id, new_clinic_id, 'admin', ARRAY['admin']);

    -- Get the cheapest active plan for trial
    SELECT id INTO trial_plan_id
    FROM public.subscription_plans
    WHERE is_active = true
    ORDER BY price_monthly ASC
    LIMIT 1;

    IF trial_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (
        clinic_id, plan_id, status,
        current_period_start, current_period_end,
        cancel_at_period_end
      ) VALUES (
        new_clinic_id, trial_plan_id, 'trialing',
        NOW(), NOW() + INTERVAL '30 days', false
      );
    END IF;

  END IF;

  RETURN new;
END;
$$;

-- New: update_user_roles RPC for frontend to call
CREATE OR REPLACE FUNCTION public.update_user_roles(
  p_clinic_user_id uuid,
  p_roles text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id uuid;
  v_target_user_id uuid;
  valid_roles text[] := ARRAY['admin', 'dentist', 'assistant', 'manager', 'editor', 'viewer'];
  r text;
  admin_count int;
BEGIN
  -- Validate roles
  IF p_roles IS NULL OR array_length(p_roles, 1) IS NULL OR array_length(p_roles, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pelo menos um cargo deve ser selecionado');
  END IF;

  FOREACH r IN ARRAY p_roles
  LOOP
    IF NOT (r = ANY(valid_roles)) THEN
      RETURN jsonb_build_object('success', false, 'error', format('Cargo inválido: %s', r));
    END IF;
  END LOOP;

  -- Get target clinic_user info
  SELECT clinic_id, user_id INTO v_clinic_id, v_target_user_id
  FROM clinic_users WHERE id = p_clinic_user_id;

  IF v_clinic_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Membro não encontrado');
  END IF;

  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM clinic_users
    WHERE clinic_id = v_clinic_id
      AND user_id = auth.uid()
      AND 'admin' = ANY(roles)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  -- If removing admin from target, ensure at least one other admin remains
  IF NOT ('admin' = ANY(p_roles)) THEN
    SELECT count(*) INTO admin_count
    FROM clinic_users
    WHERE clinic_id = v_clinic_id
      AND 'admin' = ANY(roles)
      AND id != p_clinic_user_id;

    IF admin_count = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'A clínica deve ter pelo menos um administrador');
    END IF;
  END IF;

  -- Update roles (trigger will sync primary role)
  UPDATE clinic_users
  SET roles = p_roles
  WHERE id = p_clinic_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Cargos atualizados com sucesso');
END;
$$;
