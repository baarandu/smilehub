-- Add columns for extracted procedures and budgets from voice consultation
ALTER TABLE voice_consultation_sessions
  ADD COLUMN IF NOT EXISTS extracted_procedures_data jsonb,
  ADD COLUMN IF NOT EXISTS extracted_budget_data jsonb,
  ADD COLUMN IF NOT EXISTS saved_procedure_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS saved_budget_id uuid;
