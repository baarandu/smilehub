# Deploy da Edge Function de Assinatura

Para que o sistema de pagamento funcione, é necessário fazer o deploy da função `create-subscription` para o Supabase e configurar a chave secreta do Stripe.

## 1. Login no Supabase (se ainda não fez)
Abra seu terminal na raiz do projeto e rode:
```bash
npx supabase login
```

## 2. Definir a Chave Secreta (Stripe Secret Key)
Essa chave nunca deve ir para o código do frontend. Vamos salvá-la de forma segura no cofre do Supabase:

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_... # Sua chave secreta do Stripe aqui
```

## 3. Fazer o Deploy da Função
Agora vamos subir a função `create-subscription` para a nuvem:

```bash
npx supabase functions deploy create-subscription --no-verify-jwt
```
*Geralmente usamos `--no-verify-jwt` se quisermos chamar via public API Key, mas idealmente deve ser protegido. O código atual da função permite chamadas com autenticação.*

## 4. Testar
Você pode invocar a função para verificar se ela responde (mesmo que com erro 400 por falta de parametros):
```bash
curl -i --location --request POST 'https://<PROJECT_REF>.supabase.co/functions/v1/create-subscription' \
  --header 'Authorization: Bearer <ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{"name":"Functions"}'
```
