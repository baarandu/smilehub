-- Add maintenance fee to orthodontic cases
ALTER TABLE orthodontic_cases ADD COLUMN IF NOT EXISTS maintenance_fee numeric(10,2);
