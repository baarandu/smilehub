-- =====================================================
-- MIGRATE: Assign clinic_id to existing data
-- Run this AFTER supabase-complete-data-isolation.sql
-- =====================================================

-- Find all unique user_ids that have created data but might not have clinics
-- Then assign their data to their clinic

-- For each user with data, get their clinic_id and update their records
DO $$
DECLARE
  user_record RECORD;
  user_clinic_id uuid;
BEGIN
  -- Get all unique user_ids from clinic_users
  FOR user_record IN SELECT DISTINCT user_id, clinic_id FROM clinic_users
  LOOP
    user_clinic_id := user_record.clinic_id;
    
    -- Update all tables for this user where clinic_id is NULL
    -- We use user_id column if it exists, otherwise we skip
    
    UPDATE patients SET clinic_id = user_clinic_id 
    WHERE clinic_id IS NULL AND user_id = user_record.user_id;
    
    UPDATE appointments SET clinic_id = user_clinic_id 
    WHERE clinic_id IS NULL AND user_id = user_record.user_id;
    
    UPDATE financial_transactions SET clinic_id = user_clinic_id 
    WHERE clinic_id IS NULL AND user_id = user_record.user_id;
    
    UPDATE procedures SET clinic_id = user_clinic_id 
    WHERE clinic_id IS NULL AND user_id = user_record.user_id;
    
    UPDATE budgets SET clinic_id = user_clinic_id 
    WHERE clinic_id IS NULL AND user_id = user_record.user_id;
    
    UPDATE exams SET clinic_id = user_clinic_id 
    WHERE clinic_id IS NULL AND user_id = user_record.user_id;
    
    UPDATE anamneses SET clinic_id = user_clinic_id 
    WHERE clinic_id IS NULL AND user_id = user_record.user_id;
    
    UPDATE locations SET clinic_id = user_clinic_id 
    WHERE clinic_id IS NULL AND user_id = user_record.user_id;
    
  END LOOP;
END $$;

-- For any remaining records with NULL clinic_id, assign to first clinic
-- (This handles orphaned data from before multi-tenant was implemented)
UPDATE patients SET clinic_id = (SELECT id FROM clinics LIMIT 1) WHERE clinic_id IS NULL;
UPDATE appointments SET clinic_id = (SELECT id FROM clinics LIMIT 1) WHERE clinic_id IS NULL;
UPDATE financial_transactions SET clinic_id = (SELECT id FROM clinics LIMIT 1) WHERE clinic_id IS NULL;
UPDATE procedures SET clinic_id = (SELECT id FROM clinics LIMIT 1) WHERE clinic_id IS NULL;
UPDATE budgets SET clinic_id = (SELECT id FROM clinics LIMIT 1) WHERE clinic_id IS NULL;
UPDATE exams SET clinic_id = (SELECT id FROM clinics LIMIT 1) WHERE clinic_id IS NULL;
UPDATE anamneses SET clinic_id = (SELECT id FROM clinics LIMIT 1) WHERE clinic_id IS NULL;
UPDATE locations SET clinic_id = (SELECT id FROM clinics LIMIT 1) WHERE clinic_id IS NULL;

-- Show summary of data per clinic
SELECT 
  c.name as clinic_name,
  (SELECT COUNT(*) FROM patients WHERE clinic_id = c.id) as patients,
  (SELECT COUNT(*) FROM appointments WHERE clinic_id = c.id) as appointments,
  (SELECT COUNT(*) FROM financial_transactions WHERE clinic_id = c.id) as transactions
FROM clinics c;
