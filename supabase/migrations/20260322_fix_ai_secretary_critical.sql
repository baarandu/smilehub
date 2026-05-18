-- =====================================================
-- Fix AI Secretary Critical RPCs — 2026-03-22
--
-- 1. get_ai_secretary_config: procedures subquery references
--    non-existent columns (name, duration, price). The actual
--    `procedures` table is patient-level records, not a catalog.
--    Fix: pull distinct procedure_name from appointments.
--
-- 2. get_ai_secretary_behavior / upsert_ai_secretary_behavior:
--    dropped in 20260315 migration (line 446-447) but never recreated.
--
-- Safe to run multiple times (CREATE OR REPLACE).
-- =====================================================

-- ─── 1. Fix get_ai_secretary_config ────────────────────────────────────────────

DROP FUNCTION IF EXISTS get_ai_secretary_config(TEXT);

CREATE OR REPLACE FUNCTION get_ai_secretary_config(p_instance_name TEXT)
RETURNS JSON AS $$
DECLARE
    v_config JSON;
    v_clinic_id UUID;
BEGIN
    SELECT clinic_id INTO v_clinic_id
    FROM ai_secretary_settings
    WHERE evolution_instance_name = p_instance_name
    AND is_active = true;

    IF v_clinic_id IS NULL THEN
        RETURN json_build_object(
            'error', 'Clinic not found or AI Secretary not active for instance: ' || p_instance_name,
            'found', false
        );
    END IF;

    SELECT json_build_object(
        'found', true,
        'clinic_id', c.id,
        'clinic_name', c.name,
        'settings', json_build_object(
            'tone', s.tone,
            'work_hours_start', s.work_hours_start,
            'work_hours_end', s.work_hours_end,
            'work_days', s.work_days,
            'min_advance_hours', s.min_advance_hours,
            'interval_minutes', s.interval_minutes,
            'message_limit_per_conversation', s.message_limit_per_conversation,
            'human_keywords', s.human_keywords,
            'greeting_message', s.greeting_message,
            'confirmation_message', s.confirmation_message,
            'reminder_message', s.reminder_message,
            'out_of_hours_message', s.out_of_hours_message
        ),
        'contact', json_build_object(
            'phone', s.clinic_phone,
            'whatsapp', s.whatsapp_phone_number,
            'email', s.clinic_email,
            'website', s.clinic_website,
            'address', s.clinic_address
        ),
        'payment', json_build_object(
            'methods', s.payment_methods,
            'insurance', s.accepted_insurance
        ),
        'notifications', json_build_object(
            'telegram_chat_id', s.notification_telegram_chat_id,
            'email', s.notification_email
        ),
        'professionals', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', p.id,
                    'name', p.title || ' ' || p.name,
                    'specialty', p.specialty,
                    'profession', p.profession,
                    'google_calendar_id', p.google_calendar_id,
                    'appointment_duration', p.default_appointment_duration
                )
            ), '[]'::json)
            FROM clinic_professionals p
            WHERE p.clinic_id = v_clinic_id AND p.is_active = true
        ),
        'procedures', (
            SELECT COALESCE(json_agg(
                json_build_object('name', sub.procedure_name, 'price', NULL)
            ), '[]'::json)
            FROM (
                SELECT DISTINCT a.procedure_name
                FROM appointments a
                WHERE a.clinic_id = v_clinic_id
                  AND a.procedure_name IS NOT NULL
                  AND a.procedure_name != ''
            ) sub
        ),
        'blocked_numbers', (
            SELECT COALESCE(array_agg(b.phone_number), ARRAY[]::TEXT[])
            FROM ai_secretary_blocked_numbers b WHERE b.clinic_id = v_clinic_id
        ),
        'locations', (
            SELECT COALESCE(json_agg(
                json_build_object('id', l.id, 'name', l.name, 'address', l.address)
            ), '[]'::json)
            FROM locations l WHERE l.clinic_id = v_clinic_id
        ),
        'behavior', (
            SELECT COALESCE(
                json_build_object(
                    'send_typing_indicator', COALESCE(b.send_typing_indicator, true),
                    'send_recording_indicator', COALESCE(b.send_recording_indicator, true),
                    'mark_as_read', COALESCE(b.mark_as_read, true),
                    'react_to_messages', COALESCE(b.react_to_messages, false),
                    'reaction_on_appointment', COALESCE(b.reaction_on_appointment, '✅'),
                    'reaction_on_cancel', COALESCE(b.reaction_on_cancel, '😢'),
                    'reaction_on_greeting', COALESCE(b.reaction_on_greeting, '👋'),
                    'response_cadence_enabled', COALESCE(b.response_cadence_enabled, true),
                    'response_delay_min_ms', COALESCE(b.response_delay_min_ms, 1500),
                    'response_delay_max_ms', COALESCE(b.response_delay_max_ms, 4000),
                    'typing_speed_cpm', COALESCE(b.typing_speed_cpm, 300),
                    'wait_for_complete_message', COALESCE(b.wait_for_complete_message, true),
                    'wait_timeout_ms', COALESCE(b.wait_timeout_ms, 8000),
                    'receive_audio_enabled', COALESCE(b.receive_audio_enabled, true),
                    'transcribe_audio', COALESCE(b.transcribe_audio, true),
                    'audio_transcription_provider', COALESCE(b.audio_transcription_provider, 'openai'),
                    'wait_for_audio_complete', COALESCE(b.wait_for_audio_complete, true),
                    'audio_wait_timeout_ms', COALESCE(b.audio_wait_timeout_ms, 30000),
                    'respond_with_audio', COALESCE(b.respond_with_audio, false),
                    'tts_provider', COALESCE(b.tts_provider, 'openai'),
                    'tts_voice_id', COALESCE(b.tts_voice_id, 'shimmer'),
                    'tts_speed', COALESCE(b.tts_speed, 1.0),
                    'audio_response_mode', COALESCE(b.audio_response_mode, 'never'),
                    'send_payment_links', COALESCE(b.send_payment_links, false),
                    'payment_provider', b.payment_provider,
                    'pix_enabled', COALESCE(b.pix_enabled, false),
                    'pix_key', b.pix_key,
                    'pix_key_type', b.pix_key_type,
                    'pix_beneficiary_name', b.pix_beneficiary_name,
                    'notify_payment_received', COALESCE(b.notify_payment_received, true),
                    'auto_confirm_payment', COALESCE(b.auto_confirm_payment, false),
                    'send_payment_reminders', COALESCE(b.send_payment_reminders, false),
                    'payment_reminder_hours', COALESCE(b.payment_reminder_hours, 24),
                    'payment_link_message', COALESCE(b.payment_link_message, 'Segue o link para pagamento da sua consulta:'),
                    'payment_received_message', COALESCE(b.payment_received_message, 'Pagamento recebido com sucesso! ✅'),
                    'payment_reminder_message', COALESCE(b.payment_reminder_message, 'Lembrete: você tem um pagamento pendente.'),
                    'send_appointment_reminders', COALESCE(b.send_appointment_reminders, true),
                    'reminder_times', COALESCE(b.reminder_times, '{24, 2}'),
                    'reminder_include_address', COALESCE(b.reminder_include_address, true),
                    'reminder_include_professional', COALESCE(b.reminder_include_professional, true),
                    'reminder_ask_confirmation', COALESCE(b.reminder_ask_confirmation, true),
                    'send_cancellation_alerts', COALESCE(b.send_cancellation_alerts, true),
                    'offer_reschedule_on_cancel', COALESCE(b.offer_reschedule_on_cancel, true),
                    'reminder_message_24h', COALESCE(b.reminder_message_24h, 'Olá! Lembrete: você tem consulta amanhã às {hora} com {profissional}.'),
                    'reminder_message_2h', COALESCE(b.reminder_message_2h, 'Sua consulta é em 2 horas! Endereço: {endereco}'),
                    'cancellation_alert_message', COALESCE(b.cancellation_alert_message, 'Sua consulta de {data} foi cancelada.'),
                    'reschedule_offer_message', COALESCE(b.reschedule_offer_message, 'Deseja remarcar para outro dia?'),
                    'send_post_appointment_message', COALESCE(b.send_post_appointment_message, false),
                    'post_appointment_message', COALESCE(b.post_appointment_message, 'Como foi sua consulta? Sua opinião é importante para nós!'),
                    'post_appointment_delay_hours', COALESCE(b.post_appointment_delay_hours, 2)
                ),
                '{}'::json
            )
            FROM ai_secretary_behavior b WHERE b.clinic_id = v_clinic_id
        )
    ) INTO v_config
    FROM clinics c
    JOIN ai_secretary_settings s ON s.clinic_id = c.id
    WHERE c.id = v_clinic_id;

    RETURN v_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ai_secretary_config(TEXT) TO anon, authenticated, service_role;


