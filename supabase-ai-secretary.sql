-- =====================================================
-- AI Secretary (WhatsApp Agent) Tables
-- Execute this in your Supabase SQL Editor
-- =====================================================

-- 1. AI Secretary Settings (one row per clinic)
-- Stores all configuration for the WhatsApp AI agent
CREATE TABLE IF NOT EXISTS ai_secretary_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    
    -- Status
    is_active BOOLEAN DEFAULT false,
    
    -- Connection
    whatsapp_connected BOOLEAN DEFAULT false,
    whatsapp_phone_number TEXT,
    whatsapp_session_id TEXT, -- For n8n/Evolution API session management
    
    -- Behavior
    tone TEXT DEFAULT 'casual' CHECK (tone IN ('casual', 'formal')),
    
    -- Working Hours
    work_hours_start TIME DEFAULT '08:00',
    work_hours_end TIME DEFAULT '18:00',
    work_days JSONB DEFAULT '{"seg": true, "ter": true, "qua": true, "qui": true, "sex": true, "sab": false, "dom": false}',
    
    -- Scheduling Rules
    min_advance_hours INTEGER DEFAULT 2, -- Minimum hours before allowing appointment
    interval_minutes INTEGER DEFAULT 30, -- Buffer between appointments
    allowed_procedure_ids UUID[] DEFAULT '{}', -- Procedures the AI can schedule
    
    -- Custom Messages
    greeting_message TEXT DEFAULT 'Olá! Sou a assistente virtual. Como posso ajudar?',
    confirmation_message TEXT DEFAULT 'Sua consulta foi agendada com sucesso! ✅',
    reminder_message TEXT DEFAULT 'Lembrete: Você tem uma consulta amanhã às {hora}.',
    out_of_hours_message TEXT DEFAULT 'Olá! Nosso atendimento é das {inicio} às {fim}. Retornaremos em breve!',
    
    -- Limits & Controls
    message_limit_per_conversation INTEGER DEFAULT 20,
    human_keywords TEXT[] DEFAULT ARRAY['atendente', 'humano', 'pessoa', 'falar com alguém'],
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(clinic_id)
);

-- 2. Blocked Numbers
-- Numbers the AI should ignore
CREATE TABLE IF NOT EXISTS ai_secretary_blocked_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    reason TEXT,
    blocked_by UUID REFERENCES profiles(id),
    blocked_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(clinic_id, phone_number)
);

-- 3. Conversations Log
-- Track all AI conversations for analytics and debugging
CREATE TABLE IF NOT EXISTS ai_secretary_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    
    -- Contact Info
    phone_number TEXT NOT NULL,
    contact_name TEXT,
    patient_id UUID REFERENCES patients(id), -- Linked if identified
    
    -- Conversation Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'transferred', 'abandoned')),
    transferred_reason TEXT, -- Why it was transferred to human
    
    -- Stats
    messages_count INTEGER DEFAULT 0,
    ai_responses_count INTEGER DEFAULT 0,
    
    -- Result
    appointment_created BOOLEAN DEFAULT false,
    appointment_id UUID REFERENCES appointments(id),
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 4. Conversation Messages
-- Individual messages within a conversation
CREATE TABLE IF NOT EXISTS ai_secretary_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_secretary_conversations(id) ON DELETE CASCADE,
    
    sender TEXT NOT NULL CHECK (sender IN ('patient', 'ai', 'human')),
    content TEXT NOT NULL,
    
    -- AI Processing
    intent_detected TEXT, -- e.g., 'schedule', 'reschedule', 'cancel', 'question'
    confidence_score DECIMAL(3,2),
    
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Monthly Stats (Aggregated)
-- Pre-computed stats for dashboard
CREATE TABLE IF NOT EXISTS ai_secretary_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Metrics
    total_conversations INTEGER DEFAULT 0,
    completed_conversations INTEGER DEFAULT 0,
    transferred_conversations INTEGER DEFAULT 0,
    abandoned_conversations INTEGER DEFAULT 0,
    
    total_appointments_created INTEGER DEFAULT 0,
    total_appointments_rescheduled INTEGER DEFAULT 0,
    total_appointments_cancelled INTEGER DEFAULT 0,
    
    total_messages_received INTEGER DEFAULT 0,
    total_ai_responses INTEGER DEFAULT 0,
    
    avg_messages_per_conversation DECIMAL(5,2),
    avg_response_time_seconds INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(clinic_id, period_start, period_end)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ai_settings_clinic ON ai_secretary_settings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_blocked_clinic ON ai_secretary_blocked_numbers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_convos_clinic ON ai_secretary_conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_convos_phone ON ai_secretary_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_ai_convos_status ON ai_secretary_conversations(status);
CREATE INDEX IF NOT EXISTS idx_ai_convos_started ON ai_secretary_conversations(started_at);
CREATE INDEX IF NOT EXISTS idx_ai_messages_convo ON ai_secretary_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_stats_clinic_period ON ai_secretary_stats(clinic_id, period_start);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE ai_secretary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_blocked_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_secretary_stats ENABLE ROW LEVEL SECURITY;

-- Settings: Only clinic members can view/edit
CREATE POLICY "Users can view their clinic AI settings"
    ON ai_secretary_settings FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update their clinic AI settings"
    ON ai_secretary_settings FOR UPDATE
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'owner')));

CREATE POLICY "Admins can insert their clinic AI settings"
    ON ai_secretary_settings FOR INSERT
    WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'owner')));

-- Blocked Numbers: Admins/Managers can manage
CREATE POLICY "Users can view blocked numbers"
    ON ai_secretary_blocked_numbers FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage blocked numbers"
    ON ai_secretary_blocked_numbers FOR ALL
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'owner')));

-- Conversations: Clinic members can view
CREATE POLICY "Users can view conversations"
    ON ai_secretary_conversations FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- Messages: Clinic members can view
CREATE POLICY "Users can view messages"
    ON ai_secretary_messages FOR SELECT
    USING (conversation_id IN (
        SELECT id FROM ai_secretary_conversations 
        WHERE clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
    ));

-- Stats: Clinic members can view
CREATE POLICY "Users can view stats"
    ON ai_secretary_stats FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- =====================================================
-- Service Role Policies (for n8n/backend)
-- The n8n workflow will use the service_role key
-- which bypasses RLS, allowing it to:
-- - Read settings
-- - Create/update conversations
-- - Insert messages
-- - Update stats
-- =====================================================

-- =====================================================
-- Trigger: Auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_settings_updated_at
    BEFORE UPDATE ON ai_secretary_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_settings_updated_at();

-- =====================================================
-- Helper: Initialize settings for existing clinics
-- =====================================================

-- Uncomment and run if you want to create default settings for all existing clinics
-- INSERT INTO ai_secretary_settings (clinic_id)
-- SELECT id FROM clinics
-- ON CONFLICT (clinic_id) DO NOTHING;
