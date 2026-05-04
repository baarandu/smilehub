-- Fix clinics_update RLS to tolerate the legacy `role` column.
--
-- Background: 20260220_multi_role_support added the `roles text[]` column and
-- backfilled it from `role`, but only for rows where roles = '{}'. Some rows
-- can still have role='admin' with roles missing 'admin' (e.g. roles was
-- explicitly set to a different array, or the backfill missed them). The
-- 20260228 policy only checks `roles && ARRAY['admin']`, so those admins
-- silently lose write access — UPDATE affects 0 rows with no error.
--
-- Fix: check BOTH columns. Also re-run the backfill defensively so admins
-- who only have `role='admin'` get 'admin' added to their roles array.

-- Defensive backfill: ensure every row's `roles` array contains its single
-- `role` value. Idempotent — only adds if missing.
UPDATE clinic_users
   SET roles = array_append(COALESCE(roles, '{}'), role)
 WHERE role IS NOT NULL
   AND NOT (COALESCE(roles, '{}') @> ARRAY[role]);

-- Update policies to accept either the legacy `role` column or the new
-- `roles` array. This keeps existing admins working even if their roles
-- array was never populated.
DROP POLICY IF EXISTS "clinics_update" ON clinics;
CREATE POLICY "clinics_update" ON clinics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinic_users cu
      WHERE cu.clinic_id = clinics.id
        AND cu.user_id = auth.uid()
        AND (cu.role = 'admin' OR cu.roles && ARRAY['admin'])
    )
  );
