-- =====================================================
-- FIX: Ensure profiles have data and RLS allows reading
-- =====================================================

-- 1. Check current profiles
SELECT 'CURRENT PROFILES:' as info;
SELECT id, full_name, created_at FROM profiles;

-- 2. Check RLS policies on profiles
SELECT 'PROFILES POLICIES:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- 3. Ensure profile exists for all users with full_name from clinic name
UPDATE profiles p
SET full_name = COALESCE(
  p.full_name,
  (SELECT REPLACE(REPLACE(c.name, 'Clínica de ', ''), 'Dr(a). ', '')
   FROM clinic_users cu 
   JOIN clinics c ON cu.clinic_id = c.id 
   WHERE cu.user_id = p.id 
   LIMIT 1)
)
WHERE p.full_name IS NULL OR p.full_name = '';

-- 4. Insert profiles for users who don't have one
INSERT INTO profiles (id, full_name)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    REPLACE(REPLACE(c.name, 'Clínica de ', ''), 'Dr(a). ', ''),
    split_part(u.email, '@', 1)
  )
FROM auth.users u
LEFT JOIN clinic_users cu ON cu.user_id = u.id
LEFT JOIN clinics c ON cu.clinic_id = c.id
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = u.id)
ON CONFLICT (id) DO UPDATE SET 
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- 5. Verify
SELECT 'UPDATED PROFILES:' as info;
SELECT p.id, p.full_name, u.email 
FROM profiles p 
JOIN auth.users u ON p.id = u.id;
