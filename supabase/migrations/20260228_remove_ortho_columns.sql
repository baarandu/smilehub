-- Remove ready_to_install and retention statuses from orthodontic flow

-- 1. Migrate existing data before constraint change
UPDATE orthodontic_cases SET status = 'active' WHERE status = 'ready_to_install';
UPDATE orthodontic_cases SET status = 'completed' WHERE status = 'retention';

-- 2. Drop and recreate CHECK constraint without removed statuses
ALTER TABLE orthodontic_cases DROP CONSTRAINT IF EXISTS orthodontic_cases_status_check;
ALTER TABLE orthodontic_cases ADD CONSTRAINT orthodontic_cases_status_check
  CHECK (status IN (
    'awaiting_documentation', 'documentation_received', 'evaluation',
    'prior_treatment', 'active', 'completed', 'paused'
  ));
