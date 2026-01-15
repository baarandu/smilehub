-- =====================================================
-- FIX: clinic_users SELECT RLS Policy
-- Users need to be able to query their own clinic_users record
-- to get their clinic_id when creating appointments
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.clinic_users ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policies that might be blocking
DROP POLICY IF EXISTS "clinic_users_select_policy" ON public.clinic_users;
DROP POLICY IF EXISTS "Users can view clinic members" ON public.clinic_users;
DROP POLICY IF EXISTS "Users can view their clinic_users" ON public.clinic_users;

-- Create a permissive SELECT policy
-- Users can see their own clinic_users record
CREATE POLICY "Users can view their own clinic_users" ON public.clinic_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'clinic_users'
  AND cmd = 'SELECT';
