-- SCRIPT PARA CONCEDER ACESSO VITALÍCIO (LIFETIME)
-- Substitua o email abaixo pelo email do usuário que você quer beneficiar.

DO $$
DECLARE
  v_user_email text := 'sorria@barbaraqueiroz.com.br'; -- Email atualizado
  v_plan_name text := 'Clinic'; -- Escolha: 'Starter', 'Professional' ou 'Clinic'
  v_clinic_id uuid;
  v_plan_id uuid;
BEGIN
  -- 1. Buscar o ID da Clínica através do email do usuário
  SELECT cu.clinic_id INTO v_clinic_id
  FROM public.clinic_users cu
  JOIN auth.users au ON au.id = cu.user_id
  WHERE au.email = v_user_email
  LIMIT 1;

  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado ou não possui clínica vinculada.', v_user_email;
  END IF;

  -- 1.5 Garantir que o plano 'Enterprise' (Top Tier) existe
  INSERT INTO public.subscription_plans (name, slug, description, price_monthly, max_users, max_patients, max_locations, features, sort_order)
  VALUES (
    'Enterprise', 
    'enterprise', 
    'Plano VIP ilimitado com todas as funcionalidades', 
    999900, -- Valor simbólico, não será cobrado
    2147483647, -- Usuários Ilimitados (simulado com Max Int pois a coluna é NOT NULL)
    NULL, -- Pacientes Ilimitados (permite NULL)
    2147483647, -- Locais Ilimitados (simulado)
    '["Todas as funcionalidades", "Usuários ilimitados", "Suporte VIP", "Auditoria Avançada", "API Access"]',
    99
  )
  ON CONFLICT (slug) DO NOTHING;

  -- 2. Buscar o ID do Plano Enterprise
  SELECT id INTO v_plan_id 
  FROM public.subscription_plans 
  WHERE slug = 'enterprise'
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plano % não encontrado.', v_plan_name;
  END IF;

  -- 3. Remover assinaturas anteriores (se houver) para evitar duplicidade
  DELETE FROM public.subscriptions WHERE clinic_id = v_clinic_id;

  -- 4. Criar a nova assinatura "Vitalícia"
  -- Definimos o fim do período para o ano 2099
  INSERT INTO public.subscriptions (
    clinic_id, 
    plan_id, 
    status, 
    current_period_start, 
    current_period_end, 
    cancel_at_period_end
  )
  VALUES (
    v_clinic_id, 
    v_plan_id, 
    'active', 
    now(), 
    '2099-12-31 23:59:59+00', -- Data distante para simular "vitalício"
    false
  );

  RAISE NOTICE 'Assinatura Vitalícia do plano % concedida com sucesso para % (Clínica ID: %)', v_plan_name, v_user_email, v_clinic_id;

END $$;
