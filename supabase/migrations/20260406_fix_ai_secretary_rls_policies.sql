-- Fix: replace overly permissive USING(true) policies on AI Secretary queue/locks tables.
-- These tables are only accessed by the whatsapp-webhook Edge Function using service_role,
-- which bypasses RLS entirely. The old USING(true) policies allowed any authenticated user
-- to read/write all records across clinics.
--
-- New policies: restrict to service_role only (no-op for service_role since it bypasses RLS,
-- but blocks any accidental access via anon or authenticated keys).

-- ai_secretary_message_queue
DROP POLICY IF EXISTS "Service role manages queue" ON ai_secretary_message_queue;
CREATE POLICY "Service role manages queue"
    ON ai_secretary_message_queue FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ai_secretary_locks
DROP POLICY IF EXISTS "Service role manages locks" ON ai_secretary_locks;
CREATE POLICY "Service role manages locks"
    ON ai_secretary_locks FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
