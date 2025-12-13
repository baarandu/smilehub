-- Add location_rate column to budgets table
ALTER TABLE public.budgets
ADD COLUMN IF NOT EXISTS location_rate DECIMAL(5, 2) DEFAULT 0;
