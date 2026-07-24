-- Extend the dentist-only visibility restriction (see 20260724_dentist_only_visibility.sql)
-- to prosthesis and orthodontics cases: a dentist-only clinic member only sees orders/cases
-- where they are the assigned dentist_id or the creator. Everyone else (admin/owner, and
-- non-dentist roles) keeps seeing the whole clinic, unchanged.

DROP POLICY IF EXISTS "Clinic members can view orders" ON prosthesis_orders;
CREATE POLICY "Clinic members can view orders" ON prosthesis_orders
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
    AND (
      NOT (
        user_has_any_role(auth.uid(), prosthesis_orders.clinic_id, ARRAY['dentist'])
        AND NOT user_has_any_role(auth.uid(), prosthesis_orders.clinic_id, ARRAY['admin'])
      )
      OR dentist_id = auth.uid()
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS ortho_cases_select ON orthodontic_cases;
CREATE POLICY ortho_cases_select ON orthodontic_cases
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
    AND (
      NOT (
        user_has_any_role(auth.uid(), orthodontic_cases.clinic_id, ARRAY['dentist'])
        AND NOT user_has_any_role(auth.uid(), orthodontic_cases.clinic_id, ARRAY['admin'])
      )
      OR dentist_id = auth.uid()
      OR created_by = auth.uid()
    )
  );
