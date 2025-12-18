-- Add anticipation_rate column to card_fee_config table
-- Run this in your Supabase SQL Editor

-- Add anticipation rate per card fee rule (instead of global)
ALTER TABLE card_fee_config 
ADD COLUMN IF NOT EXISTS anticipation_rate NUMERIC DEFAULT NULL;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'card_fee_config';