-- ─── 2. Recreate get_ai_secretary_behavior ─────────────────────────────────────

CREATE OR REPLACE FUNCTION get_ai_secretary_behavior(p_clinic_id UUID)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT row_to_json(b)
        FROM ai_secretary_behavior b
        WHERE b.clinic_id = p_clinic_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ai_secretary_behavior(UUID) TO authenticated, service_role;


-- ─── 3. Recreate upsert_ai_secretary_behavior ──────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_ai_secretary_behavior(p_clinic_id UUID, p_data JSONB)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    INSERT INTO ai_secretary_behavior (clinic_id)
    VALUES (p_clinic_id)
    ON CONFLICT (clinic_id) DO NOTHING;

    UPDATE ai_secretary_behavior
    SET
        send_typing_indicator = COALESCE((p_data->>'send_typing_indicator')::boolean, send_typing_indicator),
        send_recording_indicator = COALESCE((p_data->>'send_recording_indicator')::boolean, send_recording_indicator),
        mark_as_read = COALESCE((p_data->>'mark_as_read')::boolean, mark_as_read),
        react_to_messages = COALESCE((p_data->>'react_to_messages')::boolean, react_to_messages),
        reaction_on_appointment = COALESCE(p_data->>'reaction_on_appointment', reaction_on_appointment),
        reaction_on_cancel = COALESCE(p_data->>'reaction_on_cancel', reaction_on_cancel),
        reaction_on_greeting = COALESCE(p_data->>'reaction_on_greeting', reaction_on_greeting),
        response_cadence_enabled = COALESCE((p_data->>'response_cadence_enabled')::boolean, response_cadence_enabled),
        response_delay_min_ms = COALESCE((p_data->>'response_delay_min_ms')::integer, response_delay_min_ms),
        response_delay_max_ms = COALESCE((p_data->>'response_delay_max_ms')::integer, response_delay_max_ms),
        typing_speed_cpm = COALESCE((p_data->>'typing_speed_cpm')::integer, typing_speed_cpm),
        wait_for_complete_message = COALESCE((p_data->>'wait_for_complete_message')::boolean, wait_for_complete_message),
        wait_timeout_ms = COALESCE((p_data->>'wait_timeout_ms')::integer, wait_timeout_ms),
        receive_audio_enabled = COALESCE((p_data->>'receive_audio_enabled')::boolean, receive_audio_enabled),
        transcribe_audio = COALESCE((p_data->>'transcribe_audio')::boolean, transcribe_audio),
        audio_transcription_provider = COALESCE(p_data->>'audio_transcription_provider', audio_transcription_provider),
        respond_with_audio = COALESCE((p_data->>'respond_with_audio')::boolean, respond_with_audio),
        tts_provider = COALESCE(p_data->>'tts_provider', tts_provider),
        tts_voice_id = COALESCE(p_data->>'tts_voice_id', tts_voice_id),
        tts_speed = COALESCE((p_data->>'tts_speed')::numeric, tts_speed),
        audio_response_mode = COALESCE(p_data->>'audio_response_mode', audio_response_mode),
        send_payment_links = COALESCE((p_data->>'send_payment_links')::boolean, send_payment_links),
        payment_provider = COALESCE(p_data->>'payment_provider', payment_provider),
        pix_enabled = COALESCE((p_data->>'pix_enabled')::boolean, pix_enabled),
        pix_key = COALESCE(p_data->>'pix_key', pix_key),
        pix_key_type = COALESCE(p_data->>'pix_key_type', pix_key_type),
        pix_beneficiary_name = COALESCE(p_data->>'pix_beneficiary_name', pix_beneficiary_name),
        send_appointment_reminders = COALESCE((p_data->>'send_appointment_reminders')::boolean, send_appointment_reminders),
        reminder_times = COALESCE((p_data->>'reminder_times')::integer[], reminder_times),
        reminder_include_address = COALESCE((p_data->>'reminder_include_address')::boolean, reminder_include_address),
        reminder_include_professional = COALESCE((p_data->>'reminder_include_professional')::boolean, reminder_include_professional),
        send_cancellation_alerts = COALESCE((p_data->>'send_cancellation_alerts')::boolean, send_cancellation_alerts),
        send_post_appointment_message = COALESCE((p_data->>'send_post_appointment_message')::boolean, send_post_appointment_message),
        post_appointment_message = COALESCE(p_data->>'post_appointment_message', post_appointment_message),
        post_appointment_delay_hours = COALESCE((p_data->>'post_appointment_delay_hours')::integer, post_appointment_delay_hours)
    WHERE clinic_id = p_clinic_id;

    SELECT row_to_json(b) INTO v_result
    FROM ai_secretary_behavior b
    WHERE b.clinic_id = p_clinic_id;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_ai_secretary_behavior(UUID, JSONB) TO authenticated, service_role;


