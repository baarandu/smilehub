-- =====================================================
-- FIX: Remove conflicting "Allow all" policies
-- These policies are bypassing clinic-based filtering
-- Execute this to fix data isolation
-- =====================================================

-- 1. Drop ALL "Allow all" policies that bypass clinic filtering
DROP POLICY IF EXISTS "Allow all for patients" ON patients;
DROP POLICY IF EXISTS "Allow all for appointments" ON appointments;
DROP POLICY IF EXISTS "Allow all for consultations" ON consultations;
DROP POLICY IF EXISTS "Allow all operations on locations" ON locations;
DROP POLICY IF EXISTS "Allow all for patient_documents" ON patient_documents;
DROP POLICY IF EXISTS "Allow all for exams" ON exams;
DROP POLICY IF EXISTS "Allow all for budgets" ON budgets;
DROP POLICY IF EXISTS "Allow all for procedures" ON procedures;
DROP POLICY IF EXISTS "Allow all for anamneses" ON anamneses;
DROP POLICY IF EXISTS "Allow all for financial_transactions" ON financial_transactions;

-- 2. Drop old policies that don't filter by clinic
DROP POLICY IF EXISTS "View patients from clinic" ON patients;
DROP POLICY IF EXISTS "View appointments from clinic" ON appointments;
DROP POLICY IF EXISTS "View financial from clinic" ON financial_transactions;
DROP POLICY IF EXISTS "View locations from clinic" ON locations;
DROP POLICY IF EXISTS "View exams from clinic" ON exams;
DROP POLICY IF EXISTS "View budgets from clinic" ON budgets;
DROP POLICY IF EXISTS "View procedures from clinic" ON procedures;
DROP POLICY IF EXISTS "View anamneses from clinic" ON anamneses;

-- 3. Drop role-based policies that don't filter by clinic
DROP POLICY IF EXISTS "Editors can insert patients" ON patients;
DROP POLICY IF EXISTS "Editors can update patients" ON patients;
DROP POLICY IF EXISTS "Admins can delete patients" ON patients;
DROP POLICY IF EXISTS "Editors can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Editors can update appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can delete appointments" ON appointments;
DROP POLICY IF EXISTS "Editors can insert financial" ON financial_transactions;
DROP POLICY IF EXISTS "Editors can update financial" ON financial_transactions;
DROP POLICY IF EXISTS "Admins can delete financial" ON financial_transactions;
DROP POLICY IF EXISTS "Editors can insert exams" ON exams;
DROP POLICY IF EXISTS "Editors can update exams" ON exams;
DROP POLICY IF EXISTS "Admins can delete exams" ON exams;
DROP POLICY IF EXISTS "Editors can insert budgets" ON budgets;
DROP POLICY IF EXISTS "Editors can update budgets" ON budgets;
DROP POLICY IF EXISTS "Admins can delete budgets" ON budgets;
DROP POLICY IF EXISTS "Editors can insert procedures" ON procedures;
DROP POLICY IF EXISTS "Editors can update procedures" ON procedures;
DROP POLICY IF EXISTS "Admins can delete procedures" ON procedures;
DROP POLICY IF EXISTS "Editors can insert anamneses" ON anamneses;
DROP POLICY IF EXISTS "Editors can update anamneses" ON anamneses;
DROP POLICY IF EXISTS "Admins can delete anamneses" ON anamneses;
DROP POLICY IF EXISTS "Admins can insert locations" ON locations;
DROP POLICY IF EXISTS "Admins can update locations" ON locations;
DROP POLICY IF EXISTS "Admins can delete locations" ON locations;
DROP POLICY IF EXISTS "Allow select on locations" ON locations;
DROP POLICY IF EXISTS "Allow update on locations" ON locations;
DROP POLICY IF EXISTS "Allow insert on locations" ON locations;
DROP POLICY IF EXISTS "Allow delete on locations" ON locations;

-- 4. Drop authenticated user policies that don't filter by clinic
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON exams;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON exams;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON exams;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON financial_transactions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON financial_transactions;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON financial_transactions;

-- 5. Drop general view policies
DROP POLICY IF EXISTS "Users can view all exams" ON exams;
DROP POLICY IF EXISTS "Users can view anamneses" ON anamneses;
DROP POLICY IF EXISTS "Users can insert anamneses" ON anamneses;
DROP POLICY IF EXISTS "Users can update anamneses" ON anamneses;
DROP POLICY IF EXISTS "Users can delete anamneses" ON anamneses;
DROP POLICY IF EXISTS "Users can view budgets" ON budgets;
DROP POLICY IF EXISTS "Users can insert budgets" ON budgets;
DROP POLICY IF EXISTS "Users can update budgets" ON budgets;
DROP POLICY IF EXISTS "Users can delete budgets" ON budgets;
DROP POLICY IF EXISTS "Users can view procedures" ON procedures;
DROP POLICY IF EXISTS "Users can insert procedures" ON procedures;
DROP POLICY IF EXISTS "Users can update procedures" ON procedures;
DROP POLICY IF EXISTS "Users can delete procedures" ON procedures;
DROP POLICY IF EXISTS "Users can insert exams" ON exams;
DROP POLICY IF EXISTS "Users can update exams" ON exams;
DROP POLICY IF EXISTS "Users can delete exams" ON exams;

-- 6. Now verify only clinic-based policies remain
-- Run this query to check:
SELECT 
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('patients', 'appointments', 'financial_transactions', 'procedures', 'budgets', 'exams', 'anamneses', 'locations')
ORDER BY tablename, policyname;
