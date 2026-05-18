-- Add dentist_id to financial_transactions to track which dentist is responsible for each revenue
ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS dentist_id uuid REFERENCES auth.users(id);

-- Backfill: for income transactions linked to budgets, use the budget's created_by as dentist_id
UPDATE financial_transactions ft
SET dentist_id = b.created_by
FROM budgets b
WHERE ft.related_entity_id = b.id
  AND ft.type = 'income'
  AND ft.dentist_id IS NULL
  AND b.created_by IS NOT NULL;

-- Backfill: for income transactions NOT linked to budgets, use user_id if that user is a dentist
UPDATE financial_transactions ft
SET dentist_id = ft.user_id
FROM clinic_users cu
WHERE ft.clinic_id = cu.clinic_id
  AND ft.user_id = cu.user_id
  AND ft.type = 'income'
  AND ft.dentist_id IS NULL
  AND ft.related_entity_id IS NULL
  AND 'dentist' = ANY(cu.roles);

-- Index for querying revenue by dentist
CREATE INDEX IF NOT EXISTS idx_financial_transactions_dentist_id
ON financial_transactions(dentist_id)
WHERE dentist_id IS NOT NULL;
