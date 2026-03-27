-- Add payment_status to financial_transactions for expense confirmation workflow
-- 'paid' = confirmed/paid expense, 'pending' = scheduled but not yet paid
ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid';

-- Add paid_at timestamp to track when expense was confirmed
ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Set paid_at for all existing expenses (they're all considered paid)
UPDATE financial_transactions
SET paid_at = created_at
WHERE type = 'expense' AND paid_at IS NULL;

-- Index for filtering by payment_status
CREATE INDEX IF NOT EXISTS idx_financial_transactions_payment_status
ON financial_transactions(payment_status)
WHERE type = 'expense';
