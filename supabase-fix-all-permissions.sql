-- MASTER PERMISSIONS FIX SCRIPT
-- This script secures all tables by ensuring they are linked to the user.

-- 1. Helper Function to Simplify Policies
-- This function checks if a patient ID belongs to the current user
CREATE OR REPLACE FUNCTION public.check_patient_access(patient_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM patients 
    WHERE id = patient_id 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Tables that link directly to Patients
-- (Anamneses, Budgets, Procedures, Exams, Appointments, Consultations)

-- ANAMNESES
ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON anamneses;
CREATE POLICY "User access" ON anamneses FOR ALL TO authenticated
USING (check_patient_access(patient_id))
WITH CHECK (check_patient_access(patient_id));

-- CONSULTATIONS
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON consultations;
CREATE POLICY "User access" ON consultations FOR ALL TO authenticated
USING (check_patient_access(patient_id))
WITH CHECK (check_patient_access(patient_id));

-- PROCEDURES
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON procedures;
CREATE POLICY "User access" ON procedures FOR ALL TO authenticated
USING (check_patient_access(patient_id))
WITH CHECK (check_patient_access(patient_id));

-- EXAMS
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON exams;
CREATE POLICY "User access" ON exams FOR ALL TO authenticated
USING (check_patient_access(patient_id))
WITH CHECK (check_patient_access(patient_id));

-- APPOINTMENTS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON appointments;
CREATE POLICY "User access" ON appointments FOR ALL TO authenticated
USING (check_patient_access(patient_id))
WITH CHECK (check_patient_access(patient_id));

-- BUDGETS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON budgets;
CREATE POLICY "User access" ON budgets FOR ALL TO authenticated
USING (check_patient_access(patient_id))
WITH CHECK (check_patient_access(patient_id));

-- 3. Fix Tables that link to Budgets (Budget Items)
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON budget_items;
CREATE POLICY "User access" ON budget_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM budgets 
    WHERE id = budget_items.budget_id 
    AND check_patient_access(budgets.patient_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM budgets 
    WHERE id = budget_items.budget_id 
    AND check_patient_access(budgets.patient_id)
  )
);

-- 4. Fix Financial Transactions (Needs user_id for non-patient expenses)
ALTER TABLE financial_transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Claim existing orphan transactions
UPDATE financial_transactions 
SET user_id = auth.uid() 
WHERE user_id IS NULL;

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON financial_transactions;
CREATE POLICY "User access" ON financial_transactions FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- 5. Fix Config Tables (Simple ownership)
-- Financial Settings
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON financial_settings;
CREATE POLICY "User access" ON financial_settings FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Card Fee Config
ALTER TABLE card_fee_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON card_fee_config;
CREATE POLICY "User access" ON card_fee_config FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Tax Config
ALTER TABLE tax_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON tax_config;
CREATE POLICY "User access" ON tax_config FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Document Templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User access" ON document_templates;
CREATE POLICY "User access" ON document_templates FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
