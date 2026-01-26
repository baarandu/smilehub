-- =====================================================
-- AI Secretary - n8n Integration for Multi-Tenant
-- Execute this after supabase-ai-secretary.sql
-- =====================================================

-- =====================================================
-- 1. Add Evolution API instance name to settings
-- This maps n8n instance name to clinic
-- =====================================================

ALTER TABLE ai_secretary_settings
ADD COLUMN IF NOT EXISTS evolution_instance_name TEXT UNIQUE;

-- Add notification settings for human escalation
ALTER TABLE ai_secretary_settings
ADD COLUMN IF NOT EXISTS notification_telegram_chat_id TEXT;
ALTER TABLE ai_secretary_settings
ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- Add clinic-specific info that goes in the prompt
ALTER TABLE ai_secretary_settings
ADD COLUMN IF NOT EXISTS clinic_phone TEXT;
ALTER TABLE ai_secretary_settings
ADD COLUMN IF NOT EXISTS clinic_address TEXT;
ALTER TABLE ai_secretary_settings
ADD COLUMN IF NOT EXISTS clinic_email TEXT;
ALTER TABLE ai_secretary_settings
ADD COLUMN IF NOT EXISTS clinic_website TEXT;
ALTER TABLE ai_secretary_settings
ADD COLUMN IF NOT EXISTS accepted_insurance TEXT[]; -- Convênios aceitos
ALTER TABLE ai_secretary_settings
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito'];

-- Create index for fast lookup by instance name
CREATE INDEX IF NOT EXISTS idx_ai_settings_evolution_instance
ON ai_secretary_settings(evolution_instance_name);

-- =====================================================
-- 2. Clinic Professionals Table
-- Stores professionals with their Google Calendar IDs
-- =====================================================

CREATE TABLE IF NOT EXISTS clinic_professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- Optional link to user account

    -- Professional info
    name TEXT NOT NULL,
    title TEXT DEFAULT 'Dr.', -- Dr., Dra., etc.
    specialty TEXT NOT NULL, -- Clínico Geral, Ortodontia, Cardiologia, etc.
    profession TEXT DEFAULT 'Dentista', -- Dentista, Médico, Fisioterapeuta, etc.

    -- Google Calendar integration
    google_calendar_id TEXT, -- e.g., c_abc123@group.calendar.google.com

    -- Scheduling rules (override clinic defaults if set)
    default_appointment_duration INTEGER DEFAULT 30, -- minutes

    -- Status
    is_active BOOLEAN DEFAULT true,
    accepts_new_patients BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clinic_professionals_clinic ON clinic_professionals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_professionals_active ON clinic_professionals(clinic_id, is_active);

-- RLS
ALTER TABLE clinic_professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their clinic professionals"
    ON clinic_professionals FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage professionals"
    ON clinic_professionals FOR ALL
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));

-- Trigger for updated_at
CREATE TRIGGER trigger_clinic_professionals_updated_at
    BEFORE UPDATE ON clinic_professionals
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_settings_updated_at();

-- =====================================================
-- 3. Function: Get clinic config by Evolution instance
-- This is what n8n will call to get all settings
-- =====================================================

CREATE OR REPLACE FUNCTION get_ai_secretary_config(p_instance_name TEXT)
RETURNS JSON AS $$
DECLARE
    v_config JSON;
    v_clinic_id UUID;
