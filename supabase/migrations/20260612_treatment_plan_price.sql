-- Subscription price for treatment plans. On enrollment a budget for this value
-- is generated so the membership fee can be approved and paid like any budget.
ALTER TABLE clinic_treatment_plans
  ADD COLUMN IF NOT EXISTS price numeric(12,2) NOT NULL DEFAULT 0;
