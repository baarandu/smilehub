-- Fix: Brazilian 9th digit mismatch between WhatsApp and local phone formats
-- Problem: WhatsApp stores numbers without the 9th digit (e.g. 557182102585)
-- but DB has the full number (e.g. 71982102585). RIGHT(9) doesn't match.
-- Solution: Add RIGHT(8) comparison to match subscriber number only.
-- Also: Update system prompt to identify patients by phone+name (not birth date).

-- 1. Fix ai_find_patient_by_phone
CREATE OR REPLACE FUNCTION ai_find_patient_by_phone(p_clinic_id UUID, p_phone TEXT)
RETURNS JSON AS $$
DECLARE
    v_patient JSON;
    v_clean_phone TEXT;
BEGIN
    v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
    IF length(v_clean_phone) >= 12 AND v_clean_phone LIKE '55%' THEN
        v_clean_phone := substring(v_clean_phone from 3);
    END IF;

    -- Brazilian mobile numbers: WhatsApp may store without the 9th digit prefix
    -- e.g. DB has (71) 98210-2585 (71982102585) but WhatsApp sends 557182102585 (7182102585)
    -- RIGHT(8) matches the subscriber number ignoring DDD and optional 9 prefix
    SELECT json_build_object(
        'found', true, 'id', p.id, 'name', p.name, 'phone', p.phone,
        'email', p.email, 'birth_date', p.birth_date,
        'health_insurance', p.health_insurance, 'notes', p.notes
    ) INTO v_patient
    FROM patients p
    WHERE p.clinic_id = p_clinic_id
    AND (
        regexp_replace(p.phone, '[^0-9]', '', 'g') = v_clean_phone
        OR regexp_replace(p.phone, '[^0-9]', '', 'g') = '55' || v_clean_phone
        OR '55' || regexp_replace(p.phone, '[^0-9]', '', 'g') = v_clean_phone
        OR RIGHT(regexp_replace(p.phone, '[^0-9]', '', 'g'), 9) = RIGHT(v_clean_phone, 9)
        OR RIGHT(regexp_replace(p.phone, '[^0-9]', '', 'g'), 8) = RIGHT(v_clean_phone, 8)
    )
    LIMIT 1;

    IF v_patient IS NULL THEN
        RETURN json_build_object('found', false, 'message', 'Paciente não encontrado com este telefone');
    END IF;
    RETURN v_patient;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix ai_create_patient dedup check
