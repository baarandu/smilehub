-- Query simples para listar todos os usuários cadastrados
SELECT id, email, created_at, last_sign_in_at 
FROM auth.users 
ORDER BY created_at DESC;
