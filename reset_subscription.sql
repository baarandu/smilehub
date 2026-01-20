-- ==============================================================================
-- SCRIPT DE RESET DE ASSINATURAS (PARA TESTES)
-- ==============================================================================
-- Use este script no Editor SQL do Supabase para limpar dados de teste.
-- ==============================================================================

-- 1. Limpar TODAS as assinaturas (Cuidado: Apaga tudo da tabela subscriptions)
TRUNCATE TABLE public.subscriptions;

-- OU

-- 2. Limpar assinaturas de um usuário específico (Se souber o email)
-- (Requer que você descubra o clinic_id do usuário antes)
-- DELETE FROM public.subscriptions 
-- WHERE clinic_id IN (
--    SELECT clinic_id FROM public.clinic_users 
--    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'seu_email@teste.com')
-- );

-- 3. Verificar se limpou
SELECT * FROM public.subscriptions;
