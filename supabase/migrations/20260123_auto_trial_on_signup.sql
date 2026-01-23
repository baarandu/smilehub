-- Migration: Auto-create trial subscription on signup
-- Description: When a new user signs up, automatically create a clinic and
--              a 30-day trial subscription with the most complete plan.
--              This removes the requirement to enter credit card before using the platform.

-- Update the handle_new_user function
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

    -- Get the most complete (most expensive) active plan for trial
    SELECT id INTO trial_plan_id
    FROM public.subscription_plans
    WHERE is_active = true
    ORDER BY price_monthly DESC
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

-- Ensure the trigger exists (recreate to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
