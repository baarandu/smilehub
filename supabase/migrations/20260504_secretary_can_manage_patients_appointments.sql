-- Permite que o role 'assistant' (Secretaria) cadastre e edite pacientes e
-- consultas. As policies originais (20260220_multi_role_support) deixaram a
-- secretaria de fora, apesar de o menu lateral expor Pacientes/Agenda para ela
-- — o banco bloqueava silenciosamente, gerando erro de RLS no cadastro.
--
-- Mantemos a secretaria fora do DELETE: ela cancela consultas via UPDATE de
-- status, e exclusao de paciente continua restrita a admin/dentista.

-- ---- patients ----
DROP POLICY IF EXISTS "Users can insert patients in their clinic" ON public.patients;
CREATE POLICY "Users can insert patients in their clinic" ON public.patients
  FOR INSERT WITH CHECK (
    user_has_any_role(auth.uid(), patients.clinic_id, ARRAY['admin', 'manager', 'dentist', 'editor', 'assistant'])
  );

DROP POLICY IF EXISTS "Users can update patients in their clinic" ON public.patients;
CREATE POLICY "Users can update patients in their clinic" ON public.patients
  FOR UPDATE USING (
    user_has_any_role(auth.uid(), patients.clinic_id, ARRAY['admin', 'manager', 'dentist', 'editor', 'assistant'])
  );

-- ---- appointments ----
DROP POLICY IF EXISTS "Users can insert appointments in their clinic" ON public.appointments;
CREATE POLICY "Users can insert appointments in their clinic" ON public.appointments
  FOR INSERT WITH CHECK (
    user_has_any_role(auth.uid(), appointments.clinic_id, ARRAY['admin', 'manager', 'dentist', 'editor', 'assistant'])
  );

DROP POLICY IF EXISTS "Users can update appointments in their clinic" ON public.appointments;
CREATE POLICY "Users can update appointments in their clinic" ON public.appointments
  FOR UPDATE USING (
    user_has_any_role(auth.uid(), appointments.clinic_id, ARRAY['admin', 'manager', 'dentist', 'editor', 'assistant'])
  );
