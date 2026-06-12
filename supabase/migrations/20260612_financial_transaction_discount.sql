-- Track the discount granted at payment time on each income transaction.
-- `amount` continues to store the already-discounted gross value; `discount_amount`
-- records how much was discounted so the UI can show "valor original → desconto → valor final".
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) NOT NULL DEFAULT 0;
