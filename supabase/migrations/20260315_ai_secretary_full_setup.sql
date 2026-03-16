-- =====================================================
-- AI Secretary - Full Setup Migration
-- Consolidates all tables, RPCs, and new features
-- Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE)
-- =====================================================

-- =====================================================
-- 1. Core Tables (IF NOT EXISTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_secretary_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT false,
    whatsapp_connected BOOLEAN DEFAULT false,
    whatsapp_phone_number TEXT,
    whatsapp_session_id TEXT,
    evolution_instance_name TEXT UNIQUE,
    tone TEXT DEFAULT 'casual' CHECK (tone IN ('casual', 'formal')),
    work_hours_start TIME DEFAULT '08:00',
    work_hours_end TIME DEFAULT '18:00',
    work_days JSONB DEFAULT '{"seg": true, "ter": true, "qua": true, "qui": true, "sex": true, "sab": false, "dom": false}',
    min_advance_hours INTEGER DEFAULT 2,
    interval_minutes INTEGER DEFAULT 30,
    allowed_procedure_ids UUID[] DEFAULT '{}',
    greeting_message TEXT DEFAULT 'Olá! Sou a assistente virtual. Como posso ajudar?',
    confirmation_message TEXT DEFAULT 'Sua consulta foi agendada com sucesso! ✅',
    reminder_message TEXT DEFAULT 'Lembrete: Você tem uma consulta amanhã às {hora}.',
    out_of_hours_message TEXT DEFAULT 'Olá! Nosso atendimento é das {inicio} às {fim}. Retornaremos em breve!',
    message_limit_per_conversation INTEGER DEFAULT 20,
    human_keywords TEXT[] DEFAULT ARRAY['atendente', 'humano', 'pessoa', 'falar com alguém'],
    clinic_phone TEXT,
    clinic_address TEXT,
    clinic_email TEXT,
    clinic_website TEXT,
    accepted_insurance TEXT[],
    payment_methods TEXT[] DEFAULT ARRAY['PIX', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito'],
    notification_telegram_chat_id TEXT,
    notification_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id)
);

CREATE TABLE IF NOT EXISTS ai_secretary_blocked_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    reason TEXT,
    blocked_by UUID REFERENCES profiles(id),
    blocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, phone_number)
);

CREATE TABLE IF NOT EXISTS ai_secretary_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    contact_name TEXT,
    patient_id UUID REFERENCES patients(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred', 'abandoned')),
    transferred_reason TEXT,
    messages_count INTEGER DEFAULT 0,
    ai_responses_count INTEGER DEFAULT 0,
    appointment_created BOOLEAN DEFAULT false,
    appointment_id UUID REFERENCES appointments(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai_secretary_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_secretary_conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('patient', 'ai', 'human')),
    content TEXT NOT NULL,
    intent_detected TEXT,
    confidence_score DECIMAL(3,2),
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_secretary_custom_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    message_key TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    is_predefined BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, message_key)
);

CREATE TABLE IF NOT EXISTS ai_secretary_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    professional_ids UUID[],
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    UNIQUE(clinic_id, day_of_week, location_id, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS ai_secretary_behavior (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    send_typing_indicator BOOLEAN DEFAULT true,
    send_recording_indicator BOOLEAN DEFAULT true,
    mark_as_read BOOLEAN DEFAULT true,
    react_to_messages BOOLEAN DEFAULT false,
    reaction_on_appointment TEXT DEFAULT '✅',
    reaction_on_cancel TEXT DEFAULT '😢',
    reaction_on_greeting TEXT DEFAULT '👋',
    response_cadence_enabled BOOLEAN DEFAULT true,
    response_delay_min_ms INTEGER DEFAULT 1500,
    response_delay_max_ms INTEGER DEFAULT 4000,
    typing_speed_cpm INTEGER DEFAULT 300,
    wait_for_complete_message BOOLEAN DEFAULT true,
    wait_timeout_ms INTEGER DEFAULT 8000,
    receive_audio_enabled BOOLEAN DEFAULT true,
    transcribe_audio BOOLEAN DEFAULT true,
    audio_transcription_provider TEXT DEFAULT 'openai',
    wait_for_audio_complete BOOLEAN DEFAULT true,
    audio_wait_timeout_ms INTEGER DEFAULT 30000,
    respond_with_audio BOOLEAN DEFAULT false,
    tts_provider TEXT DEFAULT 'openai',
    tts_voice_id TEXT DEFAULT 'shimmer',
    tts_speed NUMERIC(3,2) DEFAULT 1.0,
    audio_response_mode TEXT DEFAULT 'never',
    send_payment_links BOOLEAN DEFAULT false,
    payment_provider TEXT,
    pix_enabled BOOLEAN DEFAULT false,
    pix_key TEXT,
    pix_key_type TEXT,
    pix_beneficiary_name TEXT,
    notify_payment_received BOOLEAN DEFAULT true,
    auto_confirm_payment BOOLEAN DEFAULT false,
    send_payment_reminders BOOLEAN DEFAULT false,
    payment_reminder_hours INTEGER DEFAULT 24,
    payment_link_message TEXT DEFAULT 'Segue o link para pagamento da sua consulta:',
    payment_received_message TEXT DEFAULT 'Pagamento recebido com sucesso! ✅',
    payment_reminder_message TEXT DEFAULT 'Lembrete: você tem um pagamento pendente.',
    send_appointment_reminders BOOLEAN DEFAULT true,
    reminder_times INTEGER[] DEFAULT '{24, 2}',
    reminder_include_address BOOLEAN DEFAULT true,
    reminder_include_professional BOOLEAN DEFAULT true,
    reminder_ask_confirmation BOOLEAN DEFAULT true,
    send_cancellation_alerts BOOLEAN DEFAULT true,
    offer_reschedule_on_cancel BOOLEAN DEFAULT true,
    reminder_message_24h TEXT DEFAULT 'Olá! Lembrete: você tem consulta amanhã às {hora} com {profissional}.',
    reminder_message_2h TEXT DEFAULT 'Sua consulta é em 2 horas! Endereço: {endereco}',
    cancellation_alert_message TEXT DEFAULT 'Sua consulta de {data} foi cancelada.',
    reschedule_offer_message TEXT DEFAULT 'Deseja remarcar para outro dia?',
    send_post_appointment_message BOOLEAN DEFAULT false,
    post_appointment_message TEXT DEFAULT 'Como foi sua consulta? Sua opinião é importante para nós!',
    post_appointment_delay_hours INTEGER DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id)
);

