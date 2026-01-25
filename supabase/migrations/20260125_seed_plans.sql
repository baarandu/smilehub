-- =====================================================
-- SEED: Novos Planos de Assinatura
-- Mantém o Enterprise existente
-- =====================================================

-- Deletar planos existentes EXCETO Enterprise
DELETE FROM subscription_plans WHERE slug != 'enterprise';

-- Inserir novos planos
INSERT INTO subscription_plans (
    name,
    slug,
    description,
    price_monthly,
    price_yearly,
    max_users,
    max_patients,
    max_locations,
    features,
    is_active,
    sort_order
) VALUES
-- Plano Essencial
(
    'Essencial',
    'essencial',
    'Para dentistas autonomos ou consultorios iniciantes',
    9700, -- R$ 97,00 em centavos
    93120, -- R$ 931,20 (20% desconto anual)
    1,
    500,
    1,
    '{
        "agenda": true,
        "prontuario": true,
        "alertas": true,
        "orcamentos": true,
        "financeiro_basico": true,
        "financeiro_avancado": false,
        "estoque": false,
        "imposto_renda": false,
        "comissoes": false,
        "relatorios_avancados": false,
        "multi_unidades": false,
        "api": false,
        "secretaria_ia": false,
        "whitelabel": false,
        "suporte_email": true,
        "suporte_chat": false,
        "suporte_telefone": false,
        "gerente_dedicado": false
    }'::jsonb,
    true,
    1
),
-- Plano Profissional
(
    'Profissional',
    'profissional',
    'Para clinicas pequenas com equipe',
    19700, -- R$ 197,00
    189120, -- R$ 1.891,20 (20% desconto)
    5,
    2000,
    1,
    '{
        "agenda": true,
        "prontuario": true,
        "alertas": true,
        "orcamentos": true,
        "financeiro_basico": true,
        "financeiro_avancado": true,
        "estoque": true,
        "imposto_renda": true,
        "comissoes": true,
        "relatorios_avancados": false,
        "multi_unidades": false,
        "api": false,
        "secretaria_ia": false,
        "whitelabel": false,
        "suporte_email": true,
        "suporte_chat": true,
        "suporte_telefone": false,
        "gerente_dedicado": false
    }'::jsonb,
    true,
    2
),
-- Plano Clinica
(
    'Clinica',
    'clinica',
    'Para clinicas medias com varios profissionais',
    34700, -- R$ 347,00
    333120, -- R$ 3.331,20 (20% desconto)
    15,
    10000,
    3,
    '{
        "agenda": true,
        "prontuario": true,
        "alertas": true,
        "orcamentos": true,
        "financeiro_basico": true,
        "financeiro_avancado": true,
        "estoque": true,
        "imposto_renda": true,
        "comissoes": true,
        "relatorios_avancados": true,
        "multi_unidades": true,
        "api": true,
        "secretaria_ia": false,
        "whitelabel": false,
        "suporte_email": true,
        "suporte_chat": true,
        "suporte_telefone": true,
        "gerente_dedicado": false
    }'::jsonb,
    true,
    3
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    max_users = EXCLUDED.max_users,
    max_patients = EXCLUDED.max_patients,
    max_locations = EXCLUDED.max_locations,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

-- Atualizar sort_order do Enterprise para ficar por último
UPDATE subscription_plans SET sort_order = 4 WHERE slug = 'enterprise';

-- Verificar resultado
SELECT name, slug, price_monthly/100.0 as preco, max_users, max_patients, sort_order
FROM subscription_plans
ORDER BY sort_order;
