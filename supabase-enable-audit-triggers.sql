-- =====================================================
-- ATIVAR TRIGGERS DE AUDITORIA
-- Execute no Supabase SQL Editor
-- Data: 24/12/2024
-- =====================================================

-- 1. Verificar se a tabela audit_logs existe (se não, criar)
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    clinic_id uuid,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id uuid,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_id ON audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);

-- 3. Habilitar RLS na tabela
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Política: usuários só veem logs da própria clínica
DROP POLICY IF EXISTS "Users can view clinic audit logs" ON audit_logs;
CREATE POLICY "Users can view clinic audit logs" ON audit_logs
    FOR SELECT USING (clinic_id = get_user_clinic_id());

-- 5. Política: sistema pode inserir logs
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- 6. Criar/atualizar função de logging
CREATE OR REPLACE FUNCTION log_audit_action()
RETURNS TRIGGER AS $$
DECLARE
    v_clinic_id uuid;
BEGIN
    -- Pegar clinic_id do registro
    IF TG_OP = 'DELETE' THEN
        v_clinic_id := OLD.clinic_id;
    ELSE
        v_clinic_id := NEW.clinic_id;
    END IF;

    -- Inserir log
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

    -- Retornar registro apropriado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. ATIVAR TRIGGERS NAS TABELAS CRÍTICAS
-- =====================================================

-- Pacientes
DROP TRIGGER IF EXISTS audit_patients ON patients;
CREATE TRIGGER audit_patients
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- Orçamentos
DROP TRIGGER IF EXISTS audit_budgets ON budgets;
CREATE TRIGGER audit_budgets
    AFTER INSERT OR UPDATE OR DELETE ON budgets
    FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- Transações Financeiras
DROP TRIGGER IF EXISTS audit_financial ON financial_transactions;
CREATE TRIGGER audit_financial
    AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- Procedimentos
DROP TRIGGER IF EXISTS audit_procedures ON procedures;
CREATE TRIGGER audit_procedures
    AFTER INSERT OR UPDATE OR DELETE ON procedures
    FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- Exames
DROP TRIGGER IF EXISTS audit_exams ON exams;
CREATE TRIGGER audit_exams
    AFTER INSERT OR UPDATE OR DELETE ON exams
    FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- Anamneses
DROP TRIGGER IF EXISTS audit_anamneses ON anamneses;
CREATE TRIGGER audit_anamneses
    AFTER INSERT OR UPDATE OR DELETE ON anamneses
    FOR EACH ROW EXECUTE FUNCTION log_audit_action();

-- =====================================================
-- 8. VERIFICAR SE FUNCIONOU
-- =====================================================
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE 'audit_%'
ORDER BY event_object_table;
