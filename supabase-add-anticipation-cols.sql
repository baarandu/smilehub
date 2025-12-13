-- Add missing columns for Anticipation Logic
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS anticipation_rate DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS anticipation_amount DECIMAL(10, 2);
