-- ROLLBACK for 20260724_dentist_only_prosthesis_ortho.sql
-- NOT a migration — do not put this in supabase/migrations/ (it would just re-run
-- forward). Paste into the Supabase SQL Editor manually if the dentist-only
-- prosthesis/orthodontics restriction needs to be undone.
--
-- Restores the original clinic-wide SELECT policies verbatim.

DROP POLICY IF EXISTS "Clinic members can view orders" ON prosthesis_orders;
CREATE POLICY "Clinic members can view orders"
    ON prosthesis_orders FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS ortho_cases_select ON orthodontic_cases;
CREATE POLICY ortho_cases_select ON orthodontic_cases
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
  );
