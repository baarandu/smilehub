-- Dentist-only clinic members (role 'dentist' present, 'admin' absent) can only see
-- patients they created or have a link to (appointment/prosthesis/orthodontics with
-- dentist_id = them). Everyone else (admin/owner, and non-dentist roles like
-- assistant/editor/viewer/manager) keeps seeing the whole clinic, unchanged.
--
-- Appointments are restricted the same way: dentist-only sees their own appointments
-- plus unassigned ones (dentist_id IS NULL, e.g. walk-ins), not other dentists'.
--
-- The prosthesis/orthodontics EXISTS clauses below are required even though those
-- tables' own RLS isn't restricted yet (see 20260724_dentist_only_prosthesis_ortho.sql)
-- — otherwise the patient name lookup in Central de Prótese/Ortodontia breaks for a
-- dentist-only user as soon as the patients policy below goes into effect.

CREATE INDEX IF NOT EXISTS idx_appointments_patient_dentist ON appointments(patient_id, dentist_id);
CREATE INDEX IF NOT EXISTS idx_prosthesis_orders_patient_dentist ON prosthesis_orders(patient_id, dentist_id);
CREATE INDEX IF NOT EXISTS idx_orthodontic_cases_patient_dentist ON orthodontic_cases(patient_id, dentist_id);

DROP POLICY IF EXISTS "Users can view patients in their clinic" ON public.patients;
CREATE POLICY "Users can view patients in their clinic" ON public.patients
  FOR SELECT USING (
    user_is_clinic_member(auth.uid(), patients.clinic_id)
    AND (
      NOT (
        user_has_any_role(auth.uid(), patients.clinic_id, ARRAY['dentist'])
        AND NOT user_has_any_role(auth.uid(), patients.clinic_id, ARRAY['admin'])
      )
      OR patients.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.patient_id = patients.id AND a.dentist_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM prosthesis_orders po
        WHERE po.patient_id = patients.id AND po.dentist_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM orthodontic_cases oc
        WHERE oc.patient_id = patients.id AND oc.dentist_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can view appointments in their clinic" ON public.appointments;
CREATE POLICY "Users can view appointments in their clinic" ON public.appointments
  FOR SELECT USING (
    user_is_clinic_member(auth.uid(), appointments.clinic_id)
    AND (
      NOT (
        user_has_any_role(auth.uid(), appointments.clinic_id, ARRAY['dentist'])
        AND NOT user_has_any_role(auth.uid(), appointments.clinic_id, ARRAY['admin'])
      )
      OR appointments.dentist_id = auth.uid()
      OR appointments.dentist_id IS NULL
    )
  );
