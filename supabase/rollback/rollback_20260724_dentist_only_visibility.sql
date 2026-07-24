-- ROLLBACK for 20260724_dentist_only_visibility.sql
-- NOT a migration — do not put this in supabase/migrations/ (it would just re-run
-- forward). Paste into the Supabase SQL Editor manually if the dentist-only patients/
-- appointments restriction needs to be undone.
--
-- Safe to run at any time: restores the original clinic-wide SELECT policies verbatim.
-- Does NOT need to revert 20260724_add_created_by_to_patients.sql or the
-- src/services/patients.ts change — the created_by column and the frontend write are
-- inert on their own and can stay in place while this is rolled back.

DROP POLICY IF EXISTS "Users can view patients in their clinic" ON public.patients;
CREATE POLICY "Users can view patients in their clinic" ON public.patients
  FOR SELECT USING (
    user_is_clinic_member(auth.uid(), patients.clinic_id)
  );

DROP POLICY IF EXISTS "Users can view appointments in their clinic" ON public.appointments;
CREATE POLICY "Users can view appointments in their clinic" ON public.appointments
  FOR SELECT USING (
    user_is_clinic_member(auth.uid(), appointments.clinic_id)
  );
