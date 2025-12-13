-- 1. Create financial_settings table (stores global tax rate)
CREATE TABLE IF NOT EXISTS public.financial_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00, -- Global tax percentage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;

-- Policies for financial_settings
CREATE POLICY "Users can view their own settings" ON public.financial_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.financial_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.financial_settings
    FOR UPDATE USING (auth.uid() = user_id);


-- 2. Create card_fee_config table (stores rates per brand and installment)
CREATE TABLE IF NOT EXISTS public.card_fee_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    brand TEXT NOT NULL, -- 'visa', 'mastercard', 'elo', 'others'
    payment_type TEXT NOT NULL, -- 'debit', 'credit'
    installments INTEGER DEFAULT 1, -- 1 for credit sight, 2-12 for installments. 0 or 1 for debit? usually debit is just debit.
    rate DECIMAL(5, 2) NOT NULL, -- The percentage fee
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Unique constraint to avoid duplicate rules for same user/brand/installment
    UNIQUE(user_id, brand, payment_type, installments)
);

-- Enable RLS
ALTER TABLE public.card_fee_config ENABLE ROW LEVEL SECURITY;

-- Policies for card_fee_config
CREATE POLICY "Users can view their own card fees" ON public.card_fee_config
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own card fees" ON public.card_fee_config
    FOR ALL USING (auth.uid() = user_id);


-- 3. Add columns to financial_transactions to store the breakdown
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS card_fee_rate DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS card_fee_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10, 2);
