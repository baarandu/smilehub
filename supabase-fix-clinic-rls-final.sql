-- =====================================================
-- FINAL FIX: clinic_users and clinics RLS Policies
-- This script removes ALL existing policies and creates
-- simple policies that DON'T have circular dependencies
-- =====================================================

-- ============================================
-- 1. DROP ALL EXISTING POLICIES ON CLINICS
-- ============================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'clinics' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinics', r.policyname);
    END LOOP;
END $$;

-- ============================================
-- 2. DROP ALL EXISTING POLICIES ON CLINIC_USERS
-- ============================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'clinic_users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clinic_users', r.policyname);
    END LOOP;
END $$;

-- ============================================
-- 3. ENSURE RLS IS ENABLED
-- ============================================
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE CLINIC_USERS POLICIES FIRST
-- (Simple, without function calls)
-- ============================================

-- SELECT: Users can see their own membership record
CREATE POLICY "clinic_users_select_own"
ON public.clinic_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Users can insert their own membership
CREATE POLICY "clinic_users_insert_own"
ON public.clinic_users FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own membership
CREATE POLICY "clinic_users_update_own"
ON public.clinic_users FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own membership
CREATE POLICY "clinic_users_delete_own"
ON public.clinic_users FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 5. CREATE CLINICS POLICIES
-- ============================================

-- INSERT: Any authenticated user can create a clinic
CREATE POLICY "clinics_insert_any"
ON public.clinics FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: Users can view clinics they belong to
CREATE POLICY "clinics_select_member"
ON public.clinics FOR SELECT
TO authenticated
USING (
    id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid())
);

-- UPDATE: Users can update clinics they belong to
CREATE POLICY "clinics_update_member"
ON public.clinics FOR UPDATE
TO authenticated
USING (id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()))
WITH CHECK (true);

-- DELETE: Users can delete clinics they own
CREATE POLICY "clinics_delete_owner"
ON public.clinics FOR DELETE
TO authenticated
USING (id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid() AND role = 'owner'));

-- ============================================
-- 6. VERIFY RESULTS
-- ============================================
SELECT
    tablename,
    policyname,
    cmd,
    permissive,
    roles::text
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('clinics', 'clinic_users')
ORDER BY tablename, cmd;
