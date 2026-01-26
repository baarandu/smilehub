-- =====================================================
-- AI Secretary - Behavior Settings
-- Execute this after supabase-ai-secretary-n8n-integration.sql
-- =====================================================

-- =====================================================
-- 1. Behavior Settings Table
-- Stores all behavior customization per clinic
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_secretary_behavior (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

    -- =================================================
    -- MODULE 1: Message Behavior
    -- =================================================

    -- Status indicators
    send_typing_indicator BOOLEAN DEFAULT true,        -- Sends "typing..." indicator
    send_recording_indicator BOOLEAN DEFAULT true,     -- Sends "recording..." indicator
    mark_as_read BOOLEAN DEFAULT true,                 -- Marks messages as read

    -- Reactions
    react_to_messages BOOLEAN DEFAULT false,           -- React to patient messages
    reaction_on_appointment TEXT DEFAULT '✅',         -- Reaction when scheduling
    reaction_on_cancel TEXT DEFAULT '😢',              -- Reaction on cancellation
    reaction_on_greeting TEXT DEFAULT '👋',            -- Reaction on greeting

    -- Humanized response cadence
    response_cadence_enabled BOOLEAN DEFAULT true,     -- Enable delay before responding
    response_delay_min_ms INTEGER DEFAULT 1500,        -- Minimum delay (ms)
    response_delay_max_ms INTEGER DEFAULT 4000,        -- Maximum delay (ms)
    typing_speed_cpm INTEGER DEFAULT 300,              -- Characters per minute (simulates typing)

    -- Wait for complete messages
    wait_for_complete_message BOOLEAN DEFAULT true,    -- Wait for patient to finish typing
    wait_timeout_ms INTEGER DEFAULT 8000,              -- Wait timeout (ms)

    -- =================================================
    -- MODULE 2: Audio & Text-to-Speech
    -- =================================================

    -- Audio reception
    receive_audio_enabled BOOLEAN DEFAULT true,        -- Accept audio messages
    transcribe_audio BOOLEAN DEFAULT true,             -- Transcribe audio to text
    audio_transcription_provider TEXT DEFAULT 'openai', -- 'openai', 'google', 'local'

    -- Wait for audio completion
    wait_for_audio_complete BOOLEAN DEFAULT true,      -- Wait for audio to finish recording
    audio_wait_timeout_ms INTEGER DEFAULT 30000,       -- Audio wait timeout (30s)

    -- Audio response
    respond_with_audio BOOLEAN DEFAULT false,          -- Respond with audio
    tts_provider TEXT DEFAULT 'openai',                -- 'openai', 'elevenlabs', 'google'
    tts_voice_id TEXT DEFAULT 'shimmer',               -- TTS voice ID
    tts_speed NUMERIC(3,2) DEFAULT 1.0,                -- Speed (0.5-2.0)

    -- When to use audio
    audio_response_mode TEXT DEFAULT 'never',          -- 'always', 'when_patient_sends_audio', 'never'

    -- =================================================
    -- MODULE 3: Payments
    -- =================================================

    -- Payment links
    send_payment_links BOOLEAN DEFAULT false,          -- Send payment links
    payment_provider TEXT,                             -- 'pix', 'stripe', 'mercadopago', null

    -- PIX settings
    pix_enabled BOOLEAN DEFAULT false,
    pix_key TEXT,                                      -- PIX key
    pix_key_type TEXT,                                 -- 'cpf', 'cnpj', 'email', 'phone', 'random'
    pix_beneficiary_name TEXT,                         -- Beneficiary name

    -- Notifications
    notify_payment_received BOOLEAN DEFAULT true,      -- Notify on payment received
    auto_confirm_payment BOOLEAN DEFAULT false,        -- Auto-confirm payment

    -- Payment reminders
    send_payment_reminders BOOLEAN DEFAULT false,      -- Send payment reminders
    payment_reminder_hours INTEGER DEFAULT 24,         -- Hours before reminder

    -- Customizable messages
    payment_link_message TEXT DEFAULT 'Segue o link para pagamento da sua consulta:',
    payment_received_message TEXT DEFAULT 'Pagamento recebido com sucesso! ✅',
    payment_reminder_message TEXT DEFAULT 'Lembrete: você tem um pagamento pendente.',

    -- =================================================
    -- MODULE 4: Reminders & Alerts
    -- =================================================

    -- Appointment reminders
    send_appointment_reminders BOOLEAN DEFAULT true,
    reminder_times INTEGER[] DEFAULT '{24, 2}',        -- Hours before (24h and 2h)
    reminder_include_address BOOLEAN DEFAULT true,     -- Include address
    reminder_include_professional BOOLEAN DEFAULT true, -- Include professional name
    reminder_ask_confirmation BOOLEAN DEFAULT true,    -- Ask for confirmation

    -- Cancellation alerts
    send_cancellation_alerts BOOLEAN DEFAULT true,
    offer_reschedule_on_cancel BOOLEAN DEFAULT true,   -- Offer to reschedule

    -- Customizable messages
    reminder_message_24h TEXT DEFAULT 'Olá! Lembrete: você tem consulta amanhã às {hora} com {profissional}.',
    reminder_message_2h TEXT DEFAULT 'Sua consulta é em 2 horas! Endereço: {endereco}',
    cancellation_alert_message TEXT DEFAULT 'Sua consulta de {data} foi cancelada.',
    reschedule_offer_message TEXT DEFAULT 'Deseja remarcar para outro dia?',

    -- Post-appointment
    send_post_appointment_message BOOLEAN DEFAULT false,
    post_appointment_message TEXT DEFAULT 'Como foi sua consulta? Sua opinião é importante para nós!',
    post_appointment_delay_hours INTEGER DEFAULT 2,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure one record per clinic
    UNIQUE(clinic_id)
);

