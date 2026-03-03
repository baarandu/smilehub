-- Fix: locations with NULL clinic_id are invisible due to RLS policy loc_select
-- The RLS policy uses "clinic_id IN (SELECT cu.clinic_id FROM clinic_users cu ...)"
-- and NULL IN (...) is never TRUE, making those locations invisible to everyone.

-- Backfill NULL clinic_id from the user's clinic (via user_id → clinic_users)
UPDATE locations l
SET clinic_id = cu.clinic_id
FROM clinic_users cu
WHERE l.clinic_id IS NULL
  AND l.user_id IS NOT NULL
  AND l.user_id = cu.user_id;

-- For any remaining locations without user_id, assign to the first clinic found
-- (single-clinic setups — safe fallback)
UPDATE locations l
SET clinic_id = (SELECT id FROM clinics LIMIT 1)
WHERE l.clinic_id IS NULL;
