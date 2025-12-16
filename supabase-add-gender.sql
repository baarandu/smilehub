-- =====================================================
-- ADD: Gender column to profiles table
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Add gender column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female'));

-- Update trigger to capture gender from signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_clinic_id uuid;
  clinic_name_value text;
  user_name_value text;
  account_type_value text;
  gender_value text;
BEGIN
  -- Get metadata values with safe defaults
  user_name_value := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário');
  account_type_value := COALESCE(NEW.raw_user_meta_data->>'account_type', 'solo');
  gender_value := NEW.raw_user_meta_data->>'gender';
  
  -- Determine clinic name based on account type
  IF account_type_value = 'clinic' THEN
    clinic_name_value := COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'Minha Clínica');
  ELSE
    -- Use Dr. or Dra. based on gender
    IF gender_value = 'female' THEN
      clinic_name_value := 'Dra. ' || user_name_value;
    ELSE
      clinic_name_value := 'Dr. ' || user_name_value;
    END IF;
  END IF;
  
  -- Create new clinic
  INSERT INTO clinics (name) 
  VALUES (clinic_name_value)
  RETURNING id INTO new_clinic_id;
  
  -- Associate user as admin of the clinic
  INSERT INTO clinic_users (clinic_id, user_id, role)
  VALUES (new_clinic_id, NEW.id, 'admin');
  
  -- Create user profile with gender
  INSERT INTO profiles (id, full_name, gender)
  VALUES (NEW.id, user_name_value, gender_value)
  ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    gender = EXCLUDED.gender;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'gender';
