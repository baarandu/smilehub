-- =====================================================
-- Migration: Dentist Agent Tables
-- Created: 2026-02-11
-- Purpose: Create infrastructure for AI dentist agent
-- =====================================================

-- =====================================================
-- PART 1: Tables
-- =====================================================

-- Conversations table
CREATE TABLE IF NOT EXISTS dentist_agent_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
    title text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_message_at timestamptz DEFAULT now(),
    message_count integer DEFAULT 0,
    tool_calls_count integer DEFAULT 0
);

-- Messages table
CREATE TABLE IF NOT EXISTS dentist_agent_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES dentist_agent_conversations(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
    content text NOT NULL,
    image_urls text[],
    tool_calls jsonb,
    tool_call_id text,
    tool_name text,
    created_at timestamptz DEFAULT now(),
    tokens_used integer DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dentist_conv_clinic_id ON dentist_agent_conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_dentist_conv_user_id ON dentist_agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_dentist_conv_patient_id ON dentist_agent_conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_dentist_conv_last_message ON dentist_agent_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_dentist_msg_conversation_id ON dentist_agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dentist_msg_created_at ON dentist_agent_messages(created_at);

-- =====================================================
-- PART 2: Row Level Security (RLS)
-- =====================================================

ALTER TABLE dentist_agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentist_agent_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Dentists can view their clinic's conversations" ON dentist_agent_conversations;
DROP POLICY IF EXISTS "Dentists can create conversations for their clinic" ON dentist_agent_conversations;
DROP POLICY IF EXISTS "Dentists can update their clinic's conversations" ON dentist_agent_conversations;
DROP POLICY IF EXISTS "Dentists can delete their clinic's conversations" ON dentist_agent_conversations;
DROP POLICY IF EXISTS "Dentists can view messages from their clinic's conversations" ON dentist_agent_messages;
DROP POLICY IF EXISTS "Dentists can create messages in their clinic's conversations" ON dentist_agent_messages;

-- RLS Policies for conversations (dentists AND admins)
CREATE POLICY "Dentists can view their clinic's conversations"
    ON dentist_agent_conversations FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
    );

CREATE POLICY "Dentists can create conversations for their clinic"
    ON dentist_agent_conversations FOR INSERT
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Dentists can update their clinic's conversations"
    ON dentist_agent_conversations FOR UPDATE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
    );

CREATE POLICY "Dentists can delete their clinic's conversations"
    ON dentist_agent_conversations FOR DELETE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
    );

-- RLS Policies for messages
CREATE POLICY "Dentists can view messages from their clinic's conversations"
    ON dentist_agent_messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM dentist_agent_conversations
            WHERE clinic_id IN (
                SELECT clinic_id FROM clinic_users
                WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
            )
        )
    );

CREATE POLICY "Dentists can create messages in their clinic's conversations"
    ON dentist_agent_messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM dentist_agent_conversations
            WHERE clinic_id IN (
                SELECT clinic_id FROM clinic_users
                WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
            )
        )
    );

-- =====================================================
-- PART 3: Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_dentist_conversation_metadata()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE dentist_agent_conversations
    SET
        updated_at = now(),
        last_message_at = now(),
        message_count = message_count + 1,
        tool_calls_count = tool_calls_count + CASE
            WHEN NEW.tool_calls IS NOT NULL THEN jsonb_array_length(NEW.tool_calls)
            ELSE 0
        END
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_dentist_conversation_on_message_insert ON dentist_agent_messages;
CREATE TRIGGER update_dentist_conversation_on_message_insert
    AFTER INSERT ON dentist_agent_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_dentist_conversation_metadata();

-- =====================================================
-- PART 4: Comments
-- =====================================================

COMMENT ON TABLE dentist_agent_conversations IS 'Stores conversations between dentists and the AI dentist agent';
COMMENT ON TABLE dentist_agent_messages IS 'Stores individual messages within dentist agent conversations';
