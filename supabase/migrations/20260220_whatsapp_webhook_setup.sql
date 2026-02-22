-- =====================================================
-- WhatsApp Webhook Setup
-- Minimal additions for deduplication and performance.
-- Main tables already exist from ai-secretary migrations.
-- =====================================================

-- 1. Column for webhook message deduplication
-- Evolution API may send the same webhook multiple times
ALTER TABLE ai_secretary_messages
  ADD COLUMN IF NOT EXISTS external_message_id TEXT;

-- Index for fast deduplication lookup (partial: only non-null)
CREATE INDEX IF NOT EXISTS idx_ai_messages_external_id
  ON ai_secretary_messages(external_message_id)
  WHERE external_message_id IS NOT NULL;

-- 2. Index for fast lookup of active conversations by phone
-- Used on every incoming message to find/create conversation
CREATE INDEX IF NOT EXISTS idx_ai_convos_phone_active
  ON ai_secretary_conversations(clinic_id, phone_number, status)
  WHERE status = 'active';
