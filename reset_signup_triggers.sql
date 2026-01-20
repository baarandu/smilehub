-- =====================================================
-- RESET: Signup Trigger & Permissions
-- Execute this to reset the user creation logic logic
-- =====================================================

-- 1. CLEANUP: Drop existing triggers and functions to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. PERMISSIONS: Ensure the auth role can access public tables
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Specifically grant usage to authenticated/anon (RLS will handle row access, but table access is needed)
GRANT INSERT, UPDATE, SELECT ON public.profiles TO authenticated, anon, service_role;
GRANT INSERT, UPDATE, SELECT ON public.clinics TO authenticated, anon, service_role;
GRANT INSERT, UPDATE, SELECT ON public.clinic_users TO authenticated, anon, service_role;

-- 3. FUNCTION: Recreate the handle_new_user function
-- We use 'SECURITY DEFINER' to run as owner (superuser)
-- We set 'search_path' to public to avoid any confusion with extensions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_clinic_id uuid;
  clinic_name_val text;
  full_name_val text;
  meta_gender text;
  meta_account_type text;
BEGIN
  -- Extract Meta Data with defaults
  full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');
  meta_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'solo');
  meta_gender := NEW.raw_user_meta_data->>'gender';
  
  -- Determine Clinic Name
  IF meta_account_type = 'clinic' THEN
      clinic_name_val := COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'Minha Clínica');
  ELSE
      IF meta_gender = 'female' THEN
          clinic_name_val := 'Dra. ' || full_name_val;
      ELSE
          clinic_name_val := 'Dr. ' || full_name_val;
      END IF;
  END IF;

  -- 1. Create Clinic
  INSERT INTO public.clinics (name)
  VALUES (clinic_name_val)
  RETURNING id INTO new_clinic_id;

  -- 2. Create User-Clinic Link (Admin)
  INSERT INTO public.clinic_users (clinic_id, user_id, role)
  VALUES (new_clinic_id, NEW.id, 'admin');

  -- 3. Create Profile
  INSERT INTO public.profiles (id, full_name, is_super_admin, gender)
  VALUES (NEW.id, full_name_val, false, meta_gender)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    gender = COALESCE(EXCLUDED.gender, public.profiles.gender);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error for debugging (visible in Supabase logs)
  RAISE WARNING 'handle_new_user Error: %', SQLERRM;
  -- Fails the transaction so the user sees the error
  RAISE EXCEPTION 'Erro ao configurar conta: %', SQLERRM;
END;
$$;

-- 4. TRIGGER: Bind the function to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT 'Signup triggers reset successfully' as result;