CREATE OR REPLACE FUNCTION ai_create_patient(
    p_clinic_id UUID, p_name TEXT, p_phone TEXT,
    p_birth_date DATE DEFAULT NULL, p_email TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_patient_id UUID;
    v_clean_phone TEXT;
BEGIN
    v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

    -- Match on last 8 digits to handle Brazilian 9th digit discrepancy
    -- (WhatsApp may omit the 9 prefix: 71982102585 vs 7182102585)
    SELECT id INTO v_patient_id
    FROM patients
    WHERE clinic_id = p_clinic_id
    AND RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = RIGHT(v_clean_phone, 8);

    IF v_patient_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Paciente já existe com este telefone', 'patient_id', v_patient_id);
    END IF;

    INSERT INTO patients (clinic_id, name, phone, birth_date, email, notes)
    VALUES (p_clinic_id, p_name, p_phone, p_birth_date, p_email, COALESCE(p_notes, 'Cadastrado via Secretária IA'))
    RETURNING id INTO v_patient_id;

    RETURN json_build_object('success', true, 'message', 'Paciente criado com sucesso', 'patient_id', v_patient_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update generate_ai_secretary_prompt: identify by phone+name, not birth date
CREATE OR REPLACE FUNCTION generate_ai_secretary_prompt(p_instance_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_config JSON;
    v_prompt TEXT;
    v_professionals_text TEXT;
    v_procedures_text TEXT;
    v_professional RECORD;
    v_procedure RECORD;
BEGIN
    v_config := get_ai_secretary_config(p_instance_name);

    IF NOT (v_config->>'found')::boolean THEN
        RETURN 'ERROR: ' || (v_config->>'error');
    END IF;

    v_professionals_text := '';
    FOR v_professional IN SELECT * FROM json_array_elements(v_config->'professionals')
    LOOP
        v_professionals_text := v_professionals_text || '- ' ||
            (v_professional.value->>'name') || ' - ' ||
            (v_professional.value->>'profession') || ' - ' ||
            (v_professional.value->>'specialty') ||
            ' (ID: ' || (v_professional.value->>'id') || ')' || E'\n';
    END LOOP;

    IF v_professionals_text = '' THEN
        v_professionals_text := '(Nenhum profissional cadastrado)';
    END IF;

    v_procedures_text := '';
    FOR v_procedure IN SELECT * FROM json_array_elements(v_config->'procedures')
    LOOP
        v_procedures_text := v_procedures_text || '- ' ||
            (v_procedure.value->>'name') ||
            CASE WHEN v_procedure.value->>'price' IS NOT NULL
                THEN ' - R$ ' || (v_procedure.value->>'price')
                ELSE ''
            END || E'\n';
    END LOOP;

    IF v_procedures_text = '' THEN
        v_procedures_text := '(Consultar valores na recepção)';
    END IF;

    v_prompt := format('
HOJE É: {data_atual}
TELEFONE DO CONTATO: {telefone_paciente}
CLINIC_ID: %s

## PAPEL

Você é uma atendente do WhatsApp da %s. Sua missão é atender pacientes de maneira ágil e eficiente, respondendo dúvidas e auxiliando em agendamentos, cancelamentos ou remarcações de consultas.

## PERSONALIDADE E TOM DE VOZ

- Simpática, prestativa e humana
- Tom de voz %s, acolhedor e respeitoso
%s

## FERRAMENTAS DISPONÍVEIS

Você tem acesso às seguintes ferramentas para gerenciar agendamentos:

### Buscar Paciente
- Ferramenta: buscar_paciente
- Usa o telefone do contato para identificar se já é paciente cadastrado

### Cadastrar Paciente
- Ferramenta: cadastrar_paciente
- Cadastra novo paciente com nome completo (o telefone é capturado automaticamente do WhatsApp)
- NÃO é necessário pedir data de nascimento para cadastrar — peça apenas o nome completo

### Listar Profissionais
- Ferramenta: listar_profissionais
- Lista os profissionais disponíveis para agendamento

### Buscar Horários Disponíveis
- Ferramenta: buscar_horarios
- Busca horários livres de um profissional em uma data específica
- Parâmetros: professional_id, date (formato YYYY-MM-DD)

### Criar Agendamento
- Ferramenta: criar_agendamento
- Cria um novo agendamento
- Parâmetros: patient_id, professional_id, date, time (formato HH:MM)

### Buscar Agendamentos do Paciente
- Ferramenta: minhas_consultas
- Lista agendamentos futuros do paciente

### Buscar Próximo Agendamento
- Ferramenta: proximo_agendamento
- Busca o próximo agendamento do paciente pelo telefone

### Remarcar Agendamento
- Ferramenta: remarcar_agendamento
- Remarca um agendamento existente
- Parâmetros: appointment_id, new_date, new_time

### Cancelar Agendamento
- Ferramenta: cancelar_agendamento
- Cancela um agendamento
- Parâmetros: appointment_id, reason (motivo)

### Confirmar Agendamento
- Ferramenta: confirmar_agendamento
- Confirma presença em um agendamento
- Parâmetros: appointment_id

### Enviar Arquivo
- Ferramenta: enviar_arquivo
- Envia um arquivo do sistema para o paciente via WhatsApp

## SOP (Procedimento Operacional Padrão)

### Para AGENDAR consulta:
1. Cumprimente o paciente
2. Use buscar_paciente para verificar se já é cadastrado (busca automática pelo telefone do WhatsApp)
3. Se encontrado, confirme o nome completo com o paciente antes de prosseguir
4. Se NÃO encontrado, peça apenas o nome completo do paciente e use cadastrar_paciente (o telefone já é capturado automaticamente do WhatsApp)
5. NUNCA peça data de nascimento ou CPF para identificar o paciente — use sempre o telefone do WhatsApp + confirmação do nome completo
6. Pergunte qual profissional/especialidade deseja
7. Use listar_profissionais se necessário
8. Pergunte a data de preferência
9. Use buscar_horarios para ver disponibilidade
10. Apresente os horários disponíveis
11. Use criar_agendamento após confirmação
12. Confirme os dados do agendamento

### Para REMARCAR consulta:
1. Use proximo_agendamento para encontrar o agendamento atual
2. Confirme qual agendamento deseja remarcar
3. Pergunte nova data/horário desejado
4. Use buscar_horarios para verificar disponibilidade
5. Use remarcar_agendamento
6. Confirme a remarcação

### Para CANCELAR consulta:
1. Use proximo_agendamento para encontrar o agendamento
2. Confirme qual agendamento deseja cancelar
3. Pergunte o motivo do cancelamento
4. Use cancelar_agendamento
5. Confirme o cancelamento

### Para CONFIRMAR consulta:
1. Use proximo_agendamento para encontrar o agendamento
2. Use confirmar_agendamento
3. Confirme ao paciente

## HORÁRIOS DE FUNCIONAMENTO
- %s a %s: %s às %s
- Fechado: %s

## LOCALIZAÇÃO E CONTATO
- Endereço: %s
- Telefone: %s
- WhatsApp: %s
- E-mail: %s
- Site: %s

## PROFISSIONAIS

**Use o ID do profissional nas ferramentas de agendamento**

%s

## PROCEDIMENTOS E VALORES

%s

## FORMAS DE PAGAMENTO
- %s
%s

## INSTRUÇÕES IMPORTANTES

1. SEMPRE use buscar_paciente PRIMEIRO para identificar o paciente pelo telefone do WhatsApp — NUNCA tente identificar por nome ou data de nascimento
2. Se buscar_paciente retornar um paciente, confirme o nome completo antes de prosseguir. Se o nome não bater, pode ser que outra pessoa esteja usando o mesmo telefone — pergunte e ajuste
3. Se buscar_paciente retornar "não encontrado", peça APENAS o nome completo para cadastrar. O telefone já é capturado automaticamente
4. NUNCA use cadastrar_paciente sem antes ter chamado buscar_paciente — isso evita duplicatas
5. SEMPRE use as ferramentas para operações de agenda - nunca invente informações
6. NUNCA confirme agendamento sem usar a ferramenta criar_agendamento
7. Sem diagnósticos ou opiniões médicas
8. Use "transferir_para_humano" se paciente insatisfeito ou assunto fora do escopo
9. Seja objetivo e claro nas respostas
10. Confirme sempre os dados antes de finalizar operações
',
        v_config->>'clinic_id',
        v_config->>'clinic_name',
        CASE WHEN (v_config->'settings'->>'tone') = 'formal' THEN 'formal' ELSE 'simpático' END,
        CASE WHEN (v_config->'settings'->>'tone') = 'formal'
            THEN '- Nunca use emojis ou linguagem informal'
            ELSE '- Use emojis com moderação'
        END,
        CASE WHEN (v_config->'settings'->'work_days'->>'seg')::boolean THEN 'Segunda'
             WHEN (v_config->'settings'->'work_days'->>'ter')::boolean THEN 'Terça'
             ELSE 'Segunda' END,
        CASE WHEN (v_config->'settings'->'work_days'->>'sab')::boolean THEN 'Sábado'
             WHEN (v_config->'settings'->'work_days'->>'sex')::boolean THEN 'Sexta'
             ELSE 'Sexta' END,
        v_config->'settings'->>'work_hours_start',
        v_config->'settings'->>'work_hours_end',
        CASE WHEN NOT (v_config->'settings'->'work_days'->>'dom')::boolean
                AND NOT (v_config->'settings'->'work_days'->>'sab')::boolean
            THEN 'Sábado, Domingo e Feriados'
            WHEN NOT (v_config->'settings'->'work_days'->>'dom')::boolean
            THEN 'Domingo e Feriados'
            ELSE 'Feriados' END,
        COALESCE(v_config->'contact'->>'address', 'Consultar via WhatsApp'),
        COALESCE(v_config->'contact'->>'phone', 'Não informado'),
        COALESCE(v_config->'contact'->>'whatsapp', 'Este número'),
        COALESCE(v_config->'contact'->>'email', 'Não informado'),
        COALESCE(v_config->'contact'->>'website', 'Não informado'),
        v_professionals_text,
        v_procedures_text,
        array_to_string(ARRAY(SELECT json_array_elements_text(v_config->'payment'->'methods')), ', '),
        CASE WHEN v_config->'payment'->'insurance' IS NOT NULL
            AND json_array_length(v_config->'payment'->'insurance') > 0
        THEN '- Convênios: ' || array_to_string(ARRAY(SELECT json_array_elements_text(v_config->'payment'->'insurance')), ', ')
        ELSE '- Convênios: Não atendemos' END
    );

    RETURN v_prompt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
