-- =====================================================
-- Profiles Table for User Names and Avatars
-- Execute this after multi-tenant-schema.sql
-- =====================================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Update the new user trigger to also create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_clinic_id uuid;
  clinic_name_value text;
  user_name_value text;
  account_type_value text;
BEGIN
  -- Get metadata values
  user_name_value := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');
  account_type_value := COALESCE(NEW.raw_user_meta_data->>'account_type', 'solo');
  
  -- Determine clinic name based on account type
  IF account_type_value = 'clinic' THEN
    clinic_name_value := COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'Minha Clínica');
  ELSE
    -- For solo dentists, use their name as clinic name
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
  VALUES (NEW.id, user_name_value);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
