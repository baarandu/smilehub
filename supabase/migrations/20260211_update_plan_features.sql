-- =====================================================
-- UPDATE: Reorganizar planos de assinatura
-- Essencial -> Basico, Clinica -> Premium
-- Novos precos, limites e features de IA por tier
-- =====================================================

-- 1) Atualizar Essencial -> Basico
UPDATE subscription_plans SET
    name = 'Básico',
    slug = 'basico',
    description = 'Para dentistas autônomos que estão começando',
    price_monthly = 9700,    -- R$ 97,00
    price_yearly = 93120,    -- R$ 931,20
    max_users = 1,
    max_patients = 300,
    max_locations = 1,
    features = '["Agenda inteligente", "Prontuário digital", "Anamnese completa", "Orçamentos", "Alertas e lembretes", "Suporte por e-mail"]'::jsonb,
    sort_order = 1
WHERE slug = 'essencial';

-- 2) Atualizar Profissional (manter slug, ajustar limites e features)
UPDATE subscription_plans SET
    name = 'Profissional',
    description = 'Para clínicas pequenas com equipe',
    price_monthly = 19700,   -- R$ 197,00
    price_yearly = 189120,   -- R$ 1.891,20
    max_users = 3,
    max_patients = 2000,
    max_locations = 1,
    features = '["Tudo do Básico", "Financeiro completo", "Estoque e materiais", "Imposto de Renda", "Comissões de dentistas", "Até 3 usuários"]'::jsonb,
    sort_order = 2
WHERE slug = 'profissional';

-- 3) Atualizar Clinica -> Premium
UPDATE subscription_plans SET
    name = 'Premium',
    slug = 'premium',
    description = 'Para clínicas com múltiplos profissionais e IA',
    price_monthly = 29700,   -- R$ 297,00
    price_yearly = 285120,   -- R$ 2.851,20
    max_users = 10,
    max_patients = 999999,   -- Ilimitado
    max_locations = 3,
    features = '["Tudo do Profissional", "Consulta por Voz (IA)", "Dentista IA", "Contabilidade IA", "Confirmação WhatsApp", "Até 3 unidades"]'::jsonb,
    sort_order = 3
WHERE slug = 'clinica';

-- 4) Atualizar Enterprise (ajustar features display)
UPDATE subscription_plans SET
    description = 'Para redes de clínicas e franquias',
    max_users = 999999,      -- Ilimitado
    max_patients = 999999,   -- Ilimitado
    max_locations = 999999,  -- Ilimitado
    features = '["Tudo do Premium", "Secretária IA", "Usuários ilimitados", "Migração assistida", "API personalizada", "Suporte prioritário"]'::jsonb,
    sort_order = 4
WHERE slug = 'enterprise';

-- Verificar resultado
SELECT name, slug, price_monthly/100.0 as preco, max_users, max_patients, max_locations, sort_order
FROM subscription_plans
ORDER BY sort_order;
