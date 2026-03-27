-- Add marital status and children fields to patients table
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS has_children boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS children_count integer;