-- ─── 4. Fix generate_ai_secretary_prompt ────────────────────────────────────────
-- payment.insurance can be JSON null (not array), causing
-- "cannot get array length of a scalar" in json_array_length().
-- Fix: check json_typeof before accessing array functions.

DROP FUNCTION IF EXISTS generate_ai_secretary_prompt(TEXT);

CREATE OR REPLACE FUNCTION generate_ai_secretary_prompt(p_instance_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_config JSON;
    v_prompt TEXT;
    v_professionals_text TEXT;
    v_procedures_text TEXT;
    v_professional RECORD;
    v_procedure RECORD;
    v_methods_text TEXT;
    v_insurance_text TEXT;
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

    -- Safe extraction of payment methods (handle null/scalar)
    IF json_typeof(v_config->'payment'->'methods') = 'array' THEN
        v_methods_text := array_to_string(ARRAY(SELECT json_array_elements_text(v_config->'payment'->'methods')), ', ');
    ELSE
        v_methods_text := 'Consultar na recepção';
    END IF;

    -- Safe extraction of insurance (handle null/scalar)
    IF json_typeof(v_config->'payment'->'insurance') = 'array'
       AND json_array_length(v_config->'payment'->'insurance') > 0 THEN
        v_insurance_text := '- Convênios: ' || array_to_string(ARRAY(SELECT json_array_elements_text(v_config->'payment'->'insurance')), ', ');
    ELSE
        v_insurance_text := '- Convênios: Não atendemos';
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
        v_methods_text,
        v_insurance_text
    );

    RETURN v_prompt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_ai_secretary_prompt(TEXT) TO anon, authenticated, service_role;