BEGIN
    -- Get clinic_id from instance name
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

    -- Build complete config
    SELECT json_build_object(
        'found', true,
        'clinic_id', c.id,
        'clinic_name', c.name,

        -- Settings
        'settings', json_build_object(
            'tone', s.tone,
            'work_hours_start', s.work_hours_start,
            'work_hours_end', s.work_hours_end,
            'work_days', s.work_days,
            'min_advance_hours', s.min_advance_hours,
            'interval_minutes', s.interval_minutes,
            'message_limit_per_conversation', s.message_limit_per_conversation,
            'human_keywords', s.human_keywords,

            -- Custom messages
            'greeting_message', s.greeting_message,
            'confirmation_message', s.confirmation_message,
            'reminder_message', s.reminder_message,
            'out_of_hours_message', s.out_of_hours_message
        ),

        -- Contact info
        'contact', json_build_object(
            'phone', s.clinic_phone,
            'whatsapp', s.whatsapp_phone_number,
            'email', s.clinic_email,
            'website', s.clinic_website,
            'address', s.clinic_address
        ),

        -- Payment
        'payment', json_build_object(
            'methods', s.payment_methods,
            'insurance', s.accepted_insurance
        ),

        -- Notifications (for human escalation)
        'notifications', json_build_object(
            'telegram_chat_id', s.notification_telegram_chat_id,
            'email', s.notification_email
        ),

        -- Professionals with calendars
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
            WHERE p.clinic_id = v_clinic_id
            AND p.is_active = true
            AND p.google_calendar_id IS NOT NULL
        ),

        -- Procedures (that AI can schedule)
        'procedures', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', pr.id,
                    'name', pr.name,
                    'duration', pr.duration,
                    'price', pr.price
                )
            ), '[]'::json)
            FROM procedures pr
            WHERE pr.clinic_id = v_clinic_id
            AND (
                s.allowed_procedure_ids = '{}'
                OR pr.id = ANY(s.allowed_procedure_ids)
            )
        ),

        -- Blocked numbers
        'blocked_numbers', (
            SELECT COALESCE(array_agg(b.phone_number), ARRAY[]::TEXT[])
            FROM ai_secretary_blocked_numbers b
            WHERE b.clinic_id = v_clinic_id
        ),

        -- Locations
        'locations', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', l.id,
                    'name', l.name,
                    'address', l.address
                )
            ), '[]'::json)
            FROM locations l
            WHERE l.clinic_id = v_clinic_id
        ),

        -- Behavior settings (from ai_secretary_behavior table)
        'behavior', (
            SELECT COALESCE(
                json_build_object(
                    -- Message behavior
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

                    -- Audio settings
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

                    -- Payment settings
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

                    -- Reminder settings
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
                -- Default values if no behavior record exists
                json_build_object(
                    'send_typing_indicator', true,
                    'send_recording_indicator', true,
                    'mark_as_read', true,
                    'react_to_messages', false,
                    'reaction_on_appointment', '✅',
                    'reaction_on_cancel', '😢',
                    'reaction_on_greeting', '👋',
                    'response_cadence_enabled', true,
                    'response_delay_min_ms', 1500,
                    'response_delay_max_ms', 4000,
                    'typing_speed_cpm', 300,
                    'wait_for_complete_message', true,
                    'wait_timeout_ms', 8000,
                    'receive_audio_enabled', true,
                    'transcribe_audio', true,
                    'audio_transcription_provider', 'openai',
                    'wait_for_audio_complete', true,
                    'audio_wait_timeout_ms', 30000,
                    'respond_with_audio', false,
                    'tts_provider', 'openai',
                    'tts_voice_id', 'shimmer',
                    'tts_speed', 1.0,
                    'audio_response_mode', 'never',
                    'send_payment_links', false,
                    'payment_provider', null,
                    'pix_enabled', false,
                    'pix_key', null,
                    'pix_key_type', null,
                    'pix_beneficiary_name', null,
                    'notify_payment_received', true,
                    'auto_confirm_payment', false,
                    'send_payment_reminders', false,
                    'payment_reminder_hours', 24,
                    'payment_link_message', 'Segue o link para pagamento da sua consulta:',
                    'payment_received_message', 'Pagamento recebido com sucesso! ✅',
                    'payment_reminder_message', 'Lembrete: você tem um pagamento pendente.',
                    'send_appointment_reminders', true,
                    'reminder_times', '{24, 2}',
                    'reminder_include_address', true,
                    'reminder_include_professional', true,
                    'reminder_ask_confirmation', true,
                    'send_cancellation_alerts', true,
                    'offer_reschedule_on_cancel', true,
                    'reminder_message_24h', 'Olá! Lembrete: você tem consulta amanhã às {hora} com {profissional}.',
                    'reminder_message_2h', 'Sua consulta é em 2 horas! Endereço: {endereco}',
                    'cancellation_alert_message', 'Sua consulta de {data} foi cancelada.',
                    'reschedule_offer_message', 'Deseja remarcar para outro dia?',
                    'send_post_appointment_message', false,
                    'post_appointment_message', 'Como foi sua consulta? Sua opinião é importante para nós!',
                    'post_appointment_delay_hours', 2
                )
            )
            FROM ai_secretary_behavior b
            WHERE b.clinic_id = v_clinic_id
        )

    ) INTO v_config
    FROM clinics c
    JOIN ai_secretary_settings s ON s.clinic_id = c.id
    WHERE c.id = v_clinic_id;

    RETURN v_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Function: Generate system prompt for n8n agent
