-- Fix recursive RLS on clinic_users that hides team members from each other.
--
-- The policies created in 20260228_p0_security_critical_fixes.sql query
-- clinic_users from within their own USING/WITH CHECK clauses. Postgres
-- evaluates the inner subquery with the same policy still active, so each
-- caller ends up only able to see their own row in any clinic — even when
-- they share that clinic with other members. Effect: the "Equipe" tab in
-- ProfileSettingsModal shows only the logged-in user, regardless of how
-- many members the clinic actually has.
--
-- Fix: use the SECURITY DEFINER helpers user_is_clinic_member() and
-- user_has_any_role() (defined in 20260220_multi_role_support.sql).
-- SECURITY DEFINER bypasses RLS inside the function, breaking the cycle.

DROP POLICY IF EXISTS "cu_select" ON clinic_users;
CREATE POLICY "cu_select" ON clinic_users FOR SELECT
  USING (
    user_is_clinic_member(auth.uid(), clinic_id)
  );

DROP POLICY IF EXISTS "cu_insert" ON clinic_users;
CREATE POLICY "cu_insert" ON clinic_users FOR INSERT
  WITH CHECK (
    user_has_any_role(auth.uid(), clinic_users.clinic_id, ARRAY['admin'])
  );

DROP POLICY IF EXISTS "cu_update" ON clinic_users;
CREATE POLICY "cu_update" ON clinic_users FOR UPDATE
  USING (
    user_has_any_role(auth.uid(), clinic_users.clinic_id, ARRAY['admin'])
  );

DROP POLICY IF EXISTS "cu_delete" ON clinic_users;
CREATE POLICY "cu_delete" ON clinic_users FOR DELETE
  USING (
    user_has_any_role(auth.uid(), clinic_users.clinic_id, ARRAY['admin'])
  );
