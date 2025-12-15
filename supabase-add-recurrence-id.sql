ALTER TABLE financial_transactions ADD COLUMN recurrence_id UUID DEFAULT NULL;
CREATE INDEX idx_transactions_recurrence_id ON financial_transactions(recurrence_id);
