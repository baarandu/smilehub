-- Link prosthesis orders to budget items (same pattern as procedures.budget_links)
-- Each prosthesis order corresponds to ONE budget item (1:1), so separate columns instead of JSONB
ALTER TABLE prosthesis_orders ADD COLUMN IF NOT EXISTS budget_id uuid REFERENCES budgets(id) ON DELETE SET NULL;
ALTER TABLE prosthesis_orders ADD COLUMN IF NOT EXISTS budget_tooth_index integer;

CREATE INDEX IF NOT EXISTS idx_prosthesis_orders_budget ON prosthesis_orders(budget_id);
