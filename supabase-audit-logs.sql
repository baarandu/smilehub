-- =====================================================
-- AUDIT LOGS - Track critical actions
-- Execute in Supabase SQL Editor
-- =====================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    clinic_id uuid REFERENCES clinics(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id uuid,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_id ON audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own clinic's audit logs
CREATE POLICY "Users can view clinic audit logs" ON audit_logs
    FOR SELECT USING (clinic_id = get_user_clinic_id());

-- Only system can insert (via triggers)
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- Function to log actions
-- =====================================================
CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER AS $$
DECLARE
    v_clinic_id uuid;
BEGIN
    -- Try to get clinic_id from the record
    IF TG_OP = 'DELETE' THEN
        v_clinic_id := OLD.clinic_id;
    ELSE
        v_clinic_id := NEW.clinic_id;
    END IF;

    INSERT INTO audit_logs (
        user_id,
        clinic_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    ) VALUES (
        auth.uid(),
        v_clinic_id,
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );

    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Apply triggers to critical tables (OPTIONAL)
-- Uncomment the ones you want to track
-- =====================================================

-- Track patient changes
-- CREATE TRIGGER audit_patients
--     AFTER INSERT OR UPDATE OR DELETE ON patients
--     FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- Track budget changes
-- CREATE TRIGGER audit_budgets
--     AFTER INSERT OR UPDATE OR DELETE ON budgets
--     FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- Track financial changes
-- CREATE TRIGGER audit_financial
--     AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
--     FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- =====================================================
-- View recent audit logs
-- =====================================================
-- SELECT 
--     al.created_at,
--     al.action,
--     al.table_name,
--     p.full_name as user_name,
--     al.record_id
-- FROM audit_logs al
-- LEFT JOIN profiles p ON al.user_id = p.id
-- ORDER BY al.created_at DESC
-- LIMIT 50;
