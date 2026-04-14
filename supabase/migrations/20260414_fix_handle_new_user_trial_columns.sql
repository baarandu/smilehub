-- =====================================================================
-- Fix: handle_new_user() references non-existent columns
-- =====================================================================
-- Migration 20260401_fix_admin_dentist_role.sql set handle_new_user to
-- INSERT into subscriptions with `trial_start` and `trial_end` columns,
-- but those columns were never added to the subscriptions table.
-- Every new signup has been failing with:
--   "column \"trial_start\" of relation \"subscriptions\" does not exist"
--
-- Fix: drop the non-existent column references. `current_period_start`
-- and `current_period_end` already describe the trial window while
-- `status = 'trialing'`, which matches Stripe's model.
-- =====================================================================

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

    -- Admin + Dentist by default (clinic owner is usually the dentist)
    INSERT INTO public.clinic_users (user_id, clinic_id, role, roles)
    VALUES (new.id, new_clinic_id, 'admin', ARRAY['admin', 'dentist']);

    -- Get the Profissional plan specifically for trial
    SELECT id INTO trial_plan_id
    FROM public.subscription_plans
    WHERE slug = 'profissional_v2' AND is_active = true
    LIMIT 1;

    -- Fallback: most expensive active plan
    IF trial_plan_id IS NULL THEN
      SELECT id INTO trial_plan_id
      FROM public.subscription_plans
      WHERE is_active = true
      ORDER BY price_monthly DESC
      LIMIT 1;
    END IF;

    -- Create trial subscription (7 days). Uses current_period_* to describe
    -- the trial window — trial_start/trial_end columns don't exist on this table.
    IF trial_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (
        clinic_id, plan_id, status, current_period_start, current_period_end
      ) VALUES (
        new_clinic_id,
        trial_plan_id,
        'trialing',
        now(),
        now() + interval '7 days'
      );
    END IF;
  END IF;

  RETURN new;
END;
$$;