CREATE TABLE IF NOT EXISTS clinic_professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    title TEXT DEFAULT 'Dr.',
    specialty TEXT NOT NULL,
    profession TEXT DEFAULT 'Dentista',
    google_calendar_id TEXT,
    default_appointment_duration INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    accepts_new_patients BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. New columns on existing tables
-- =====================================================

-- Dedup column on messages
ALTER TABLE ai_secretary_messages
ADD COLUMN IF NOT EXISTS external_message_id TEXT;

-- Follow-up columns on conversations
ALTER TABLE ai_secretary_conversations
ADD COLUMN IF NOT EXISTS awaiting_followup BOOLEAN DEFAULT false;

ALTER TABLE ai_secretary_conversations
ADD COLUMN IF NOT EXISTS followup_count INTEGER DEFAULT 0;

ALTER TABLE ai_secretary_conversations
ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ;

-- Reminder columns on appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT false;

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS reminder_2h_sent BOOLEAN DEFAULT false;

-- =====================================================
-- 3. New Tables: Message Queue + Concurrency Locks
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_secretary_message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    content TEXT NOT NULL,
    external_message_id TEXT,
    push_name TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_secretary_locks (
    session_id TEXT PRIMARY KEY,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    locked_by TEXT
);

-- =====================================================
-- 4. Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ai_settings_clinic ON ai_secretary_settings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_settings_evolution_instance ON ai_secretary_settings(evolution_instance_name);
CREATE INDEX IF NOT EXISTS idx_ai_blocked_clinic ON ai_secretary_blocked_numbers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_custom_messages_clinic ON ai_secretary_custom_messages(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_convos_clinic ON ai_secretary_conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_convos_phone ON ai_secretary_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_ai_convos_status ON ai_secretary_conversations(status);
CREATE INDEX IF NOT EXISTS idx_ai_convos_started ON ai_secretary_conversations(started_at);
CREATE INDEX IF NOT EXISTS idx_ai_convos_clinic_phone_status ON ai_secretary_conversations(clinic_id, phone_number, status);
CREATE INDEX IF NOT EXISTS idx_ai_convos_followup ON ai_secretary_conversations(awaiting_followup, last_followup_at) WHERE awaiting_followup = true;
CREATE INDEX IF NOT EXISTS idx_ai_messages_convo ON ai_secretary_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_external_id ON ai_secretary_messages(external_message_id) WHERE external_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_schedule_clinic ON ai_secretary_schedule(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_schedule_day ON ai_secretary_schedule(day_of_week);
CREATE INDEX IF NOT EXISTS idx_ai_behavior_clinic ON ai_secretary_behavior(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_professionals_clinic ON clinic_professionals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_professionals_active ON clinic_professionals(clinic_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_msg_queue_phone ON ai_secretary_message_queue(clinic_id, phone_number, received_at);
CREATE INDEX IF NOT EXISTS idx_appointments_reminders ON appointments(date, status) WHERE status IN ('scheduled', 'confirmed');

-- =====================================================
-- 5. RLS
-- =====================================================

ALTER TABLE ai_secretary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_blocked_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_custom_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_locks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ BEGIN
    -- Settings
    DROP POLICY IF EXISTS "Users can view their clinic AI settings" ON ai_secretary_settings;
    DROP POLICY IF EXISTS "Admins can update their clinic AI settings" ON ai_secretary_settings;
    DROP POLICY IF EXISTS "Admins can insert their clinic AI settings" ON ai_secretary_settings;
    -- Blocked
    DROP POLICY IF EXISTS "Users can view blocked numbers" ON ai_secretary_blocked_numbers;
    DROP POLICY IF EXISTS "Admins can manage blocked numbers" ON ai_secretary_blocked_numbers;
    -- Conversations
    DROP POLICY IF EXISTS "Users can view conversations" ON ai_secretary_conversations;
    -- Messages
    DROP POLICY IF EXISTS "Users can view messages" ON ai_secretary_messages;
    -- Schedule
    DROP POLICY IF EXISTS "Users can view their clinic schedule" ON ai_secretary_schedule;
    DROP POLICY IF EXISTS "Admins can manage schedule" ON ai_secretary_schedule;
    -- Behavior
    DROP POLICY IF EXISTS "Users can view own clinic behavior" ON ai_secretary_behavior;
    DROP POLICY IF EXISTS "Admins can manage behavior" ON ai_secretary_behavior;
    -- Professionals
    DROP POLICY IF EXISTS "Users can view their clinic professionals" ON clinic_professionals;
    DROP POLICY IF EXISTS "Admins can manage professionals" ON clinic_professionals;
    -- Custom Messages
    DROP POLICY IF EXISTS "Users can view custom messages" ON ai_secretary_custom_messages;
    DROP POLICY IF EXISTS "Admins can manage custom messages" ON ai_secretary_custom_messages;
    -- Queue
    DROP POLICY IF EXISTS "Service role manages queue" ON ai_secretary_message_queue;
    -- Locks
    DROP POLICY IF EXISTS "Service role manages locks" ON ai_secretary_locks;
END $$;

-- Settings
CREATE POLICY "Users can view their clinic AI settings"
    ON ai_secretary_settings FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY "Admins can update their clinic AI settings"
    ON ai_secretary_settings FOR UPDATE
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'owner')));
CREATE POLICY "Admins can insert their clinic AI settings"
    ON ai_secretary_settings FOR INSERT
    WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'owner')));