-- =====================================================
-- 2. Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ai_secretary_behavior_clinic
    ON ai_secretary_behavior(clinic_id);

-- =====================================================
-- 3. Row Level Security
-- =====================================================

ALTER TABLE ai_secretary_behavior ENABLE ROW LEVEL SECURITY;

-- Users can view their clinic's behavior settings
CREATE POLICY "Users can view own clinic behavior"
    ON ai_secretary_behavior FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    );

-- Admins can manage behavior settings
CREATE POLICY "Admins can manage behavior"
    ON ai_secretary_behavior FOR ALL
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager')
        )
    );

-- =====================================================
-- 4. Trigger for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_ai_behavior_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_secretary_behavior_updated_at
    BEFORE UPDATE ON ai_secretary_behavior
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_behavior_updated_at();

-- =====================================================
-- 5. Function: Get behavior settings for a clinic
-- =====================================================

CREATE OR REPLACE FUNCTION get_ai_secretary_behavior(p_clinic_id UUID)
RETURNS JSON AS $$
DECLARE
    v_behavior JSON;
BEGIN
    SELECT json_build_object(
        'id', b.id,
        'clinic_id', b.clinic_id,

        -- Message behavior
        'message', json_build_object(
            'send_typing_indicator', b.send_typing_indicator,
            'send_recording_indicator', b.send_recording_indicator,
            'mark_as_read', b.mark_as_read,
            'react_to_messages', b.react_to_messages,
            'reaction_on_appointment', b.reaction_on_appointment,
            'reaction_on_cancel', b.reaction_on_cancel,
            'reaction_on_greeting', b.reaction_on_greeting,
            'response_cadence_enabled', b.response_cadence_enabled,
            'response_delay_min_ms', b.response_delay_min_ms,
            'response_delay_max_ms', b.response_delay_max_ms,
            'typing_speed_cpm', b.typing_speed_cpm,
            'wait_for_complete_message', b.wait_for_complete_message,
            'wait_timeout_ms', b.wait_timeout_ms
        ),

        -- Audio settings
        'audio', json_build_object(
            'receive_audio_enabled', b.receive_audio_enabled,
            'transcribe_audio', b.transcribe_audio,
            'audio_transcription_provider', b.audio_transcription_provider,
            'wait_for_audio_complete', b.wait_for_audio_complete,
            'audio_wait_timeout_ms', b.audio_wait_timeout_ms,
            'respond_with_audio', b.respond_with_audio,
            'tts_provider', b.tts_provider,
            'tts_voice_id', b.tts_voice_id,
            'tts_speed', b.tts_speed,
            'audio_response_mode', b.audio_response_mode
        ),

        -- Payment settings
        'payment', json_build_object(
            'send_payment_links', b.send_payment_links,
            'payment_provider', b.payment_provider,
            'pix_enabled', b.pix_enabled,
            'pix_key', b.pix_key,
            'pix_key_type', b.pix_key_type,
            'pix_beneficiary_name', b.pix_beneficiary_name,
            'notify_payment_received', b.notify_payment_received,
            'auto_confirm_payment', b.auto_confirm_payment,
            'send_payment_reminders', b.send_payment_reminders,
            'payment_reminder_hours', b.payment_reminder_hours,
            'payment_link_message', b.payment_link_message,
            'payment_received_message', b.payment_received_message,
            'payment_reminder_message', b.payment_reminder_message
        ),

        -- Reminder settings
        'reminder', json_build_object(
            'send_appointment_reminders', b.send_appointment_reminders,
            'reminder_times', b.reminder_times,
            'reminder_include_address', b.reminder_include_address,
            'reminder_include_professional', b.reminder_include_professional,
            'reminder_ask_confirmation', b.reminder_ask_confirmation,
            'send_cancellation_alerts', b.send_cancellation_alerts,
            'offer_reschedule_on_cancel', b.offer_reschedule_on_cancel,
            'reminder_message_24h', b.reminder_message_24h,
            'reminder_message_2h', b.reminder_message_2h,
            'cancellation_alert_message', b.cancellation_alert_message,
            'reschedule_offer_message', b.reschedule_offer_message,
            'send_post_appointment_message', b.send_post_appointment_message,
            'post_appointment_message', b.post_appointment_message,
            'post_appointment_delay_hours', b.post_appointment_delay_hours
        )
    ) INTO v_behavior
    FROM ai_secretary_behavior b
    WHERE b.clinic_id = p_clinic_id;

    RETURN v_behavior;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. Function: Upsert behavior settings