-- Returns a complete prompt based on clinic config
-- =====================================================

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
    -- Get config
    v_config := get_ai_secretary_config(p_instance_name);

    IF NOT (v_config->>'found')::boolean THEN
        RETURN 'ERROR: ' || (v_config->>'error');
    END IF;

    -- Build professionals list
    v_professionals_text := '';
    FOR v_professional IN SELECT * FROM json_array_elements(v_config->'professionals')
    LOOP
        v_professionals_text := v_professionals_text || '- ' ||
            (v_professional.value->>'name') || ' - ' ||
            (v_professional.value->>'profession') || ' - ' ||
            (v_professional.value->>'specialty') || ' (' ||
            (v_professional.value->>'google_calendar_id') || ')' || E'\n';
    END LOOP;

    IF v_professionals_text = '' THEN
        v_professionals_text := '(Nenhum profissional cadastrado com Google Calendar)';
    END IF;

    -- Build procedures list
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

    -- Build prompt
    v_prompt := format('
HOJE É: {data_atual}
TELEFONE DO CONTATO: {telefone_paciente}

## INSTRUÇÃO IMPORTANTE
- Ao criar ou editar qualquer evento no Google Calendar, incluir sempre o telefone do paciente na descrição do agendamento, juntamente com o nome completo, data de nascimento e quaisquer outras informações relevantes fornecidas pelo paciente.

-----------------------

## PAPEL

Você é uma atendente do WhatsApp, altamente especializada, que atua em nome da %s, prestando um serviço de excelência. Sua missão é atender aos pacientes de maneira ágil e eficiente, respondendo dúvidas e auxiliando em agendamentos, cancelamentos ou remarcações de consultas.

## PERSONALIDADE E TOM DE VOZ

- Simpática, prestativa e humana
- Tom de voz %s, acolhedor e respeitoso

## OBJETIVO

1. Fornecer atendimento diferenciado e cuidadoso aos pacientes.
2. Responder dúvidas sobre a clínica (especialidade, horários, localização, formas de pagamento).
3. Agendar, remarcar e cancelar consultas de forma simples e eficaz.
4. Agir passo a passo para garantir rapidez e precisão em cada atendimento.

-----------------------

## SOP (Procedimento Operacional Padrão)

1. Início do atendimento e identificação de interesse em agendar
   - Cumprimente o paciente de forma acolhedora.
   - Se possível, incentive o envio de áudio caso o paciente prefira, destacando a praticidade

2. Solicitar dados do paciente
   - Peça nome completo e data de nascimento.
   - Confirme o telefone de contato que chegou na mensagem.
   - Ao falar o telefone para o paciente, remova o código do país (geralmente "55"), e formate como "(11) 1234-5678"

3. Identificar necessidade
   - Pergunte a data de preferência para a consulta e se o paciente tem preferência por algum turno (manhã ou tarde).

4. Verificar disponibilidade
   - Use a ferramenta de busca de eventos apenas após ter todos os dados necessários do paciente.
   - Forneça a data de preferência para obter horários disponíveis.

5. Informar disponibilidade
   - Retorne ao paciente com os horários livres encontrados para a data solicitada.

6. Agendar consulta
   - Após confirmação do paciente, crie o evento incluindo:
     - Nome completo
     - Data de nascimento
     - Telefone de contato
     - Data e hora escolhidas
   - Nunca agende datas ou horários passados, ou com conflitos.

7. Confirmar agendamento
   - Espere o retorno de sucesso da ferramenta e então confirme com o paciente.

-----------------------

## INSTRUÇÕES GERAIS

1. Respostas claras, objetivas e úteis
2. Sem diagnósticos ou opiniões médicas - use "Escalar_humano" se insistirem
3. Pacientes insatisfeitos - mantenha empatia e use "Escalar_humano"
4. Assuntos fora do escopo - direcione para atendimento humano
5. Nunca fornecer informações erradas
6. %s
7. Nunca confirme consultas sem retorno de sucesso das ferramentas
8. Dupla verificação - confirme sempre os dados
9. Use a ferramenta "Refletir" antes e depois de operações complexas

-----------------------

## HORÁRIOS DE FUNCIONAMENTO
- %s a %s: %s às %s
- Fechado: %s

## LOCALIZAÇÃO E CONTATO
- Endereço: %s
- Telefone: %s
- WhatsApp: %s
- E-mail: %s
- Site: %s

## PROFISSIONAIS E ESPECIALIDADES

**IMPORTANTE: O ID DA AGENDA INCLUI O "@group.calendar.google.com". NÃO OMITA AO UTILIZAR AS FERRAMENTAS**

%s

## PROCEDIMENTOS E VALORES

%s

## FORMAS DE PAGAMENTO
- Formas: %s
%s

-----------------------

## FERRAMENTAS

### Google Calendar
- "Criar_evento" e "Atualizar_evento": para agendar e remarcar
- "Buscar_todos_os_eventos": listar eventos de um dia específico
- "Deletar_evento": para desmarcar consultas

### Escalar_humano
Use quando:
- Existir urgência médica
- Assuntos fora do escopo da clínica
- Insatisfação do paciente
- Pedido de atendimento humano

### Reagir mensagem
Use em momentos oportunos (👀 quando buscando, ❤️ ao agradecer, etc.)

-----------------------

OBSERVAÇÕES FINAIS:
- Nunca forneça diagnósticos ou opiniões médicas
- Mantenha tom profissional e respeitoso
- Sempre agendar datas futuras, nunca passadas
- Não mencione que é assistente virtual
- Se paciente insatisfeito, escale imediatamente para humano
',
        -- Clinic name
        v_config->>'clinic_name',

        -- Tone
        CASE WHEN (v_config->'settings'->>'tone') = 'formal'
            THEN 'formal'
            ELSE 'simpático'
        END,

        -- Emoji rule based on tone
        CASE WHEN (v_config->'settings'->>'tone') = 'formal'
            THEN 'Nunca use emojis ou linguagem informal'
            ELSE 'Use emojis com moderação para deixar a conversa mais leve'
        END,

        -- Work days start
        CASE
            WHEN (v_config->'settings'->'work_days'->>'seg')::boolean THEN 'Segunda'
            WHEN (v_config->'settings'->'work_days'->>'ter')::boolean THEN 'Terça'
            WHEN (v_config->'settings'->'work_days'->>'qua')::boolean THEN 'Quarta'
            ELSE 'Segunda'
        END,

        -- Work days end
        CASE
            WHEN (v_config->'settings'->'work_days'->>'sab')::boolean THEN 'Sábado'
            WHEN (v_config->'settings'->'work_days'->>'sex')::boolean THEN 'Sexta'
            ELSE 'Sexta'
        END,

        -- Hours
        v_config->'settings'->>'work_hours_start',
        v_config->'settings'->>'work_hours_end',

        -- Closed days
        CASE
            WHEN NOT (v_config->'settings'->'work_days'->>'dom')::boolean
                AND NOT (v_config->'settings'->'work_days'->>'sab')::boolean
            THEN 'Sábado, Domingo e Feriados'
            WHEN NOT (v_config->'settings'->'work_days'->>'dom')::boolean
            THEN 'Domingo e Feriados'
            ELSE 'Feriados'
        END,

        -- Contact
        COALESCE(v_config->'contact'->>'address', 'Consultar via WhatsApp'),
        COALESCE(v_config->'contact'->>'phone', 'Não informado'),
        COALESCE(v_config->'contact'->>'whatsapp', 'Este número'),
        COALESCE(v_config->'contact'->>'email', 'Não informado'),
        COALESCE(v_config->'contact'->>'website', 'Não informado'),

        -- Professionals
        v_professionals_text,

        -- Procedures
        v_procedures_text,

        -- Payment methods
        array_to_string(ARRAY(SELECT json_array_elements_text(v_config->'payment'->'methods')), ', '),

        -- Insurance
        CASE WHEN v_config->'payment'->'insurance' IS NOT NULL
            AND json_array_length(v_config->'payment'->'insurance') > 0
        THEN '- Convênios aceitos: ' || array_to_string(ARRAY(SELECT json_array_elements_text(v_config->'payment'->'insurance')), ', ')
        ELSE '- Convênios: Não atendemos convênios'
        END
    );

    RETURN v_prompt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Function: Check if phone is blocked
