-- Add created_by column to budgets table to track which dentist created the budget
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_budgets_created_by ON budgets(created_by);

-- Update existing budgets to have the patient's user_id as created_by (fallback)
-- This uses the clinic's owner as the default creator for existing records
UPDATE budgets b
SET created_by = (
    SELECT cm.user_id
    FROM clinic_members cm
    WHERE cm.clinic_id = b.clinic_id
    AND cm.role = 'owner'
    LIMIT 1
)
WHERE b.created_by IS NULL AND b.clinic_id IS NOT NULL;