-- Blocked
CREATE POLICY "Users can view blocked numbers"
    ON ai_secretary_blocked_numbers FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage blocked numbers"
    ON ai_secretary_blocked_numbers FOR ALL
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'owner')));

-- Conversations
CREATE POLICY "Users can view conversations"
    ON ai_secretary_conversations FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- Messages
CREATE POLICY "Users can view messages"
    ON ai_secretary_messages FOR SELECT
    USING (conversation_id IN (
        SELECT id FROM ai_secretary_conversations
        WHERE clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
    ));

-- Schedule
CREATE POLICY "Users can view their clinic schedule"
    ON ai_secretary_schedule FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage schedule"
    ON ai_secretary_schedule FOR ALL
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'owner')));

-- Behavior
CREATE POLICY "Users can view own clinic behavior"
    ON ai_secretary_behavior FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage behavior"
    ON ai_secretary_behavior FOR ALL
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'owner')));

-- Professionals
CREATE POLICY "Users can view their clinic professionals"
    ON clinic_professionals FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage professionals"
    ON clinic_professionals FOR ALL
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));

-- Custom Messages
CREATE POLICY "Users can view custom messages"
    ON ai_secretary_custom_messages FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage custom messages"
    ON ai_secretary_custom_messages FOR ALL
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'owner')));

-- Queue + Locks: service_role only (no anon/authenticated access)
CREATE POLICY "Service role manages queue"
    ON ai_secretary_message_queue FOR ALL
    USING (true);
CREATE POLICY "Service role manages locks"
    ON ai_secretary_locks FOR ALL
    USING (true);

-- =====================================================
-- 6. Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_ai_secretary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_settings_updated_at ON ai_secretary_settings;
CREATE TRIGGER trigger_ai_settings_updated_at
    BEFORE UPDATE ON ai_secretary_settings
    FOR EACH ROW EXECUTE FUNCTION update_ai_secretary_updated_at();

DROP TRIGGER IF EXISTS trigger_ai_schedule_updated_at ON ai_secretary_schedule;
CREATE TRIGGER trigger_ai_schedule_updated_at
    BEFORE UPDATE ON ai_secretary_schedule
    FOR EACH ROW EXECUTE FUNCTION update_ai_secretary_updated_at();

DROP TRIGGER IF EXISTS trigger_ai_behavior_updated_at ON ai_secretary_behavior;
CREATE TRIGGER trigger_ai_behavior_updated_at
    BEFORE UPDATE ON ai_secretary_behavior
    FOR EACH ROW EXECUTE FUNCTION update_ai_secretary_updated_at();

DROP TRIGGER IF EXISTS trigger_clinic_professionals_updated_at ON clinic_professionals;
CREATE TRIGGER trigger_clinic_professionals_updated_at
    BEFORE UPDATE ON clinic_professionals
    FOR EACH ROW EXECUTE FUNCTION update_ai_secretary_updated_at();

DROP TRIGGER IF EXISTS trigger_ai_custom_messages_updated_at ON ai_secretary_custom_messages;
CREATE TRIGGER trigger_ai_custom_messages_updated_at
    BEFORE UPDATE ON ai_secretary_custom_messages
    FOR EACH ROW EXECUTE FUNCTION update_ai_secretary_updated_at();

-- Auto-clean stale locks (older than 5 minutes)
CREATE OR REPLACE FUNCTION clean_stale_ai_locks()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM ai_secretary_locks WHERE locked_at < NOW() - INTERVAL '5 minutes';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clean_stale_locks ON ai_secretary_locks;
CREATE TRIGGER trigger_clean_stale_locks
    BEFORE INSERT ON ai_secretary_locks
    FOR EACH STATEMENT EXECUTE FUNCTION clean_stale_ai_locks();

-- =====================================================
-- 7. Drop existing functions (required to change return types)
-- =====================================================