-- =====================================================

CREATE OR REPLACE FUNCTION is_phone_blocked(p_instance_name TEXT, p_phone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_blocked BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM ai_secretary_blocked_numbers b
        JOIN ai_secretary_settings s ON s.clinic_id = b.clinic_id
        WHERE s.evolution_instance_name = p_instance_name
        AND b.phone_number = p_phone
    ) INTO v_blocked;

    RETURN v_blocked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Function: Log conversation start
-- =====================================================

CREATE OR REPLACE FUNCTION start_ai_conversation(
    p_instance_name TEXT,
    p_phone TEXT,
    p_contact_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_clinic_id UUID;
    v_conversation_id UUID;
BEGIN
    -- Get clinic_id
    SELECT clinic_id INTO v_clinic_id
    FROM ai_secretary_settings
    WHERE evolution_instance_name = p_instance_name;

    IF v_clinic_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Check for existing active conversation
    SELECT id INTO v_conversation_id
    FROM ai_secretary_conversations
    WHERE clinic_id = v_clinic_id
    AND phone_number = p_phone
    AND status = 'active'
    AND last_message_at > NOW() - INTERVAL '24 hours';

    IF v_conversation_id IS NOT NULL THEN
        -- Update existing conversation
        UPDATE ai_secretary_conversations
        SET last_message_at = NOW(),
            messages_count = messages_count + 1
        WHERE id = v_conversation_id;

        RETURN v_conversation_id;
    END IF;

    -- Create new conversation
    INSERT INTO ai_secretary_conversations (clinic_id, phone_number, contact_name)
    VALUES (v_clinic_id, p_phone, p_contact_name)
    RETURNING id INTO v_conversation_id;

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. Function: Log message in conversation
-- =====================================================

CREATE OR REPLACE FUNCTION log_ai_message(
    p_conversation_id UUID,
    p_sender TEXT, -- 'patient', 'ai', 'human'
    p_content TEXT,
    p_intent TEXT DEFAULT NULL,
    p_confidence DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
BEGIN
    INSERT INTO ai_secretary_messages (
        conversation_id,
        sender,
        content,
        intent_detected,
        confidence_score
    )
    VALUES (
        p_conversation_id,
        p_sender,
        p_content,
        p_intent,
        p_confidence
    )
    RETURNING id INTO v_message_id;

    -- Update conversation stats
    UPDATE ai_secretary_conversations
    SET
        last_message_at = NOW(),
        messages_count = messages_count + 1,
        ai_responses_count = CASE WHEN p_sender = 'ai'
            THEN ai_responses_count + 1
            ELSE ai_responses_count
        END
    WHERE id = p_conversation_id;

    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. Function: Mark conversation as transferred to human
-- =====================================================

CREATE OR REPLACE FUNCTION transfer_to_human(
    p_conversation_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE ai_secretary_conversations
    SET
        status = 'transferred',
        transferred_reason = p_reason,
        ended_at = NOW()
    WHERE id = p_conversation_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. Grant execute permissions to anon/authenticated
-- (for n8n using service_role key)
-- =====================================================

GRANT EXECUTE ON FUNCTION get_ai_secretary_config(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_ai_secretary_prompt(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_phone_blocked(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION start_ai_conversation(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_ai_message(UUID, TEXT, TEXT, TEXT, DECIMAL) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION transfer_to_human(UUID, TEXT) TO anon, authenticated, service_role;

-- =====================================================
-- 10. Example: Setup for a clinic
-- =====================================================

-- Uncomment and adapt to setup a clinic:
/*
-- First, get your clinic_id
-- SELECT id FROM clinics WHERE name = 'Minha Clínica';

-- Then update settings
UPDATE ai_secretary_settings SET
    evolution_instance_name = 'minha-clinica-evolution', -- Nome da instância no Evolution API
    is_active = true,
    whatsapp_phone_number = '5511999999999',
    clinic_phone = '(11) 3333-4444',
    clinic_address = 'Rua Example, 123 - Centro, São Paulo - SP',
    clinic_email = 'contato@minhaclinica.com.br',
    clinic_website = 'www.minhaclinica.com.br',
    notification_telegram_chat_id = '123456789', -- Para escalar humano
    accepted_insurance = ARRAY['Bradesco Saúde', 'Unimed', 'SulAmérica'],
    payment_methods = ARRAY['PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito']
WHERE clinic_id = 'YOUR_CLINIC_ID';

-- Add professionals
INSERT INTO clinic_professionals (clinic_id, name, title, specialty, profession, google_calendar_id)
VALUES
    ('YOUR_CLINIC_ID', 'Maria Silva', 'Dra.', 'Clínica Geral', 'Dentista', 'c_abc123@group.calendar.google.com'),
    ('YOUR_CLINIC_ID', 'João Santos', 'Dr.', 'Ortodontia', 'Dentista', 'c_def456@group.calendar.google.com');
*/
