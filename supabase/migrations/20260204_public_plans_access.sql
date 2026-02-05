-- =====================================================
-- Permitir leitura pública dos planos de assinatura
-- Necessário para exibir preços na landing page
-- =====================================================

-- Habilitar RLS na tabela subscription_plans (se não estiver habilitado)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Política para permitir que QUALQUER pessoa (autenticada ou não) leia os planos ativos
-- Isso é necessário para a landing page pública
DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;
CREATE POLICY "Anyone can view active plans"
    ON subscription_plans
    FOR SELECT
    USING (is_active = true);

-- Política para permitir que super admins vejam todos os planos (incluindo inativos)
DROP POLICY IF EXISTS "Admins can view all plans" ON subscription_plans;
CREATE POLICY "Admins can view all plans"
    ON subscription_plans
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
    );

-- Política para permitir que super admins modifiquem planos
DROP POLICY IF EXISTS "Admins can manage plans" ON subscription_plans;
CREATE POLICY "Admins can manage plans"
    ON subscription_plans
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
    );

-- =====================================================
-- Permitir leitura pública das configurações do app
-- Necessário para obter o desconto anual na landing page
-- =====================================================

-- Criar tabela app_settings se não existir
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Política para permitir que qualquer pessoa leia configurações públicas
DROP POLICY IF EXISTS "Anyone can read public settings" ON app_settings;
CREATE POLICY "Anyone can read public settings"
    ON app_settings
    FOR SELECT
    USING (key IN ('annual_discount_percent'));

-- Política para permitir que super admins modifiquem configurações
DROP POLICY IF EXISTS "Admins can manage settings" ON app_settings;
CREATE POLICY "Admins can manage settings"
    ON app_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_super_admin = true
        )
    );

-- Inserir valor padrão do desconto anual se não existir
INSERT INTO app_settings (key, value)
VALUES ('annual_discount_percent', '17')
ON CONFLICT (key) DO NOTHING;
