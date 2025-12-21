-- FIX BUDGETS STATUS COLUMN
-- The status column is missing from the budgets table, causing getPendingCount to return 0.

-- 1. Add status column with default 'pending'
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 2. Update existing budgets based on their notes JSON
-- Budgets where ALL teeth are paid/completed -> 'completed'
-- Budgets where ANY tooth is approved/paid (but not all paid) -> 'approved'
-- Budgets where ALL teeth are pending (or no notes) -> 'pending'

-- Set all to pending first as a safe default
UPDATE budgets 
SET status = 'pending' 
WHERE status IS NULL;

-- Mark budgets as 'completed' where all teeth are paid/completed
UPDATE budgets 
SET status = 'completed'
WHERE notes IS NOT NULL 
  AND notes::jsonb ? 'teeth'
  AND (
    SELECT bool_and(
      (tooth->>'status') IN ('paid', 'completed')
    )
    FROM jsonb_array_elements(notes::jsonb->'teeth') AS tooth
  ) = true;

-- Mark budgets as 'approved' where at least one tooth is approved/paid but not all completed
UPDATE budgets 
SET status = 'approved'
WHERE status = 'pending'
  AND notes IS NOT NULL 
  AND notes::jsonb ? 'teeth'
  AND (
    SELECT bool_or(
      (tooth->>'status') IN ('approved', 'paid', 'completed')
    )
    FROM jsonb_array_elements(notes::jsonb->'teeth') AS tooth
  ) = true;

-- Verify the changes
SELECT status, COUNT(*) 
FROM budgets 
GROUP BY status;
