-- =====================================================
-- Create clinics for users who don't have one
-- Execute this in Supabase SQL Editor
-- =====================================================

DO $$
DECLARE
  user_record RECORD;
  new_clinic_id uuid;
  user_name text;
  clinic_name_value text;
  user_gender text;
BEGIN
  FOR user_record IN SELECT id, email, raw_user_meta_data FROM auth.users
  LOOP
    IF NOT EXISTS (SELECT 1 FROM clinic_users WHERE user_id = user_record.id) THEN
      user_name := COALESCE(
        user_record.raw_user_meta_data->>'full_name',
        split_part(user_record.email, '@', 1)
      );
      user_gender := user_record.raw_user_meta_data->>'gender';
      
      clinic_name_value := COALESCE(
        user_record.raw_user_meta_data->>'clinic_name',
        CASE WHEN user_gender = 'female' THEN 'Dra. ' ELSE 'Dr. ' END || user_name
      );
      
      INSERT INTO clinics (name) 
      VALUES (clinic_name_value)
      RETURNING id INTO new_clinic_id;
      
      INSERT INTO clinic_users (clinic_id, user_id, role)
      VALUES (new_clinic_id, user_record.id, 'admin');
      
      INSERT INTO profiles (id, full_name, gender)
      VALUES (user_record.id, user_name, user_gender)
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, gender = EXCLUDED.gender;
      
      RAISE NOTICE 'Created clinic for user %', user_record.email;
    END IF;
  END LOOP;
END $$;
