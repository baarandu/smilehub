-- =====================================================
-- FIX: Link existing users to clinics
-- The signup trigger failed - manually create the associations
-- =====================================================

-- 1. First, see all auth users and clinics
SELECT 'USERS:' as info;
SELECT id, email, created_at FROM auth.users ORDER BY created_at;

SELECT 'CLINICS:' as info;
SELECT id, name, created_at FROM clinics ORDER BY created_at;

-- 2. Create clinic entries for each user who doesn't have one
-- This will create a clinic for each user and associate them
DO $$
DECLARE
  user_record RECORD;
  new_clinic_id uuid;
  user_name text;
BEGIN
  -- Loop through all users
  FOR user_record IN SELECT id, email, raw_user_meta_data FROM auth.users
  LOOP
    -- Check if user already has a clinic
    IF NOT EXISTS (SELECT 1 FROM clinic_users WHERE user_id = user_record.id) THEN
      -- Get user name from metadata or use email
      user_name := COALESCE(
        user_record.raw_user_meta_data->>'full_name',
        split_part(user_record.email, '@', 1)
      );
      
      -- Create a clinic for this user
      INSERT INTO clinics (name) 
      VALUES ('Clínica de ' || user_name)
      RETURNING id INTO new_clinic_id;
      
      -- Associate user as admin of their clinic
      INSERT INTO clinic_users (clinic_id, user_id, role)
      VALUES (new_clinic_id, user_record.id, 'admin');
      
      -- Create profile if doesn't exist
      INSERT INTO profiles (id, full_name)
      VALUES (user_record.id, user_name)
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
      
      RAISE NOTICE 'Created clinic for user: %', user_record.email;
    END IF;
  END LOOP;
END $$;

-- 3. Verify the fix
SELECT 'CLINIC USERS AFTER FIX:' as info;
SELECT 
  cu.user_id,
  u.email,
  c.name as clinic_name,
  cu.role
FROM clinic_users cu
JOIN auth.users u ON cu.user_id = u.id
JOIN clinics c ON cu.clinic_id = c.id;
