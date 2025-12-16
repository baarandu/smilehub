-- =====================================================
-- FIX: Complete Data Isolation by Clinic
-- This script ensures each clinic only sees their own data
-- Execute this AFTER the other scripts
-- =====================================================

-- 1. Create helper function to get current user's clinic_id
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS uuid AS $$
  SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Add clinic_id column to all data tables if not exists
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);

-- 3. Enable RLS on all data tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies and create new ones for PATIENTS
DROP POLICY IF EXISTS "Users can view patients in their clinic" ON patients;
DROP POLICY IF EXISTS "Users can insert patients in their clinic" ON patients;
DROP POLICY IF EXISTS "Users can update patients in their clinic" ON patients;
DROP POLICY IF EXISTS "Users can delete patients in their clinic" ON patients;

CREATE POLICY "Users can view patients in their clinic" ON patients
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can insert patients in their clinic" ON patients
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can update patients in their clinic" ON patients
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can delete patients in their clinic" ON patients
  FOR DELETE USING (clinic_id = get_user_clinic_id());

-- 5. Drop existing policies and create new ones for APPOINTMENTS
DROP POLICY IF EXISTS "Users can view appointments in their clinic" ON appointments;
DROP POLICY IF EXISTS "Users can insert appointments in their clinic" ON appointments;
DROP POLICY IF EXISTS "Users can update appointments in their clinic" ON appointments;
DROP POLICY IF EXISTS "Users can delete appointments in their clinic" ON appointments;

CREATE POLICY "Users can view appointments in their clinic" ON appointments
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can insert appointments in their clinic" ON appointments
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can update appointments in their clinic" ON appointments
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can delete appointments in their clinic" ON appointments
  FOR DELETE USING (clinic_id = get_user_clinic_id());

-- 6. Drop existing policies and create new ones for FINANCIAL_TRANSACTIONS
DROP POLICY IF EXISTS "Users can view transactions in their clinic" ON financial_transactions;
DROP POLICY IF EXISTS "Users can insert transactions in their clinic" ON financial_transactions;
DROP POLICY IF EXISTS "Users can update transactions in their clinic" ON financial_transactions;
DROP POLICY IF EXISTS "Users can delete transactions in their clinic" ON financial_transactions;

CREATE POLICY "Users can view transactions in their clinic" ON financial_transactions
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can insert transactions in their clinic" ON financial_transactions
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can update transactions in their clinic" ON financial_transactions
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can delete transactions in their clinic" ON financial_transactions
  FOR DELETE USING (clinic_id = get_user_clinic_id());

-- 7. Drop existing policies and create new ones for PROCEDURES
DROP POLICY IF EXISTS "Users can view procedures in their clinic" ON procedures;
DROP POLICY IF EXISTS "Users can insert procedures in their clinic" ON procedures;
DROP POLICY IF EXISTS "Users can update procedures in their clinic" ON procedures;
DROP POLICY IF EXISTS "Users can delete procedures in their clinic" ON procedures;

CREATE POLICY "Users can view procedures in their clinic" ON procedures
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can insert procedures in their clinic" ON procedures
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can update procedures in their clinic" ON procedures
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can delete procedures in their clinic" ON procedures
  FOR DELETE USING (clinic_id = get_user_clinic_id());

-- 8. Drop existing policies and create new ones for BUDGETS
DROP POLICY IF EXISTS "Users can view budgets in their clinic" ON budgets;
DROP POLICY IF EXISTS "Users can insert budgets in their clinic" ON budgets;
DROP POLICY IF EXISTS "Users can update budgets in their clinic" ON budgets;
DROP POLICY IF EXISTS "Users can delete budgets in their clinic" ON budgets;

CREATE POLICY "Users can view budgets in their clinic" ON budgets
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can insert budgets in their clinic" ON budgets
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can update budgets in their clinic" ON budgets
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can delete budgets in their clinic" ON budgets
  FOR DELETE USING (clinic_id = get_user_clinic_id());

-- 9. Drop existing policies and create new ones for EXAMS
DROP POLICY IF EXISTS "Users can view exams in their clinic" ON exams;
DROP POLICY IF EXISTS "Users can insert exams in their clinic" ON exams;
DROP POLICY IF EXISTS "Users can update exams in their clinic" ON exams;
DROP POLICY IF EXISTS "Users can delete exams in their clinic" ON exams;

CREATE POLICY "Users can view exams in their clinic" ON exams
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can insert exams in their clinic" ON exams
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can update exams in their clinic" ON exams
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can delete exams in their clinic" ON exams
  FOR DELETE USING (clinic_id = get_user_clinic_id());

-- 10. Drop existing policies and create new ones for ANAMNESES
DROP POLICY IF EXISTS "Users can view anamneses in their clinic" ON anamneses;
DROP POLICY IF EXISTS "Users can insert anamneses in their clinic" ON anamneses;
DROP POLICY IF EXISTS "Users can update anamneses in their clinic" ON anamneses;
DROP POLICY IF EXISTS "Users can delete anamneses in their clinic" ON anamneses;

CREATE POLICY "Users can view anamneses in their clinic" ON anamneses
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can insert anamneses in their clinic" ON anamneses
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can update anamneses in their clinic" ON anamneses
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can delete anamneses in their clinic" ON anamneses
  FOR DELETE USING (clinic_id = get_user_clinic_id());

-- 11. Drop existing policies and create new ones for LOCATIONS
DROP POLICY IF EXISTS "Users can view locations in their clinic" ON locations;
DROP POLICY IF EXISTS "Users can insert locations in their clinic" ON locations;
DROP POLICY IF EXISTS "Users can update locations in their clinic" ON locations;
DROP POLICY IF EXISTS "Users can delete locations in their clinic" ON locations;

CREATE POLICY "Users can view locations in their clinic" ON locations
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can insert locations in their clinic" ON locations
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can update locations in their clinic" ON locations
  FOR UPDATE USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Users can delete locations in their clinic" ON locations
  FOR DELETE USING (clinic_id = get_user_clinic_id());

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_clinic_id ON financial_transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_procedures_clinic_id ON procedures(clinic_id);
CREATE INDEX IF NOT EXISTS idx_budgets_clinic_id ON budgets(clinic_id);
CREATE INDEX IF NOT EXISTS idx_exams_clinic_id ON exams(clinic_id);
CREATE INDEX IF NOT EXISTS idx_anamneses_clinic_id ON anamneses(clinic_id);
CREATE INDEX IF NOT EXISTS idx_locations_clinic_id ON locations(clinic_id);
