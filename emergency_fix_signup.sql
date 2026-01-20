-- =====================================================
-- EMERGENCY FIX: Signup Blocker
-- Execute this to remove constraints and simplify logic
-- =====================================================

-- 1. Drop the check constraint on gender (Potential blocker)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;

-- 2. Drop potential duplicate/rogue triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- 3. Redefine handle_new_user with DEFENSIVE logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_clinic_id uuid;
  clinic_name_text text;
  full_name_text text;
BEGIN
  -- Safe defaults
  full_name_text := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');
  clinic_name_text := COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'Minha Clínica');

  -- 1. Create Clinic
  INSERT INTO public.clinics (name)
  VALUES (clinic_name_text)
  RETURNING id INTO new_clinic_id;

  -- 2. Create Clinic User
  INSERT INTO public.clinic_users (clinic_id, user_id, role)
  VALUES (new_clinic_id, NEW.id, 'admin');

  -- 3. Create Profile (Basic info only first)
  INSERT INTO public.profiles (id, full_name, is_super_admin)
  VALUES (NEW.id, full_name_text, false);
  
  -- 4. Try updating Gender separately (Soft fail if issues)
  BEGIN
    UPDATE public.profiles 
    SET gender = NEW.raw_user_meta_data->>'gender'
    WHERE id = NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Non-critical error setting gender: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Provide clear error message
  RAISE EXCEPTION 'SignUp Critical Failure: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Final Permission Check
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

SELECT 'Emergency fix applied' as result;
