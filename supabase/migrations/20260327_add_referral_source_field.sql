-- Add referral source field to track how patients found the clinic
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS referral_source text;
