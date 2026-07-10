-- enforce_patient_clinic_match v2: corrigir em vez de rejeitar.
--
-- A v1 (20260709) rejeitava insert/update com clinic_id divergente da clínica
-- do paciente. Isso quebrou fluxos que não enviam clinic_id e dependem do
-- default legado get_user_clinic_id() (clínica MAIS ANTIGA do usuário, não a
-- ativa): dentista em 2+ clínicas não conseguia salvar anamnese de paciente
-- da clínica mais nova (caso Milena / Clínica Essência, 2026-07-10).
--
-- v2: o registro passa a ser carimbado com a clínica do paciente, que é a
-- verdade em qualquer cenário — inclusive no bug original de troca de clínica
-- com a ficha aberta (o registro fica visível na clínica do paciente em vez de
-- "sumir" nas duas). A RLS continua valendo: o WITH CHECK roda depois do
-- BEFORE trigger, então o usuário precisa ter papel na clínica corrigida.
create or replace function public.enforce_patient_clinic_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  patient_clinic uuid;
begin
  if new.patient_id is null then
    return new;
  end if;
  select clinic_id into patient_clinic from patients where id = new.patient_id;
  if patient_clinic is not null and new.clinic_id is distinct from patient_clinic then
    new.clinic_id := patient_clinic;
  end if;
  return new;
end;
$$;
