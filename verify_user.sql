-- Script de Verificação de Usuário
-- 1. Tenta achar exato
-- 2. Tenta achar case-insensitive
-- 3. Mostra todos se não achar

DO $$
DECLARE
    v_email text := 'vitor_cb@hotmail.com';
    v_count integer;
    v_user record;
BEGIN
    RAISE NOTICE '--- Iniciando verificação para: % ---', v_email;

    -- Checa exato
    SELECT count(*) INTO v_count FROM auth.users WHERE email = v_email;
    IF v_count > 0 THEN
        RAISE NOTICE 'SUCESSO: Usuário encontrado (exato). ID: %', (SELECT id FROM auth.users WHERE email = v_email);
    ELSE
        RAISE NOTICE 'AVISO: Não encontrado com match exato.';
        
        -- Checa case-insensitive
        SELECT count(*) INTO v_count FROM auth.users WHERE email ILIKE v_email;
        IF v_count > 0 THEN
             SELECT * INTO v_user FROM auth.users WHERE email ILIKE v_email LIMIT 1;
             RAISE NOTICE 'ENCONTRADO (Case Insensitive): % (Email real: %)', v_user.id, v_user.email;
        ELSE
             RAISE NOTICE 'ERRO: Usuário não encontrado nem com ignore-case.';
             RAISE NOTICE '--- Listando os 10 últimos usuários cadastrados para conferência ---';
        END IF;
    END IF;
END $$;

-- Lista os últimos 10 usuários para ajudar a debugar visualmente
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;
