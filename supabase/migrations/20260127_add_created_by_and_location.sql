-- Add created_by and location fields to track dentist and location for each record

-- BUDGETS: Add location field (created_by already exists)
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS location TEXT;

-- PROCEDURES: Add created_by field (location already exists)
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_procedures_created_by ON procedures(created_by);

-- FINANCIAL_TRANSACTIONS: Add created_by field (location and clinic_id already exist)
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_by ON financial_transactions(created_by);
