-- =====================================================
-- Add Missing Anamnese Detail Columns
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Add new detail columns for anamnese questions
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS local_anesthesia_history_details text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS pregnant_or_breastfeeding_details text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS fasting_details text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS hypertension_details text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS pacemaker_details text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS arthritis_details text;
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS gastritis_reflux_details text;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'anamneses' 
AND column_name LIKE '%details%'
ORDER BY column_name;
