-- FIX RLS POLICIES FOR CLINICS AND CLINIC_USERS TABLES
-- AGGRESSIVE FIX: Drops ALL existing policies first

-- ============================================
-- 1. DROP ALL EXISTING POLICIES ON CLINICS
-- ============================================
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'clinics'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON clinics';
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
END $$;

-- ============================================
-- 2. DROP ALL EXISTING POLICIES ON CLINIC_USERS
-- ============================================
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'clinic_users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON clinic_users';
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
END $$;

-- ============================================
-- 3. ENSURE RLS IS ENABLED
-- ============================================
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE SIMPLE PERMISSIVE POLICIES FOR CLINICS
-- ============================================

-- INSERT: Any authenticated user can create a clinic
CREATE POLICY "clinics_insert_policy"
ON clinics FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: Users can see clinics they belong to
CREATE POLICY "clinics_select_policy"
ON clinics FOR SELECT
TO authenticated
USING (
    id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
    OR NOT EXISTS (SELECT 1 FROM clinic_users WHERE user_id = auth.uid())
);

-- UPDATE: Users can update clinics they belong to
CREATE POLICY "clinics_update_policy"
ON clinics FOR UPDATE
TO authenticated
USING (id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()))
WITH CHECK (true);

-- DELETE: Users can delete clinics they own
CREATE POLICY "clinics_delete_policy"
ON clinics FOR DELETE
TO authenticated
USING (id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role = 'owner'));

-- ============================================
-- 5. CREATE SIMPLE PERMISSIVE POLICIES FOR CLINIC_USERS
-- ============================================

-- INSERT: Authenticated users can link themselves to a clinic
CREATE POLICY "clinic_users_insert_policy"
ON clinic_users FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- SELECT: Users can see their own clinic memberships
CREATE POLICY "clinic_users_select_policy"
ON clinic_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- UPDATE: Users can update their own clinic memberships
CREATE POLICY "clinic_users_update_policy"
ON clinic_users FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can remove their own clinic memberships
CREATE POLICY "clinic_users_delete_policy"
ON clinic_users FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 6. VERIFY NEW POLICIES
-- ============================================
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN ('clinics', 'clinic_users')
ORDER BY tablename, cmd;
