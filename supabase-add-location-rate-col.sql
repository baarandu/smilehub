ALTER TABLE public.budgets
ADD COLUMN IF NOT EXISTS location_rate DECIMAL(5, 2) DEFAULT 0;

-- Add location columns to financial_transactions table
ALTER TABLE public.financial_transactions
ADD COLUMN IF NOT EXISTS location_rate DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS location_amount DECIMAL(10, 2);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
