-- =====================================================
-- ADD missing columns to appointments table
-- This script adds user_id, clinic_id, location, and procedure_name
-- if they don't already exist
-- =====================================================

-- Add user_id column if it doesn't exist
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add clinic_id column if it doesn't exist (from multi-tenant schema)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL;

-- Add location column if it doesn't exist
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS location text;

-- Add procedure_name column if it doesn't exist
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS procedure_name text;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);

-- Verify all columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'appointments'
  AND column_name IN ('user_id', 'clinic_id', 'location', 'procedure_name')
ORDER BY column_name;
