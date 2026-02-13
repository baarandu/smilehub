-- Link procedures to budget items (supports multiple items per procedure via JSONB)
-- Format: [{"budgetId": "uuid", "toothIndex": 0}, ...]
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS budget_links jsonb;

CREATE INDEX IF NOT EXISTS idx_procedures_budget_links ON procedures USING gin(budget_links);
