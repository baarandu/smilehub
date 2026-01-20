-- =====================================================
-- FIX: Signup Trigger and Schema Sync
-- Execute this script in the Supabase SQL Editor
-- to resolve "Database error saving new user"
-- =====================================================

-- 1. Ensure 'profiles' table has all necessary columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Ensure 'clinics' related tables exist (just safety checks)
CREATE TABLE IF NOT EXISTS public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinic_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);

-- 3. Redefine the 'handle_new_user' trigger with ROBUST logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_clinic_id uuid;
  clinic_name_value text;
  user_name_value text;
  account_type_value text;
  gender_value text;
BEGIN
  -- Log start (optional, visible in logs)
  -- RAISE LOG 'handle_new_user started for %', NEW.id;

  -- A. Extract metadata safely
  user_name_value := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');
  account_type_value := COALESCE(NEW.raw_user_meta_data->>'account_type', 'solo');
  gender_value := NEW.raw_user_meta_data->>'gender';
  
  -- B. Determine Clinic Name
  IF account_type_value = 'clinic' THEN
    clinic_name_value := COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'Minha Clínica');
  ELSE
    -- Solo logic: Use gender to format title
    IF gender_value = 'female' THEN
      clinic_name_value := 'Dra. ' || user_name_value;
    ELSE
      clinic_name_value := 'Dr. ' || user_name_value;
    END IF;
  END IF;

  -- C. Insert Clinic
  INSERT INTO public.clinics (name)
  VALUES (clinic_name_value)
  RETURNING id INTO new_clinic_id;

  -- D. Assign User as Admin of Clinic
  INSERT INTO public.clinic_users (clinic_id, user_id, role)
  VALUES (new_clinic_id, NEW.id, 'admin');

  -- E. Create Profile
  -- Use UPSERT to prevent primary key violation if somehow profile exists
  INSERT INTO public.profiles (id, full_name, gender, is_super_admin)
  VALUES (NEW.id, user_name_value, gender_value, false)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    gender = COALESCE(EXCLUDED.gender, public.profiles.gender),
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error so we can see it in Supabase logs
  RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
  -- Return NEW anyway to allow Auth user creation to succeed? 
  -- NO. If we return NEW here, the Auth User is created but Profile/Clinic is missing.
  -- It's better to fail the transaction so the user can try again after fix.
  -- Reraise the error.
  RAISE EXCEPTION 'Database insertion failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-bind the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Grant Permissions (Fixes RLS/Permission issues)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Special Grants for Authenticated/Anon (Adjust as needed, usually RLS handles this)
GRANT INSERT, SELECT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.clinic_users TO authenticated;

-- Confirmation
SELECT 'Fix applied successfully' as result;
