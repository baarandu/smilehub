-- Fix: new users created via signup get only ARRAY['admin'] without 'dentist'.
-- The clinic owner is almost always a dentist — include 'dentist' by default.

-- 1. Update handle_new_user to include 'dentist' for new signups
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

    -- Create trial subscription (7 days)
    IF trial_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (
        clinic_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end
      ) VALUES (
        new_clinic_id,
        trial_plan_id,
        'trialing',
        now(),
        now() + interval '7 days',
        now(),
        now() + interval '7 days'
      );
    END IF;
  END IF;

  RETURN new;
END;
$$;

-- 2. Fix existing admin users who don't have 'dentist' in their roles array
-- Only adds 'dentist' to users who are the sole admin of their clinic (clinic owners)
UPDATE clinic_users
SET roles = array_append(roles, 'dentist')
WHERE role = 'admin'
  AND NOT ('dentist' = ANY(roles));
