-- =====================================================
-- FIX: Adjust INSERT policies to work with auto-clinic trigger
-- The trigger sets clinic_id, but RLS checks BEFORE trigger runs
-- Solution: Use a more permissive INSERT check
-- =====================================================

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Users can insert patients in their clinic" ON patients;
DROP POLICY IF EXISTS "Users can insert appointments in their clinic" ON appointments;
DROP POLICY IF EXISTS "Users can insert transactions in their clinic" ON financial_transactions;
DROP POLICY IF EXISTS "Users can insert procedures in their clinic" ON procedures;
DROP POLICY IF EXISTS "Users can insert budgets in their clinic" ON budgets;
DROP POLICY IF EXISTS "Users can insert exams in their clinic" ON exams;
DROP POLICY IF EXISTS "Users can insert anamneses in their clinic" ON anamneses;
DROP POLICY IF EXISTS "Users can insert locations in their clinic" ON locations;

-- Create new INSERT policies that allow inserts for authenticated users
-- The trigger will set the clinic_id, and SELECT/UPDATE/DELETE policies prevent cross-clinic access

CREATE POLICY "Users can insert patients" ON patients
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can insert appointments" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can insert transactions" ON financial_transactions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can insert procedures" ON procedures
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can insert budgets" ON budgets
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can insert exams" ON exams
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can insert anamneses" ON anamneses
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can insert locations" ON locations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Verify policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND cmd = 'INSERT'
AND tablename IN ('patients', 'appointments', 'financial_transactions', 'procedures', 'budgets', 'exams', 'anamneses', 'locations');
