-- Add drug allergy and continuous medication fields to anamneses table
-- Run this on Supabase SQL Editor

ALTER TABLE anamneses
ADD COLUMN IF NOT EXISTS drug_allergy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS drug_allergy_details TEXT,
ADD COLUMN IF NOT EXISTS continuous_medication BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS continuous_medication_details TEXT;

-- Add comment for documentation
COMMENT ON COLUMN anamneses.drug_allergy IS 'Whether the patient has any drug allergies';
COMMENT ON COLUMN anamneses.drug_allergy_details IS 'Details about the drug allergies if applicable';
COMMENT ON COLUMN anamneses.continuous_medication IS 'Whether the patient uses continuous medication';
COMMENT ON COLUMN anamneses.continuous_medication_details IS 'Details about the continuous medication if applicable';
