-- =====================================================
-- SEED: Subscription Plans (CORRECTED)
-- Execute this to populate the plans table
-- =====================================================

-- 1. Insert Plans (using 'is_active' instead of 'active')
INSERT INTO public.subscription_plans (name, description, price_monthly, features, is_active, slug, max_users, max_patients, max_locations, sort_order)
VALUES
(
    'Starter', 
    'Para dentistas que estão começando.', 
    4990, 
    '["Até 50 pacientes", "Agenda básica", "Prontuário digital", "Suporte por email"]', 
    true, 
    'starter',
    1,
    50,
    1,
    1
),
(
    'Profissional', 
    'Para clínicas em crescimento.', 
    9990, 
    '["Pacientes ilimitados", "Multi-usuários (até 3)", "Gestão financeira completa", "Lembretes via WhatsApp", "Suporte prioritário"]', 
    true, 
    'popular',
    3,
    null, -- unlimited
    2,
    2
),
(
    'Enterprise', 
    'Para grandes redes e franquias.', 
    29990, 
    '["Tudo do Profissional", "Usuários ilimitados", "API personalizada", "Gestor de conta dedicado", "Treinamento presencial"]', 
    true, 
    'enterprise',
    999,
    null,
    999,
    3
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    max_users = EXCLUDED.max_users,
    max_patients = EXCLUDED.max_patients,
    max_locations = EXCLUDED.max_locations,
    sort_order = EXCLUDED.sort_order;

-- 2. Verify
SELECT * FROM public.subscription_plans;
