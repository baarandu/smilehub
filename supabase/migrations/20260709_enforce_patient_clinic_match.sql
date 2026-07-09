-- Impede gravar registros cujo clinic_id não bate com a clínica do paciente.
-- Origem do bug: com a ficha do paciente aberta, trocar a clínica ativa fazia
-- os serviços carimbarem o clinic_id do novo contexto em registros de um
-- paciente da clínica anterior — o registro "sumia" das duas clínicas.
-- SECURITY DEFINER: a checagem precisa enxergar o paciente mesmo quando a RLS
-- da clínica ativa esconderia o cadastro da outra clínica.
create or replace function public.enforce_patient_clinic_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  patient_clinic uuid;
begin
  if new.patient_id is null or new.clinic_id is null then
    return new;
  end if;
  select clinic_id into patient_clinic from patients where id = new.patient_id;
  if patient_clinic is not null and patient_clinic <> new.clinic_id then
    raise exception 'Paciente pertence a outra clínica. Troque para a clínica correta antes de salvar (tabela: %).', tg_table_name
      using errcode = '23514';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'ai_secretary_conversations','anamneses','appointments','budgets',
    'child_anamneses','clinical_record_signatures','crm_leads',
    'dentist_agent_conversations','digital_signatures','exams',
    'financial_transactions','nfse_documents','orthodontic_cases',
    'patient_consents','patient_credits','patient_documents',
    'patient_treatment_plans','payment_receivables','procedures',
    'prosthesis_orders','signature_otp_challenges','voice_consultation_sessions'
  ]
  loop
    execute format('drop trigger if exists trg_patient_clinic_match on %I', t);
    execute format(
      'create trigger trg_patient_clinic_match before insert or update of patient_id, clinic_id on %I for each row execute function enforce_patient_clinic_match()',
      t
    );
  end loop;
end;
$$;
