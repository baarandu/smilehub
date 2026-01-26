-- =====================================================
-- AI Secretary - Fix/Update Script
-- Run this if you already have some tables created
-- =====================================================

-- Drop all existing policies first (safe to run multiple times)
DO $$
BEGIN
    -- ai_secretary_settings
    DROP POLICY IF EXISTS "Users can view their clinic AI settings" ON ai_secretary_settings;
    DROP POLICY IF EXISTS "Admins can update their clinic AI settings" ON ai_secretary_settings;
    DROP POLICY IF EXISTS "Admins can insert their clinic AI settings" ON ai_secretary_settings;

    -- ai_secretary_blocked_numbers
    DROP POLICY IF EXISTS "Users can view blocked numbers" ON ai_secretary_blocked_numbers;
    DROP POLICY IF EXISTS "Admins can manage blocked numbers" ON ai_secretary_blocked_numbers;

    -- ai_secretary_conversations
    DROP POLICY IF EXISTS "Users can view conversations" ON ai_secretary_conversations;

    -- ai_secretary_messages
    DROP POLICY IF EXISTS "Users can view messages" ON ai_secretary_messages;

    -- ai_secretary_schedule
    DROP POLICY IF EXISTS "Users can view their clinic schedule" ON ai_secretary_schedule;
    DROP POLICY IF EXISTS "Admins can manage schedule" ON ai_secretary_schedule;

    -- ai_secretary_behavior
    DROP POLICY IF EXISTS "Users can view own clinic behavior" ON ai_secretary_behavior;
    DROP POLICY IF EXISTS "Admins can manage behavior" ON ai_secretary_behavior;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors if tables don't exist
END $$;

-- =====================================================
-- Create tables if they don't exist
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_secretary_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT false,
    whatsapp_connected BOOLEAN DEFAULT false,
    whatsapp_phone_number TEXT,
    whatsapp_session_id TEXT,
    evolution_instance_name TEXT,
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

CREATE TABLE IF NOT EXISTS ai_secretary_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
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

-- =====================================================
-- Enable RLS
-- =====================================================

ALTER TABLE ai_secretary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_blocked_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_behavior ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create Policies
-- =====================================================

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

-- Blocked numbers
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

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ai_settings_clinic ON ai_secretary_settings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_blocked_clinic ON ai_secretary_blocked_numbers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_convos_clinic ON ai_secretary_conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_convos_started ON ai_secretary_conversations(started_at);
CREATE INDEX IF NOT EXISTS idx_ai_schedule_clinic ON ai_secretary_schedule(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_behavior_clinic ON ai_secretary_behavior(clinic_id);

-- =====================================================
-- Triggers
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

-- Done!
