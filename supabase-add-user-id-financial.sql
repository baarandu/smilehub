-- Add user_id column to financial_transactions table
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Optional: Create an index for better performance on filtering by user
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_id ON public.financial_transactions(user_id);

-- Force schema cache reload (Supabase usually handles this, but creating a comment can trigger it)
COMMENT ON COLUMN public.financial_transactions.user_id IS 'Owner of the transaction';