-- =====================================================

CREATE OR REPLACE FUNCTION upsert_ai_secretary_behavior(
    p_clinic_id UUID,
    p_settings JSONB
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    INSERT INTO ai_secretary_behavior (
        clinic_id,
        -- Message behavior
        send_typing_indicator,
        send_recording_indicator,
        mark_as_read,
        react_to_messages,
        reaction_on_appointment,
        reaction_on_cancel,
        reaction_on_greeting,
        response_cadence_enabled,
        response_delay_min_ms,
        response_delay_max_ms,
        typing_speed_cpm,
        wait_for_complete_message,
        wait_timeout_ms,
        -- Audio
        receive_audio_enabled,
        transcribe_audio,
        audio_transcription_provider,
        wait_for_audio_complete,
        audio_wait_timeout_ms,
        respond_with_audio,
        tts_provider,
        tts_voice_id,
        tts_speed,
        audio_response_mode,
        -- Payment
        send_payment_links,
        payment_provider,
        pix_enabled,
        pix_key,
        pix_key_type,
        pix_beneficiary_name,
        notify_payment_received,
        auto_confirm_payment,
        send_payment_reminders,
        payment_reminder_hours,
        payment_link_message,
        payment_received_message,
        payment_reminder_message,
        -- Reminders
        send_appointment_reminders,
        reminder_times,
        reminder_include_address,
        reminder_include_professional,
        reminder_ask_confirmation,
        send_cancellation_alerts,
        offer_reschedule_on_cancel,
        reminder_message_24h,
        reminder_message_2h,
        cancellation_alert_message,
        reschedule_offer_message,
        send_post_appointment_message,
        post_appointment_message,
        post_appointment_delay_hours
    )
    VALUES (
        p_clinic_id,
        -- Message behavior
        COALESCE((p_settings->>'send_typing_indicator')::boolean, true),
        COALESCE((p_settings->>'send_recording_indicator')::boolean, true),
        COALESCE((p_settings->>'mark_as_read')::boolean, true),
        COALESCE((p_settings->>'react_to_messages')::boolean, false),
        COALESCE(p_settings->>'reaction_on_appointment', '✅'),
        COALESCE(p_settings->>'reaction_on_cancel', '😢'),
        COALESCE(p_settings->>'reaction_on_greeting', '👋'),
        COALESCE((p_settings->>'response_cadence_enabled')::boolean, true),
        COALESCE((p_settings->>'response_delay_min_ms')::integer, 1500),
        COALESCE((p_settings->>'response_delay_max_ms')::integer, 4000),
        COALESCE((p_settings->>'typing_speed_cpm')::integer, 300),
        COALESCE((p_settings->>'wait_for_complete_message')::boolean, true),
        COALESCE((p_settings->>'wait_timeout_ms')::integer, 8000),
        -- Audio
        COALESCE((p_settings->>'receive_audio_enabled')::boolean, true),
        COALESCE((p_settings->>'transcribe_audio')::boolean, true),
        COALESCE(p_settings->>'audio_transcription_provider', 'openai'),
        COALESCE((p_settings->>'wait_for_audio_complete')::boolean, true),
        COALESCE((p_settings->>'audio_wait_timeout_ms')::integer, 30000),
        COALESCE((p_settings->>'respond_with_audio')::boolean, false),
        COALESCE(p_settings->>'tts_provider', 'openai'),
        COALESCE(p_settings->>'tts_voice_id', 'shimmer'),
        COALESCE((p_settings->>'tts_speed')::numeric, 1.0),
        COALESCE(p_settings->>'audio_response_mode', 'never'),
        -- Payment
        COALESCE((p_settings->>'send_payment_links')::boolean, false),
        p_settings->>'payment_provider',
        COALESCE((p_settings->>'pix_enabled')::boolean, false),
        p_settings->>'pix_key',
        p_settings->>'pix_key_type',
        p_settings->>'pix_beneficiary_name',
        COALESCE((p_settings->>'notify_payment_received')::boolean, true),
        COALESCE((p_settings->>'auto_confirm_payment')::boolean, false),
        COALESCE((p_settings->>'send_payment_reminders')::boolean, false),
        COALESCE((p_settings->>'payment_reminder_hours')::integer, 24),
        COALESCE(p_settings->>'payment_link_message', 'Segue o link para pagamento da sua consulta:'),
        COALESCE(p_settings->>'payment_received_message', 'Pagamento recebido com sucesso! ✅'),
        COALESCE(p_settings->>'payment_reminder_message', 'Lembrete: você tem um pagamento pendente.'),
        -- Reminders
        COALESCE((p_settings->>'send_appointment_reminders')::boolean, true),
        COALESCE((SELECT array_agg(x::integer) FROM jsonb_array_elements_text(p_settings->'reminder_times') x), '{24, 2}'),
        COALESCE((p_settings->>'reminder_include_address')::boolean, true),
        COALESCE((p_settings->>'reminder_include_professional')::boolean, true),
        COALESCE((p_settings->>'reminder_ask_confirmation')::boolean, true),
        COALESCE((p_settings->>'send_cancellation_alerts')::boolean, true),
        COALESCE((p_settings->>'offer_reschedule_on_cancel')::boolean, true),
        COALESCE(p_settings->>'reminder_message_24h', 'Olá! Lembrete: você tem consulta amanhã às {hora} com {profissional}.'),
        COALESCE(p_settings->>'reminder_message_2h', 'Sua consulta é em 2 horas! Endereço: {endereco}'),
        COALESCE(p_settings->>'cancellation_alert_message', 'Sua consulta de {data} foi cancelada.'),
        COALESCE(p_settings->>'reschedule_offer_message', 'Deseja remarcar para outro dia?'),
        COALESCE((p_settings->>'send_post_appointment_message')::boolean, false),
        COALESCE(p_settings->>'post_appointment_message', 'Como foi sua consulta? Sua opinião é importante para nós!'),
        COALESCE((p_settings->>'post_appointment_delay_hours')::integer, 2)
    )
    ON CONFLICT (clinic_id) DO UPDATE SET
        -- Message behavior
        send_typing_indicator = COALESCE((p_settings->>'send_typing_indicator')::boolean, ai_secretary_behavior.send_typing_indicator),
        send_recording_indicator = COALESCE((p_settings->>'send_recording_indicator')::boolean, ai_secretary_behavior.send_recording_indicator),
        mark_as_read = COALESCE((p_settings->>'mark_as_read')::boolean, ai_secretary_behavior.mark_as_read),
        react_to_messages = COALESCE((p_settings->>'react_to_messages')::boolean, ai_secretary_behavior.react_to_messages),
        reaction_on_appointment = COALESCE(NULLIF(p_settings->>'reaction_on_appointment', ''), ai_secretary_behavior.reaction_on_appointment),
        reaction_on_cancel = COALESCE(NULLIF(p_settings->>'reaction_on_cancel', ''), ai_secretary_behavior.reaction_on_cancel),
        reaction_on_greeting = COALESCE(NULLIF(p_settings->>'reaction_on_greeting', ''), ai_secretary_behavior.reaction_on_greeting),
        response_cadence_enabled = COALESCE((p_settings->>'response_cadence_enabled')::boolean, ai_secretary_behavior.response_cadence_enabled),
        response_delay_min_ms = COALESCE((p_settings->>'response_delay_min_ms')::integer, ai_secretary_behavior.response_delay_min_ms),
        response_delay_max_ms = COALESCE((p_settings->>'response_delay_max_ms')::integer, ai_secretary_behavior.response_delay_max_ms),
        typing_speed_cpm = COALESCE((p_settings->>'typing_speed_cpm')::integer, ai_secretary_behavior.typing_speed_cpm),
        wait_for_complete_message = COALESCE((p_settings->>'wait_for_complete_message')::boolean, ai_secretary_behavior.wait_for_complete_message),
        wait_timeout_ms = COALESCE((p_settings->>'wait_timeout_ms')::integer, ai_secretary_behavior.wait_timeout_ms),
        -- Audio
        receive_audio_enabled = COALESCE((p_settings->>'receive_audio_enabled')::boolean, ai_secretary_behavior.receive_audio_enabled),
        transcribe_audio = COALESCE((p_settings->>'transcribe_audio')::boolean, ai_secretary_behavior.transcribe_audio),
        audio_transcription_provider = COALESCE(NULLIF(p_settings->>'audio_transcription_provider', ''), ai_secretary_behavior.audio_transcription_provider),
        wait_for_audio_complete = COALESCE((p_settings->>'wait_for_audio_complete')::boolean, ai_secretary_behavior.wait_for_audio_complete),
        audio_wait_timeout_ms = COALESCE((p_settings->>'audio_wait_timeout_ms')::integer, ai_secretary_behavior.audio_wait_timeout_ms),
        respond_with_audio = COALESCE((p_settings->>'respond_with_audio')::boolean, ai_secretary_behavior.respond_with_audio),
        tts_provider = COALESCE(NULLIF(p_settings->>'tts_provider', ''), ai_secretary_behavior.tts_provider),
        tts_voice_id = COALESCE(NULLIF(p_settings->>'tts_voice_id', ''), ai_secretary_behavior.tts_voice_id),
        tts_speed = COALESCE((p_settings->>'tts_speed')::numeric, ai_secretary_behavior.tts_speed),
        audio_response_mode = COALESCE(NULLIF(p_settings->>'audio_response_mode', ''), ai_secretary_behavior.audio_response_mode),
        -- Payment
        send_payment_links = COALESCE((p_settings->>'send_payment_links')::boolean, ai_secretary_behavior.send_payment_links),
        payment_provider = COALESCE(NULLIF(p_settings->>'payment_provider', ''), ai_secretary_behavior.payment_provider),
        pix_enabled = COALESCE((p_settings->>'pix_enabled')::boolean, ai_secretary_behavior.pix_enabled),
        pix_key = COALESCE(NULLIF(p_settings->>'pix_key', ''), ai_secretary_behavior.pix_key),
        pix_key_type = COALESCE(NULLIF(p_settings->>'pix_key_type', ''), ai_secretary_behavior.pix_key_type),
        pix_beneficiary_name = COALESCE(NULLIF(p_settings->>'pix_beneficiary_name', ''), ai_secretary_behavior.pix_beneficiary_name),
        notify_payment_received = COALESCE((p_settings->>'notify_payment_received')::boolean, ai_secretary_behavior.notify_payment_received),
        auto_confirm_payment = COALESCE((p_settings->>'auto_confirm_payment')::boolean, ai_secretary_behavior.auto_confirm_payment),
        send_payment_reminders = COALESCE((p_settings->>'send_payment_reminders')::boolean, ai_secretary_behavior.send_payment_reminders),
        payment_reminder_hours = COALESCE((p_settings->>'payment_reminder_hours')::integer, ai_secretary_behavior.payment_reminder_hours),
        payment_link_message = COALESCE(NULLIF(p_settings->>'payment_link_message', ''), ai_secretary_behavior.payment_link_message),
        payment_received_message = COALESCE(NULLIF(p_settings->>'payment_received_message', ''), ai_secretary_behavior.payment_received_message),
        payment_reminder_message = COALESCE(NULLIF(p_settings->>'payment_reminder_message', ''), ai_secretary_behavior.payment_reminder_message),
        -- Reminders
        send_appointment_reminders = COALESCE((p_settings->>'send_appointment_reminders')::boolean, ai_secretary_behavior.send_appointment_reminders),
        reminder_times = COALESCE((SELECT array_agg(x::integer) FROM jsonb_array_elements_text(p_settings->'reminder_times') x), ai_secretary_behavior.reminder_times),
        reminder_include_address = COALESCE((p_settings->>'reminder_include_address')::boolean, ai_secretary_behavior.reminder_include_address),
        reminder_include_professional = COALESCE((p_settings->>'reminder_include_professional')::boolean, ai_secretary_behavior.reminder_include_professional),
        reminder_ask_confirmation = COALESCE((p_settings->>'reminder_ask_confirmation')::boolean, ai_secretary_behavior.reminder_ask_confirmation),
        send_cancellation_alerts = COALESCE((p_settings->>'send_cancellation_alerts')::boolean, ai_secretary_behavior.send_cancellation_alerts),
        offer_reschedule_on_cancel = COALESCE((p_settings->>'offer_reschedule_on_cancel')::boolean, ai_secretary_behavior.offer_reschedule_on_cancel),
        reminder_message_24h = COALESCE(NULLIF(p_settings->>'reminder_message_24h', ''), ai_secretary_behavior.reminder_message_24h),
        reminder_message_2h = COALESCE(NULLIF(p_settings->>'reminder_message_2h', ''), ai_secretary_behavior.reminder_message_2h),
        cancellation_alert_message = COALESCE(NULLIF(p_settings->>'cancellation_alert_message', ''), ai_secretary_behavior.cancellation_alert_message),
        reschedule_offer_message = COALESCE(NULLIF(p_settings->>'reschedule_offer_message', ''), ai_secretary_behavior.reschedule_offer_message),
        send_post_appointment_message = COALESCE((p_settings->>'send_post_appointment_message')::boolean, ai_secretary_behavior.send_post_appointment_message),
        post_appointment_message = COALESCE(NULLIF(p_settings->>'post_appointment_message', ''), ai_secretary_behavior.post_appointment_message),
        post_appointment_delay_hours = COALESCE((p_settings->>'post_appointment_delay_hours')::integer, ai_secretary_behavior.post_appointment_delay_hours),
        updated_at = NOW()
    RETURNING json_build_object('id', id, 'clinic_id', clinic_id) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION get_ai_secretary_behavior(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_ai_secretary_behavior(UUID, JSONB) TO anon, authenticated, service_role;

-- =====================================================
-- 8. Default TTS Voices reference (for UI)
-- =====================================================

COMMENT ON TABLE ai_secretary_behavior IS '
AI Secretary Behavior Settings

Available TTS voices by provider:
- OpenAI: alloy, echo, fable, onyx, nova, shimmer
- ElevenLabs: (requires account voice IDs)
- Google: pt-BR-Standard-A, pt-BR-Standard-B, pt-BR-Wavenet-A, pt-BR-Wavenet-B

Audio response modes:
- always: Always respond with audio
- when_patient_sends_audio: Only respond with audio if patient sent audio
- never: Never respond with audio (text only)

Message placeholders:
- {hora}: Appointment time
- {data}: Appointment date
- {profissional}: Professional name
- {endereco}: Clinic address
- {paciente}: Patient name
';
