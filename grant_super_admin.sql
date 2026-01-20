-- SCRIPT PARA CONCEDER ACESSO DE SUPER ADMIN
-- Substitua o email abaixo pelo email do usuário que você quer tornar Super Admin.

DO $$
DECLARE
  v_user_email text := 'vitor_cb@hotmail.com';
  v_user_id uuid;
BEGIN
  -- 1. Buscar ID do usuário no Auth
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Erro: Email % realmente não encontrado em auth.users.', v_user_email;
  END IF;

  -- 2. Garantir que a coluna is_super_admin existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_super_admin') THEN
      ALTER TABLE profiles ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
  END IF;

  -- 3. UPSERT: Criar perfil se não existir, ou atualizar se existir
  INSERT INTO public.profiles (id, is_super_admin)
  VALUES (v_user_id, true)
  ON CONFLICT (id) 
  DO UPDATE SET is_super_admin = true;

  RAISE NOTICE 'Sucesso! Usuário % (ID: %) agora é Super Admin.', v_user_email, v_user_id;
END $$;
