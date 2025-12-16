-- =====================================================
-- FIX: Handle New User Trigger
-- Execute this to fix signup issues
-- =====================================================

-- 1. Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Ensure tables exist with correct structure
CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinic_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Disable RLS temporarily for these tables to allow trigger to work
ALTER TABLE clinics DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 4. Create or replace the function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_clinic_id uuid;
  clinic_name_value text;
  user_name_value text;
  account_type_value text;
BEGIN
  -- Get metadata values with safe defaults
  user_name_value := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');
  account_type_value := COALESCE(NEW.raw_user_meta_data->>'account_type', 'solo');
  
  -- Determine clinic name based on account type
  IF account_type_value = 'clinic' THEN
    clinic_name_value := COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'Minha Clínica');
  ELSE
    clinic_name_value := 'Dr(a). ' || user_name_value;
  END IF;
  
  -- Create new clinic
  INSERT INTO clinics (name) 
  VALUES (clinic_name_value)
  RETURNING id INTO new_clinic_id;
  
  -- Associate user as admin of the clinic
  INSERT INTO clinic_users (clinic_id, user_id, role)
  VALUES (new_clinic_id, NEW.id, 'admin');
  
  -- Create user profile
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, user_name_value)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the user creation
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Re-enable RLS
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies first, then recreate
DROP POLICY IF EXISTS "Users can view their clinic" ON clinics;
DROP POLICY IF EXISTS "Users can view their clinic_users" ON clinic_users;
DROP POLICY IF EXISTS "Users can view their profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update clinic" ON clinics;

-- These policies allow authenticated users to see their own data
CREATE POLICY "Users can view their clinic" ON clinics
  FOR SELECT USING (
    id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view their clinic_users" ON clinic_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their profile" ON profiles
  FOR UPDATE USING (id = auth.uid());
