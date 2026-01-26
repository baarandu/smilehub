-- VERSÃO SIMPLIFICADA - Create custom messages table for AI Secretary
-- Run this in your Supabase SQL editor

-- Drop table if exists (for testing)
DROP TABLE IF EXISTS ai_secretary_custom_messages;

-- Create table without foreign key constraint
CREATE TABLE ai_secretary_custom_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    message_key TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_predefined BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one message per key per clinic
    UNIQUE(clinic_id, message_key)
);

-- Enable RLS
ALTER TABLE ai_secretary_custom_messages ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policy - allow all for authenticated users (for testing)
CREATE POLICY "Allow all for authenticated users"
    ON ai_secretary_custom_messages
    FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Index for faster queries
CREATE INDEX idx_custom_messages_clinic_id ON ai_secretary_custom_messages(clinic_id);