DROP FUNCTION IF EXISTS get_ai_secretary_config(TEXT);
DROP FUNCTION IF EXISTS generate_ai_secretary_prompt(TEXT);
DROP FUNCTION IF EXISTS is_phone_blocked(TEXT, TEXT);
DROP FUNCTION IF EXISTS start_ai_conversation(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS log_ai_message(UUID, TEXT, TEXT, TEXT, DECIMAL);
DROP FUNCTION IF EXISTS transfer_to_human(UUID, TEXT);
DROP FUNCTION IF EXISTS ai_find_patient_by_phone(UUID, TEXT);
DROP FUNCTION IF EXISTS ai_create_patient(UUID, TEXT, TEXT, DATE, TEXT, TEXT);
DROP FUNCTION IF EXISTS ai_list_professionals(UUID);
DROP FUNCTION IF EXISTS ai_get_available_slots(UUID, UUID, DATE, INTEGER);
DROP FUNCTION IF EXISTS ai_create_appointment(UUID, UUID, UUID, DATE, TIME, TEXT, TEXT);
DROP FUNCTION IF EXISTS ai_get_patient_appointments(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS ai_get_next_appointment(UUID, TEXT);
DROP FUNCTION IF EXISTS ai_reschedule_appointment(UUID, UUID, DATE, TIME, TEXT);
DROP FUNCTION IF EXISTS ai_cancel_appointment(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS ai_confirm_appointment(UUID, UUID);
DROP FUNCTION IF EXISTS ai_get_tomorrow_appointments(UUID);
DROP FUNCTION IF EXISTS ai_get_due_reminders(INTEGER);
DROP FUNCTION IF EXISTS ai_get_stale_leads(INTEGER);
DROP FUNCTION IF EXISTS ai_mark_awaiting_followup(UUID);
DROP FUNCTION IF EXISTS get_ai_secretary_behavior(UUID);
DROP FUNCTION IF EXISTS upsert_ai_secretary_behavior(UUID, JSONB);

-- =====================================================
-- 8. Infrastructure RPCs
-- =====================================================

-- 8a. Get config by Evolution instance
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
                json_build_object('id', pr.id, 'name', pr.name, 'duration', pr.duration, 'price', pr.price)
            ), '[]'::json)
            FROM procedures pr
            WHERE pr.clinic_id = v_clinic_id
            AND (s.allowed_procedure_ids = '{}' OR pr.id = ANY(s.allowed_procedure_ids))
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

-- 8b. Generate system prompt
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
- Cadastra novo paciente com nome, telefone e data de nascimento

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
2. Use buscar_paciente para verificar se já é cadastrado
3. Se não for cadastrado, peça nome completo e data de nascimento, depois use cadastrar_paciente
4. Pergunte qual profissional/especialidade deseja
5. Use listar_profissionais se necessário
6. Pergunte a data de preferência
7. Use buscar_horarios para ver disponibilidade
8. Apresente os horários disponíveis
9. Use criar_agendamento após confirmação
10. Confirme os dados do agendamento

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

1. SEMPRE use as ferramentas para operações de agenda - nunca invente informações
2. NUNCA confirme agendamento sem usar a ferramenta criar_agendamento
3. Sem diagnósticos ou opiniões médicas
4. Use "transferir_para_humano" se paciente insatisfeito ou assunto fora do escopo
5. Seja objetivo e claro nas respostas
6. Confirme sempre os dados antes de finalizar operações
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

-- 8c. Check blocked phone
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

-- 8d. Start / get conversation
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
    SELECT clinic_id INTO v_clinic_id
    FROM ai_secretary_settings
    WHERE evolution_instance_name = p_instance_name;

    IF v_clinic_id IS NULL THEN RETURN NULL; END IF;

    SELECT id INTO v_conversation_id
    FROM ai_secretary_conversations
    WHERE clinic_id = v_clinic_id
    AND phone_number = p_phone
    AND status = 'active'
    AND last_message_at > NOW() - INTERVAL '24 hours';

    IF v_conversation_id IS NOT NULL THEN
        UPDATE ai_secretary_conversations
        SET last_message_at = NOW(),
            messages_count = messages_count + 1,
            awaiting_followup = false
        WHERE id = v_conversation_id;
        RETURN v_conversation_id;
    END IF;

    INSERT INTO ai_secretary_conversations (clinic_id, phone_number, contact_name)
    VALUES (v_clinic_id, p_phone, p_contact_name)
    RETURNING id INTO v_conversation_id;

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8e. Log message
CREATE OR REPLACE FUNCTION log_ai_message(
    p_conversation_id UUID,
    p_sender TEXT,
    p_content TEXT,
    p_intent TEXT DEFAULT NULL,
    p_confidence DECIMAL DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_message_id UUID;
BEGIN
    INSERT INTO ai_secretary_messages (conversation_id, sender, content, intent_detected, confidence_score)
    VALUES (p_conversation_id, p_sender, p_content, p_intent, p_confidence)
    RETURNING id INTO v_message_id;

    UPDATE ai_secretary_conversations
    SET last_message_at = NOW(),
        messages_count = messages_count + 1,
        ai_responses_count = CASE WHEN p_sender = 'ai' THEN ai_responses_count + 1 ELSE ai_responses_count END
    WHERE id = p_conversation_id;

    RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8f. Transfer to human
CREATE OR REPLACE FUNCTION transfer_to_human(
    p_conversation_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE ai_secretary_conversations
    SET status = 'transferred',
        transferred_reason = p_reason,
        ended_at = NOW()
    WHERE id = p_conversation_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. Appointment RPCs
-- =====================================================

-- 9a. Find patient by phone
CREATE OR REPLACE FUNCTION ai_find_patient_by_phone(p_clinic_id UUID, p_phone TEXT)
RETURNS JSON AS $$
DECLARE
    v_patient JSON;
    v_clean_phone TEXT;
BEGIN
    v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
    IF length(v_clean_phone) = 13 AND v_clean_phone LIKE '55%' THEN
        v_clean_phone := substring(v_clean_phone from 3);
    END IF;

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
    )
    LIMIT 1;

    IF v_patient IS NULL THEN
        RETURN json_build_object('found', false, 'message', 'Paciente não encontrado com este telefone');
    END IF;
    RETURN v_patient;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9b. Create patient
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

    SELECT id INTO v_patient_id
    FROM patients
    WHERE clinic_id = p_clinic_id
    AND RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 9) = RIGHT(v_clean_phone, 9);

    IF v_patient_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Paciente já existe com este telefone', 'patient_id', v_patient_id);
    END IF;

    INSERT INTO patients (clinic_id, name, phone, birth_date, email, notes)
    VALUES (p_clinic_id, p_name, p_phone, p_birth_date, p_email, COALESCE(p_notes, 'Cadastrado via Secretária IA'))
    RETURNING id INTO v_patient_id;

    RETURN json_build_object('success', true, 'message', 'Paciente criado com sucesso', 'patient_id', v_patient_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9c. List professionals
CREATE OR REPLACE FUNCTION ai_list_professionals(p_clinic_id UUID)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', cp.id, 'user_id', cp.user_id,
                'name', cp.title || ' ' || cp.name,
                'specialty', cp.specialty, 'profession', cp.profession,
                'appointment_duration', cp.default_appointment_duration
            )
        ), '[]'::json)
        FROM clinic_professionals cp
        WHERE cp.clinic_id = p_clinic_id AND cp.is_active = true AND cp.accepts_new_patients = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9d. Get available slots
