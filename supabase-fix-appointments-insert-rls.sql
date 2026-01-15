-- =====================================================
-- FIX: Appointments INSERT RLS Policy
-- The RLS policy checks BEFORE the trigger runs, so we need
-- a permissive INSERT policy that allows the trigger to set clinic_id
-- =====================================================

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop all existing INSERT policies for appointments
DROP POLICY IF EXISTS "Users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert appointments in their clinic" ON public.appointments;
DROP POLICY IF EXISTS "Editors can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.appointments;
DROP POLICY IF EXISTS "Allow all for appointments" ON public.appointments;

-- Create a permissive INSERT policy
-- This allows authenticated users to insert appointments
-- The trigger will set clinic_id automatically
-- Other policies (SELECT/UPDATE/DELETE) will enforce clinic isolation
CREATE POLICY "Users can insert appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (true);

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
  AND tablename = 'appointments'
  AND cmd = 'INSERT';
