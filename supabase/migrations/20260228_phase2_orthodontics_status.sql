-- Phase 2: Expand orthodontic case status flow
-- New flow: awaiting_documentation → documentation_received → evaluation → prior_treatment → ready_to_install → active → retention → completed (+ paused side-branch)

-- 1. Drop old CHECK constraint and recreate with new statuses
ALTER TABLE orthodontic_cases DROP CONSTRAINT IF EXISTS orthodontic_cases_status_check;
ALTER TABLE orthodontic_cases ADD CONSTRAINT orthodontic_cases_status_check
  CHECK (status IN (
    'awaiting_documentation', 'documentation_received', 'evaluation',
    'prior_treatment', 'active', 'completed', 'paused'
  ));

-- 2. Change default status
ALTER TABLE orthodontic_cases ALTER COLUMN status SET DEFAULT 'awaiting_documentation';

-- 3. Add new columns
ALTER TABLE orthodontic_cases
  ADD COLUMN IF NOT EXISTS documentation_notes text,
  ADD COLUMN IF NOT EXISTS documentation_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS prior_treatments_needed text,
  ADD COLUMN IF NOT EXISTS needs_prior_treatment boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS position int DEFAULT 0;

-- 4. Migrate existing data
UPDATE orthodontic_cases SET status = 'active' WHERE status = 'planning';
UPDATE orthodontic_cases SET status = 'active' WHERE status = 'ready_to_install';
UPDATE orthodontic_cases SET status = 'completed' WHERE status = 'retention';
