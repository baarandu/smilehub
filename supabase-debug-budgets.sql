-- DEBUG: Check budget notes content to understand status mismatch
SELECT 
    id,
    patient_id,
    date,
    status,
    notes::jsonb->'teeth' as teeth_items
FROM budgets
ORDER BY created_at DESC
LIMIT 5;
