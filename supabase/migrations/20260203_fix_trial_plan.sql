-- Migration: Fix trial plan selection
-- Description: New users should start on the cheapest plan (Teste), not the most expensive

-- Update the handle_new_user function to use cheapest plan for trial
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
    -- User was invited: Add to existing clinic (no trial needed, clinic already has subscription)
    INSERT INTO public.clinic_users (user_id, clinic_id, role)
    VALUES (new.id, invite_record.clinic_id, invite_record.role);

    UPDATE public.clinic_invites SET status = 'accepted' WHERE id = invite_record.id;

  ELSE
    -- New user (solo or clinic): Create new clinic + trial subscription

    -- Determine clinic name based on account type
    IF new.raw_user_meta_data->>'account_type' = 'clinic' THEN
      clinic_display_name := COALESCE(new.raw_user_meta_data->>'clinic_name', 'Minha Clínica');
    ELSE
      -- Solo dentist: use their name as clinic name
      clinic_display_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Meu Consultório');
    END IF;

    -- Create clinic
    INSERT INTO public.clinics (name)
    VALUES (clinic_display_name)
    RETURNING id INTO new_clinic_id;

    -- Add user as admin of the new clinic
    INSERT INTO public.clinic_users (user_id, clinic_id, role)
    VALUES (new.id, new_clinic_id, 'admin');

    -- Get the cheapest active plan for trial (Teste plan)
    SELECT id INTO trial_plan_id
    FROM public.subscription_plans
    WHERE is_active = true
    ORDER BY price_monthly ASC
    LIMIT 1;

    -- Create trial subscription (30 days) if a plan exists
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
