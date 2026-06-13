-- Fix multi-clinic RLS drift.
--
-- Root cause: production has legacy single-clinic RLS policies that filter by
--   clinic_id = get_user_clinic_id()
-- where get_user_clinic_id() is:
--   SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() LIMIT 1
-- i.e. ONE arbitrary clinic (no ORDER BY -> effectively the oldest membership).
-- A user who belongs to >1 clinic (e.g. a dentist with a personal clinic who was
-- later invited to a shared clinic) gets locked to their oldest clinic and cannot
-- see/insert data for the selected clinic. financial_transactions had NO
-- membership-based policy at all, so its data was completely hidden.
--
-- Fix: replace every get_user_clinic_id()-based policy with the modern,
-- membership-aware helpers already used by patients/procedures/budgets:
--   user_is_clinic_member(auth.uid(), clinic_id)
--   user_has_any_role(auth.uid(), clinic_id, ARRAY[...])
-- Per-user narrowing (e.g. dentists only seeing their own financials) stays in the
-- service layer (src/services/financial.ts), which already does it by role.

BEGIN;

-- ============================================================
-- financial_transactions  (CRITICAL — had no membership policy)
-- ============================================================
DROP POLICY IF EXISTS "User access"                 ON financial_transactions;
DROP POLICY IF EXISTS "View financial from clinic"  ON financial_transactions;
DROP POLICY IF EXISTS "Editors can insert financial" ON financial_transactions;
DROP POLICY IF EXISTS "Editors can update financial" ON financial_transactions;
DROP POLICY IF EXISTS "Admins can delete financial"  ON financial_transactions;

CREATE POLICY "ft_select" ON financial_transactions FOR SELECT
  USING (user_is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "ft_insert" ON financial_transactions FOR INSERT
  WITH CHECK (user_is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "ft_update" ON financial_transactions FOR UPDATE
  USING (user_is_clinic_member(auth.uid(), clinic_id))
  WITH CHECK (user_is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "ft_delete" ON financial_transactions FOR DELETE
  USING (user_has_any_role(auth.uid(), clinic_id, ARRAY['admin','manager']));

-- ============================================================
-- anamneses  (SELECT already OK via "User access"/check_patient_access;
--             only the get_user_clinic_id write policies were broken)
-- ============================================================
DROP POLICY IF EXISTS "View anamneses from clinic" ON anamneses;
DROP POLICY IF EXISTS "Editors can insert anamneses" ON anamneses;
DROP POLICY IF EXISTS "Editors can update anamneses" ON anamneses;
DROP POLICY IF EXISTS "Admins can delete anamneses"  ON anamneses;

CREATE POLICY "anamneses_insert" ON anamneses FOR INSERT
  WITH CHECK (user_has_any_role(auth.uid(), clinic_id, ARRAY['admin','manager','dentist','editor']));
CREATE POLICY "anamneses_update" ON anamneses FOR UPDATE
  USING (user_has_any_role(auth.uid(), clinic_id, ARRAY['admin','manager','dentist','editor']));
CREATE POLICY "anamneses_delete" ON anamneses FOR DELETE
  USING (user_has_any_role(auth.uid(), clinic_id, ARRAY['admin','manager']));

-- ============================================================
-- exams  (same situation as anamneses)
-- ============================================================
DROP POLICY IF EXISTS "View exams from clinic" ON exams;
DROP POLICY IF EXISTS "Editors can insert exams" ON exams;
DROP POLICY IF EXISTS "Editors can update exams" ON exams;
DROP POLICY IF EXISTS "Admins can delete exams"  ON exams;

CREATE POLICY "exams_insert" ON exams FOR INSERT
  WITH CHECK (user_has_any_role(auth.uid(), clinic_id, ARRAY['admin','manager','dentist','editor']));
CREATE POLICY "exams_update" ON exams FOR UPDATE
  USING (user_has_any_role(auth.uid(), clinic_id, ARRAY['admin','manager','dentist','editor']));
CREATE POLICY "exams_delete" ON exams FOR DELETE
  USING (user_has_any_role(auth.uid(), clinic_id, ARRAY['admin','manager']));

-- ============================================================
-- appointments  (modern policies already exist; just remove the
--                redundant legacy get_user_clinic_id duplicates)
-- ============================================================
DROP POLICY IF EXISTS "View appointments from clinic" ON appointments;
DROP POLICY IF EXISTS "Editors can insert appointments" ON appointments;
DROP POLICY IF EXISTS "Editors can update appointments" ON appointments;

COMMIT;
