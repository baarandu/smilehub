-- FIX RLS POLICIES FOR CLINICS AND CLINIC_USERS TABLES
-- Error 42501: new row violates row-level security policy for table "clinics"

-- ============================================
-- 1. CLINICS TABLE POLICIES
-- ============================================

-- Drop existing policies on clinics
DROP POLICY IF EXISTS "Users can view their clinic" ON clinics;
DROP POLICY IF EXISTS "Users can insert clinics" ON clinics;
DROP POLICY IF EXISTS "Users can update their clinic" ON clinics;
DROP POLICY IF EXISTS "Allow authenticated users to create clinics" ON clinics;
DROP POLICY IF EXISTS "Allow users to view their clinics" ON clinics;
DROP POLICY IF EXISTS "Allow users to update their clinics" ON clinics;

-- Enable RLS on clinics
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can create clinics
CREATE POLICY "Allow authenticated users to create clinics"
ON clinics FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Users can view clinics they belong to
CREATE POLICY "Allow users to view their clinics"
ON clinics FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT clinic_id FROM clinic_users 
        WHERE user_id = auth.uid()
    )
);

-- Policy: Users can update clinics they own
CREATE POLICY "Allow users to update their clinics"
ON clinics FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT clinic_id FROM clinic_users 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    id IN (
        SELECT clinic_id FROM clinic_users 
        WHERE user_id = auth.uid()
    )
);

-- ============================================
-- 2. CLINIC_USERS TABLE POLICIES
-- ============================================

-- Drop existing policies on clinic_users
DROP POLICY IF EXISTS "Users can view their clinic memberships" ON clinic_users;
DROP POLICY IF EXISTS "Users can insert their clinic memberships" ON clinic_users;
DROP POLICY IF EXISTS "Allow authenticated users to create clinic_users" ON clinic_users;
DROP POLICY IF EXISTS "Allow users to view their clinic_users" ON clinic_users;

-- Enable RLS on clinic_users
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can create clinic_users (for initial clinic setup)
CREATE POLICY "Allow authenticated users to create clinic_users"
ON clinic_users FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can view their own clinic memberships
CREATE POLICY "Allow users to view their clinic_users"
ON clinic_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 3. VERIFY POLICIES
-- ============================================

-- Check clinics policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('clinics', 'clinic_users');