CREATE OR REPLACE FUNCTION ai_get_available_slots(
    p_clinic_id UUID, p_professional_id UUID, p_date DATE, p_duration_minutes INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
    v_professional RECORD;
    v_day_of_week INTEGER;
    v_schedule RECORD;
    v_start_time TIME;
    v_end_time TIME;
    v_current_time TIME;
    v_slots JSON[];
    v_occupied_times TEXT[];
    v_slot_available BOOLEAN;
BEGIN
    SELECT * INTO v_professional FROM clinic_professionals WHERE id = p_professional_id AND clinic_id = p_clinic_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Profissional não encontrado');
    END IF;

    v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

    SELECT start_time, end_time INTO v_schedule
    FROM ai_secretary_schedule WHERE clinic_id = p_clinic_id AND day_of_week = v_day_of_week AND is_active = true LIMIT 1;

    IF NOT FOUND THEN
        SELECT work_hours_start::TIME, work_hours_end::TIME INTO v_start_time, v_end_time
        FROM ai_secretary_settings WHERE clinic_id = p_clinic_id;
        IF NOT FOUND THEN v_start_time := '08:00'::TIME; v_end_time := '18:00'::TIME; END IF;
    ELSE
        v_start_time := v_schedule.start_time;
        v_end_time := v_schedule.end_time;
    END IF;

    IF v_start_time IS NULL THEN
        RETURN json_build_object('success', true, 'date', p_date, 'professional', v_professional.name, 'slots', '[]'::json, 'message', 'Clínica fechada neste dia');
    END IF;

    SELECT array_agg(time::TEXT) INTO v_occupied_times
    FROM appointments
    WHERE clinic_id = p_clinic_id AND user_id = v_professional.user_id AND date = p_date AND status IN ('scheduled', 'confirmed');

    IF v_occupied_times IS NULL THEN v_occupied_times := ARRAY[]::TEXT[]; END IF;

    v_current_time := v_start_time;
    v_slots := ARRAY[]::JSON[];

    WHILE v_current_time < v_end_time LOOP
        v_slot_available := NOT (v_current_time::TEXT = ANY(v_occupied_times));
        IF p_date = CURRENT_DATE AND v_current_time <= CURRENT_TIME THEN v_slot_available := false; END IF;

        IF v_slot_available THEN
            v_slots := array_append(v_slots, json_build_object('time', to_char(v_current_time, 'HH24:MI'), 'available', true));
        END IF;

        v_current_time := v_current_time + (p_duration_minutes || ' minutes')::INTERVAL;
    END LOOP;

    RETURN json_build_object(
        'success', true, 'date', p_date, 'day_name', to_char(p_date, 'TMDay'),
        'professional', v_professional.title || ' ' || v_professional.name,
        'professional_id', v_professional.id,
        'slots', to_json(v_slots), 'total_available', array_length(v_slots, 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9e. Create appointment
CREATE OR REPLACE FUNCTION ai_create_appointment(
    p_clinic_id UUID, p_patient_id UUID, p_professional_id UUID,
    p_date DATE, p_time TIME, p_procedure_name TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_professional RECORD;
    v_patient RECORD;
    v_conflict RECORD;
    v_appointment_id UUID;
    v_location TEXT;
BEGIN
    SELECT * INTO v_professional FROM clinic_professionals WHERE id = p_professional_id AND clinic_id = p_clinic_id;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Profissional não encontrado'); END IF;

    SELECT * INTO v_patient FROM patients WHERE id = p_patient_id AND clinic_id = p_clinic_id;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Paciente não encontrado'); END IF;

    IF p_date < CURRENT_DATE OR (p_date = CURRENT_DATE AND p_time <= CURRENT_TIME) THEN
        RETURN json_build_object('success', false, 'message', 'Não é possível agendar em data/hora passada');
    END IF;

    SELECT * INTO v_conflict FROM appointments
    WHERE clinic_id = p_clinic_id AND user_id = v_professional.user_id AND date = p_date AND time = p_time AND status IN ('scheduled', 'confirmed');
    IF FOUND THEN RETURN json_build_object('success', false, 'message', 'Este horário já está ocupado. Por favor, escolha outro horário.'); END IF;

    SELECT name INTO v_location FROM locations WHERE clinic_id = p_clinic_id LIMIT 1;

    INSERT INTO appointments (clinic_id, patient_id, user_id, date, time, status, procedure_name, location, notes)
    VALUES (p_clinic_id, p_patient_id, v_professional.user_id, p_date, p_time, 'scheduled',
            COALESCE(p_procedure_name, 'Consulta'), v_location, COALESCE(p_notes, 'Agendado via Secretária IA'))
    RETURNING id INTO v_appointment_id;

    UPDATE ai_secretary_conversations
    SET appointment_created = true, appointment_id = v_appointment_id
    WHERE clinic_id = p_clinic_id
    AND phone_number LIKE '%' || RIGHT(regexp_replace(v_patient.phone, '[^0-9]', '', 'g'), 9)
    AND status = 'active';

    RETURN json_build_object(
        'success', true, 'message', 'Agendamento criado com sucesso!',
        'appointment', json_build_object(
            'id', v_appointment_id,
            'patient_name', v_patient.name,
            'professional_name', v_professional.title || ' ' || v_professional.name,
            'date', to_char(p_date, 'DD/MM/YYYY'),
            'time', to_char(p_time, 'HH24:MI'),
            'day_name', to_char(p_date, 'TMDay'),
            'procedure', COALESCE(p_procedure_name, 'Consulta'),
            'location', v_location
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9f. Get patient appointments
CREATE OR REPLACE FUNCTION ai_get_patient_appointments(p_clinic_id UUID, p_patient_id UUID, p_include_past BOOLEAN DEFAULT false)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', a.id, 'date', to_char(a.date, 'DD/MM/YYYY'), 'date_iso', a.date,
                'time', to_char(a.time, 'HH24:MI'), 'day_name', to_char(a.date, 'TMDay'),
                'status', a.status,
                'status_label', CASE a.status
                    WHEN 'scheduled' THEN 'Agendado' WHEN 'confirmed' THEN 'Confirmado'
                    WHEN 'completed' THEN 'Realizado' WHEN 'cancelled' THEN 'Cancelado' ELSE a.status END,
                'procedure', a.procedure_name,
                'professional', cp.title || ' ' || cp.name,
                'location', a.location, 'notes', a.notes
            ) ORDER BY a.date DESC, a.time DESC
        ), '[]'::json)
        FROM appointments a
        LEFT JOIN clinic_professionals cp ON cp.user_id = a.user_id AND cp.clinic_id = a.clinic_id
        WHERE a.clinic_id = p_clinic_id AND a.patient_id = p_patient_id
        AND (p_include_past OR a.date >= CURRENT_DATE) AND a.status != 'cancelled'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9g. Get next appointment
CREATE OR REPLACE FUNCTION ai_get_next_appointment(p_clinic_id UUID, p_phone TEXT)
RETURNS JSON AS $$
DECLARE
    v_patient_id UUID;
    v_clean_phone TEXT;
    v_appointment JSON;
BEGIN
    v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

    SELECT id INTO v_patient_id FROM patients
    WHERE clinic_id = p_clinic_id
    AND RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 9) = RIGHT(v_clean_phone, 9);

    IF v_patient_id IS NULL THEN
        RETURN json_build_object('found', false, 'message', 'Paciente não encontrado');
    END IF;

    SELECT json_build_object(
        'found', true, 'id', a.id,
        'date', to_char(a.date, 'DD/MM/YYYY'), 'date_iso', a.date,
        'time', to_char(a.time, 'HH24:MI'), 'day_name', to_char(a.date, 'TMDay'),
        'status', a.status, 'procedure', a.procedure_name,
        'professional', cp.title || ' ' || cp.name, 'professional_id', cp.id, 'location', a.location
    ) INTO v_appointment
    FROM appointments a
    LEFT JOIN clinic_professionals cp ON cp.user_id = a.user_id AND cp.clinic_id = a.clinic_id
    WHERE a.clinic_id = p_clinic_id AND a.patient_id = v_patient_id
    AND a.date >= CURRENT_DATE AND a.status IN ('scheduled', 'confirmed')
    ORDER BY a.date, a.time LIMIT 1;

    IF v_appointment IS NULL THEN
        RETURN json_build_object('found', false, 'message', 'Nenhum agendamento futuro encontrado');
    END IF;
    RETURN v_appointment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9h. Reschedule appointment
CREATE OR REPLACE FUNCTION ai_reschedule_appointment(
    p_clinic_id UUID, p_appointment_id UUID, p_new_date DATE, p_new_time TIME, p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_appointment RECORD;
    v_conflict RECORD;
BEGIN
    SELECT a.*, p.name as patient_name, cp.title || ' ' || cp.name as professional_name
    INTO v_appointment
    FROM appointments a JOIN patients p ON p.id = a.patient_id
    LEFT JOIN clinic_professionals cp ON cp.user_id = a.user_id AND cp.clinic_id = a.clinic_id
    WHERE a.id = p_appointment_id AND a.clinic_id = p_clinic_id;

    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Agendamento não encontrado'); END IF;
    IF v_appointment.status = 'cancelled' THEN RETURN json_build_object('success', false, 'message', 'Este agendamento já foi cancelado'); END IF;
    IF p_new_date < CURRENT_DATE OR (p_new_date = CURRENT_DATE AND p_new_time <= CURRENT_TIME) THEN
        RETURN json_build_object('success', false, 'message', 'Não é possível remarcar para data/hora passada');
    END IF;

    SELECT * INTO v_conflict FROM appointments
    WHERE clinic_id = p_clinic_id AND user_id = v_appointment.user_id AND date = p_new_date AND time = p_new_time
    AND id != p_appointment_id AND status IN ('scheduled', 'confirmed');
    IF FOUND THEN RETURN json_build_object('success', false, 'message', 'O novo horário já está ocupado. Por favor, escolha outro.'); END IF;

    UPDATE appointments SET date = p_new_date, time = p_new_time, status = 'scheduled',
        notes = COALESCE(p_notes, notes, '') || ' | Remarcado via Secretária IA em ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI')
    WHERE id = p_appointment_id;

    RETURN json_build_object(
        'success', true, 'message', 'Agendamento remarcado com sucesso!',
        'appointment', json_build_object(
            'id', p_appointment_id, 'patient_name', v_appointment.patient_name,
            'professional_name', v_appointment.professional_name,
            'old_date', to_char(v_appointment.date, 'DD/MM/YYYY'), 'old_time', to_char(v_appointment.time, 'HH24:MI'),
            'new_date', to_char(p_new_date, 'DD/MM/YYYY'), 'new_time', to_char(p_new_time, 'HH24:MI'),
            'new_day_name', to_char(p_new_date, 'TMDay')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9i. Cancel appointment
CREATE OR REPLACE FUNCTION ai_cancel_appointment(p_clinic_id UUID, p_appointment_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_appointment RECORD;
BEGIN
    SELECT a.*, p.name as patient_name, cp.title || ' ' || cp.name as professional_name
    INTO v_appointment
    FROM appointments a JOIN patients p ON p.id = a.patient_id
    LEFT JOIN clinic_professionals cp ON cp.user_id = a.user_id AND cp.clinic_id = a.clinic_id
    WHERE a.id = p_appointment_id AND a.clinic_id = p_clinic_id;

    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Agendamento não encontrado'); END IF;
    IF v_appointment.status = 'cancelled' THEN RETURN json_build_object('success', false, 'message', 'Este agendamento já está cancelado'); END IF;
    IF v_appointment.status = 'completed' THEN RETURN json_build_object('success', false, 'message', 'Não é possível cancelar um agendamento já realizado'); END IF;

    UPDATE appointments SET status = 'cancelled',
        notes = COALESCE(notes, '') || ' | Cancelado via Secretária IA: ' || COALESCE(p_reason, 'Não informado') || ' em ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI')
    WHERE id = p_appointment_id;

    RETURN json_build_object(
        'success', true, 'message', 'Agendamento cancelado com sucesso',
        'cancelled_appointment', json_build_object(
            'id', p_appointment_id, 'patient_name', v_appointment.patient_name,
            'professional_name', v_appointment.professional_name,
            'date', to_char(v_appointment.date, 'DD/MM/YYYY'), 'time', to_char(v_appointment.time, 'HH24:MI'),
            'reason', COALESCE(p_reason, 'Não informado')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9j. Confirm appointment
CREATE OR REPLACE FUNCTION ai_confirm_appointment(p_clinic_id UUID, p_appointment_id UUID)
RETURNS JSON AS $$
DECLARE
    v_appointment RECORD;
BEGIN
    SELECT a.*, p.name as patient_name, cp.title || ' ' || cp.name as professional_name
    INTO v_appointment
    FROM appointments a JOIN patients p ON p.id = a.patient_id
    LEFT JOIN clinic_professionals cp ON cp.user_id = a.user_id AND cp.clinic_id = a.clinic_id
    WHERE a.id = p_appointment_id AND a.clinic_id = p_clinic_id;

    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Agendamento não encontrado'); END IF;
    IF v_appointment.status = 'cancelled' THEN RETURN json_build_object('success', false, 'message', 'Este agendamento foi cancelado'); END IF;
    IF v_appointment.status = 'confirmed' THEN
        RETURN json_build_object('success', true, 'message', 'Agendamento já está confirmado',
            'appointment', json_build_object('id', p_appointment_id, 'date', to_char(v_appointment.date, 'DD/MM/YYYY'), 'time', to_char(v_appointment.time, 'HH24:MI')));
    END IF;

    UPDATE appointments SET status = 'confirmed',
        notes = COALESCE(notes, '') || ' | Confirmado via Secretária IA em ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI')
    WHERE id = p_appointment_id;

    RETURN json_build_object(
        'success', true, 'message', 'Agendamento confirmado com sucesso!',
        'appointment', json_build_object(
            'id', p_appointment_id, 'patient_name', v_appointment.patient_name,
            'professional_name', v_appointment.professional_name,
            'date', to_char(v_appointment.date, 'DD/MM/YYYY'), 'time', to_char(v_appointment.time, 'HH24:MI'),
            'day_name', to_char(v_appointment.date, 'TMDay')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9k. Get tomorrow appointments (for confirmations)
CREATE OR REPLACE FUNCTION ai_get_tomorrow_appointments(p_clinic_id UUID)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(
            json_build_object(
                'id', a.id, 'patient_name', p.name, 'patient_phone', p.phone,
                'date', to_char(a.date, 'DD/MM/YYYY'), 'time', to_char(a.time, 'HH24:MI'),
                'professional', cp.title || ' ' || cp.name, 'procedure', a.procedure_name, 'status', a.status
            ) ORDER BY a.time
        ), '[]'::json)
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        LEFT JOIN clinic_professionals cp ON cp.user_id = a.user_id AND cp.clinic_id = a.clinic_id
        WHERE a.clinic_id = p_clinic_id AND a.date = CURRENT_DATE + INTERVAL '1 day'
        AND a.status IN ('scheduled', 'confirmed')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. New RPCs: Reminders & Lead Recovery
-- =====================================================

-- 10a. Get due reminders (for appointment-reminders Edge Function)
CREATE OR REPLACE FUNCTION ai_get_due_reminders(p_hours_before INTEGER)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
        FROM (
            SELECT
                a.id AS appointment_id,
                a.date,
                a.time,
                a.status,
                a.procedure_name,
                a.location,
                a.reminder_24h_sent,
                a.reminder_2h_sent,
                p.id AS patient_id,
                p.name AS patient_name,
                p.phone AS patient_phone,
                cp.id AS professional_id,
                cp.title || ' ' || cp.name AS professional_name,
                s.evolution_instance_name,
                s.clinic_address,
                b.send_appointment_reminders,
                b.reminder_times,
                b.reminder_include_address,
                b.reminder_include_professional,
                b.reminder_ask_confirmation,
                b.reminder_message_24h,
                b.reminder_message_2h
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            JOIN ai_secretary_settings s ON s.clinic_id = a.clinic_id AND s.is_active = true
            LEFT JOIN ai_secretary_behavior b ON b.clinic_id = a.clinic_id
            LEFT JOIN clinic_professionals cp ON cp.user_id = a.user_id AND cp.clinic_id = a.clinic_id
            WHERE a.status IN ('scheduled', 'confirmed')
            AND a.date >= CURRENT_DATE
            AND (a.date + a.time) BETWEEN NOW() AND NOW() + (p_hours_before || ' hours')::INTERVAL
            AND COALESCE(b.send_appointment_reminders, true) = true
            AND s.whatsapp_connected = true
        ) r
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10b. Get stale leads (for lead-recovery Edge Function)
CREATE OR REPLACE FUNCTION ai_get_stale_leads(p_min_hours_stale INTEGER DEFAULT 6)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
        FROM (
            SELECT
                c.id AS conversation_id,
                c.clinic_id,
                c.phone_number,
                c.contact_name,
                c.messages_count,
                c.followup_count,
                c.last_followup_at,
                c.last_message_at,
                s.evolution_instance_name,
                (SELECT content FROM ai_secretary_messages
                 WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) AS last_message
            FROM ai_secretary_conversations c
            JOIN ai_secretary_settings s ON s.clinic_id = c.clinic_id AND s.is_active = true
            WHERE c.status = 'active'
            AND c.awaiting_followup = true
            AND c.followup_count < 3
            AND c.last_message_at < NOW() - (p_min_hours_stale || ' hours')::INTERVAL
            AND (c.last_followup_at IS NULL OR c.last_followup_at < NOW() - INTERVAL '24 hours')
            AND s.whatsapp_connected = true
        ) r
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10c. Mark followup awaiting (called by webhook when AI responds but patient hasn't)
CREATE OR REPLACE FUNCTION ai_mark_awaiting_followup(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE ai_secretary_conversations
    SET awaiting_followup = true
    WHERE id = p_conversation_id
    AND status = 'active'
    AND appointment_created = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. Grants
-- =====================================================

-- Infrastructure RPCs
GRANT EXECUTE ON FUNCTION get_ai_secretary_config(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_ai_secretary_prompt(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_phone_blocked(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION start_ai_conversation(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_ai_message(UUID, TEXT, TEXT, TEXT, DECIMAL) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION transfer_to_human(UUID, TEXT) TO anon, authenticated, service_role;

-- Appointment RPCs
GRANT EXECUTE ON FUNCTION ai_find_patient_by_phone(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_create_patient(UUID, TEXT, TEXT, DATE, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_list_professionals(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_get_available_slots(UUID, UUID, DATE, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_create_appointment(UUID, UUID, UUID, DATE, TIME, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_get_patient_appointments(UUID, UUID, BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_get_next_appointment(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_reschedule_appointment(UUID, UUID, DATE, TIME, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_cancel_appointment(UUID, UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_confirm_appointment(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ai_get_tomorrow_appointments(UUID) TO anon, authenticated, service_role;

-- New RPCs
GRANT EXECUTE ON FUNCTION ai_get_due_reminders(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION ai_get_stale_leads(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION ai_mark_awaiting_followup(UUID) TO service_role;

-- =====================================================
-- 12. pg_cron jobs (run in production Supabase SQL Editor separately)
-- These are commented out because pg_cron requires superuser
-- and must be run manually in the Supabase Dashboard SQL Editor
-- =====================================================

-- Appointment reminders: every 5 minutes
-- SELECT cron.schedule('ai-appointment-reminders', '*/5 * * * *',
--   $$SELECT net.http_post(
--     current_setting('app.supabase_url') || '/functions/v1/appointment-reminders',
--     '{}',
--     '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'
--   )$$
-- );

-- Lead recovery: every 30 minutes
-- SELECT cron.schedule('ai-lead-recovery', '*/30 * * * *',
--   $$SELECT net.http_post(
--     current_setting('app.supabase_url') || '/functions/v1/lead-recovery',
--     '{}',
--     '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'
--   )$$
-- );

-- Clean stale message queue entries (older than 1 hour)
-- SELECT cron.schedule('ai-clean-message-queue', '0 * * * *',
--   $$DELETE FROM ai_secretary_message_queue WHERE received_at < NOW() - INTERVAL '1 hour'$$
-- );
