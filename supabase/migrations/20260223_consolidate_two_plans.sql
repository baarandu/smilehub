-- =====================================================
-- MIGRATION: Consolidate 4 plans → 2 plans
-- Essencial (R$ 99) + Profissional (R$ 149)
-- Trial users get Profissional for 30 days
-- =====================================================

-- 1) Add original_price column for promo display (crossed-out price)
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS original_price_monthly INT;

-- 2) Add new feature definitions for gated sub-features
INSERT INTO plan_feature_definitions (key, label, icon, description, sort_order)
VALUES
  ('estoque_importacao', 'Importação de materiais', 'FileUp', 'Importar lista por copiar/colar ou nota fiscal', 25),
  ('protese', 'Central de Próteses', 'Stethoscope', 'Gerenciamento de pedidos de prótese', 26)
ON CONFLICT (key) DO NOTHING;

-- 3) Deactivate all old plans
UPDATE subscription_plans SET is_active = false WHERE slug IN ('basico', 'profissional', 'premium', 'enterprise');

-- 4) Insert Essencial plan (R$ 99,00 = 9900 centavos)
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, original_price_monthly, max_users, max_patients, max_locations, features, is_active, sort_order)
VALUES (
  'Essencial',
  'essencial',
  'Tudo que sua clínica precisa para funcionar no dia a dia',
  9900,
  98604,  -- 9900 * 12 * 0.83 (17% discount)
  NULL,
  999999,
  999999,
  1,
  '["agenda","prontuario","anamnese","orcamentos","alertas","financeiro","estoque","suporte_email"]'::jsonb,
  true,
  1
);

-- 5) Insert Profissional plan (R$ 149,00 = 14900 centavos, original R$ 197 = 19700)
INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, original_price_monthly, max_users, max_patients, max_locations, features, is_active, sort_order)
VALUES (
  'Profissional',
  'profissional_v2',
  'O pacote completo com IA, assinatura digital e muito mais',
  14900,
  148404, -- 14900 * 12 * 0.83 (17% discount)
  19700,
  999999,
  999999,
  999999,
  '["agenda","prontuario","anamnese","orcamentos","alertas","financeiro","estoque","suporte_email","estoque_importacao","assinatura_digital","dentista_ia","contabilidade_ia","comissoes","central_protese","imposto_renda","whatsapp_confirmacao","multi_unidades","relatorios_avancados","suporte_chat"]'::jsonb,
  true,
  2
);

-- 6) Migrate existing subscribers from old plans to new plans
-- Básico → Essencial
UPDATE subscriptions SET plan_id = (SELECT id FROM subscription_plans WHERE slug = 'essencial' LIMIT 1)
WHERE plan_id IN (SELECT id FROM subscription_plans WHERE slug = 'basico')
  AND status IN ('active', 'trialing', 'past_due');

-- Profissional, Premium, Enterprise → Profissional v2
UPDATE subscriptions SET plan_id = (SELECT id FROM subscription_plans WHERE slug = 'profissional_v2' LIMIT 1)
WHERE plan_id IN (SELECT id FROM subscription_plans WHERE slug IN ('profissional', 'premium', 'enterprise'))
  AND status IN ('active', 'trialing', 'past_due');

-- Also migrate pending_plan_id references
UPDATE subscriptions SET pending_plan_id = (SELECT id FROM subscription_plans WHERE slug = 'essencial' LIMIT 1)
WHERE pending_plan_id IN (SELECT id FROM subscription_plans WHERE slug = 'basico');

UPDATE subscriptions SET pending_plan_id = (SELECT id FROM subscription_plans WHERE slug = 'profissional_v2' LIMIT 1)
WHERE pending_plan_id IN (SELECT id FROM subscription_plans WHERE slug IN ('profissional', 'premium', 'enterprise'));

-- 7) Update trial trigger to use Profissional plan specifically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_clinic_id uuid;
  invite_record record;
  trial_plan_id uuid;
  clinic_display_name text;
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, gender)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'gender'
  );

  -- 2. Check for Pending Invites
  SELECT * INTO invite_record
  FROM public.clinic_invites
  WHERE email = new.email AND status = 'pending'
  LIMIT 1;

  IF invite_record IS NOT NULL THEN
    INSERT INTO public.clinic_users (user_id, clinic_id, role)
    VALUES (new.id, invite_record.clinic_id, invite_record.role);

    UPDATE public.clinic_invites SET status = 'accepted' WHERE id = invite_record.id;

  ELSE
    IF new.raw_user_meta_data->>'account_type' = 'clinic' THEN
      clinic_display_name := COALESCE(new.raw_user_meta_data->>'clinic_name', 'Minha Clínica');
    ELSE
      clinic_display_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Meu Consultório');
    END IF;

    INSERT INTO public.clinics (name)
    VALUES (clinic_display_name)
    RETURNING id INTO new_clinic_id;

    INSERT INTO public.clinic_users (user_id, clinic_id, role)
    VALUES (new.id, new_clinic_id, 'admin');

    -- Get the Profissional plan specifically for trial (slug = 'profissional_v2')
    SELECT id INTO trial_plan_id
    FROM public.subscription_plans
    WHERE slug = 'profissional_v2' AND is_active = true
    LIMIT 1;

    -- Fallback: get most expensive active plan
    IF trial_plan_id IS NULL THEN
      SELECT id INTO trial_plan_id
      FROM public.subscription_plans
      WHERE is_active = true
      ORDER BY price_monthly DESC
      LIMIT 1;
    END IF;

    IF trial_plan_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (
        clinic_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        cancel_at_period_end
      ) VALUES (
        new_clinic_id,
        trial_plan_id,
        'trialing',
        NOW(),
        NOW() + INTERVAL '30 days',
        false
      );
    END IF;

  END IF;

  RETURN new;
END;
$$;
