-- =====================================================
-- AUTO-POPULATE clinic_id on INSERT
-- This trigger automatically sets clinic_id based on the authenticated user
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Create function to auto-populate clinic_id
CREATE OR REPLACE FUNCTION set_clinic_id()
RETURNS trigger AS $$
BEGIN
  -- Only set clinic_id if it's not already provided
  IF NEW.clinic_id IS NULL THEN
    NEW.clinic_id := (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for all tables that have clinic_id

-- Patients
DROP TRIGGER IF EXISTS set_clinic_id_patients ON patients;
CREATE TRIGGER set_clinic_id_patients
  BEFORE INSERT ON patients
  FOR EACH ROW EXECUTE FUNCTION set_clinic_id();

-- Appointments
DROP TRIGGER IF EXISTS set_clinic_id_appointments ON appointments;
CREATE TRIGGER set_clinic_id_appointments
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_clinic_id();

-- Financial Transactions
DROP TRIGGER IF EXISTS set_clinic_id_financial ON financial_transactions;
CREATE TRIGGER set_clinic_id_financial
  BEFORE INSERT ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION set_clinic_id();

-- Procedures
DROP TRIGGER IF EXISTS set_clinic_id_procedures ON procedures;
CREATE TRIGGER set_clinic_id_procedures
  BEFORE INSERT ON procedures
  FOR EACH ROW EXECUTE FUNCTION set_clinic_id();

-- Budgets
DROP TRIGGER IF EXISTS set_clinic_id_budgets ON budgets;
CREATE TRIGGER set_clinic_id_budgets
  BEFORE INSERT ON budgets
  FOR EACH ROW EXECUTE FUNCTION set_clinic_id();

-- Exams
DROP TRIGGER IF EXISTS set_clinic_id_exams ON exams;
CREATE TRIGGER set_clinic_id_exams
  BEFORE INSERT ON exams
  FOR EACH ROW EXECUTE FUNCTION set_clinic_id();

-- Anamneses
DROP TRIGGER IF EXISTS set_clinic_id_anamneses ON anamneses;
CREATE TRIGGER set_clinic_id_anamneses
  BEFORE INSERT ON anamneses
  FOR EACH ROW EXECUTE FUNCTION set_clinic_id();

-- Locations
DROP TRIGGER IF EXISTS set_clinic_id_locations ON locations;
CREATE TRIGGER set_clinic_id_locations
  BEFORE INSERT ON locations
  FOR EACH ROW EXECUTE FUNCTION set_clinic_id();

-- Verify triggers were created
SELECT 
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE 'set_clinic_id%'
ORDER BY event_object_table;
