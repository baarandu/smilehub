-- =====================================================
-- Migration: Add DELETE policy for accounting agent conversations
-- Fix: Delete button was not working because RLS had no DELETE policy
-- =====================================================

-- Drop if exists (idempotent)
DROP POLICY IF EXISTS "Admins can delete their clinic's conversations" ON accounting_agent_conversations;

-- Allow admins to delete conversations from their clinic
CREATE POLICY "Admins can delete their clinic's conversations"
    ON accounting_agent_conversations FOR DELETE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
