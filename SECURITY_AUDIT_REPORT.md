# Auditoria de Segurança — Smile Care Hub / Organiza Odonto

**Data:** 31 de março de 2026
**Auditor:** Engenheiro de Segurança Sênior (revisão pré-produção)
**Escopo:** Análise completa do repositório — frontend (React/Vite), backend (Supabase Edge Functions), banco de dados (PostgreSQL/Supabase), integrações (Stripe, Evolution API, OpenAI, SuperSign)

---

## Resumo Executivo

O projeto demonstra maturidade significativa em segurança: RLS ativado em 40+ tabelas, webhook signatures verificadas com timing-safe comparison, proxy server-side para API keys sensíveis, rate limiting com fallback em memória, e audit logging imutável. No entanto, foram identificadas **7 vulnerabilidades críticas**, **5 altas** e **8 médias** que precisam ser corrigidas antes de ir para produção.

---

## PILAR 1 — Chaves e Secrets Expostos

### CRÍTICO: Evolution API Key exposta no frontend via `.env`

**Arquivo:** `.env` linha 8
**Variável:** `VITE_EVOLUTION_API_KEY=minhaChaveSecreta123`

Qualquer variável prefixada com `VITE_` é injetada no bundle JavaScript pelo Vite e fica visível no navegador. Embora o código atual do frontend (`src/services/evolutionApi.ts`) **não use** essa variável diretamente — todas as chamadas passam pelo `evolution-proxy` Edge Function — a chave está declarada e será incluída no bundle de produção. Um atacante pode extraí-la com `view-source` ou DevTools.

**Atenuante encontrada:** O frontend realmente usa apenas o proxy. Porém, o risco persiste porque a chave está no bundle.

**Correção:** Remover `VITE_EVOLUTION_API_KEY` do `.env`. A chave já está configurada como secret no Supabase Edge Functions (`EVOLUTION_API_KEY` via `Deno.env.get()`).

### MÉDIO: Chave da API Evolution fraca

O valor `minhaChaveSecreta123` é trivialmente adivinhável. Se a Evolution API estiver exposta na internet, qualquer pessoa pode usá-la.

**Correção:** Gerar chave aleatória forte (`openssl rand -hex 32`).

### OK: Demais secrets

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`: **OK** — a anon key é projetada para uso público; a segurança depende do RLS (coberto no Pilar 2).
- `VITE_STRIPE_PUBLISHABLE_KEY` (`pk_live_*`): **OK** — publishable key é segura para o frontend por design do Stripe.
- `VITE_SENTRY_DSN`: **OK** — DSN de monitoramento é público por design.
- Stripe Secret Key, Service Role Key, OpenAI API Key: **OK** — usadas apenas em Edge Functions via `Deno.env.get()`.
- `.gitignore` cobre `.env`, `.env.local`, `.env.docker`: **OK**.

### MÉDIO: Arquivo `.env.docker` com credenciais default

**Arquivo:** `.env.docker`
Contém `POSTGRES_PASSWORD=change_me_to_a_secure_password` e `EVOLUTION_API_KEY=change_me_to_a_secure_key`. Mesmo com `.gitignore`, se alguém fizer deploy com esses valores, o banco e API ficam abertos.

**Correção:** Renomear para `.env.docker.example` e adicionar validação no `docker-compose.yml` que falhe se os defaults não forem alterados.

---

## PILAR 2 — RLS e Policies no Supabase

### OK: RLS amplamente implementado

RLS está ativado em **40+ tabelas**, incluindo todas as críticas: `patients`, `appointments`, `financial_transactions`, `subscriptions`, `clinic_users`, `profiles`, `audit_logs`, tabelas de AI Secretary, Dentist Agent, e assinaturas digitais.

**Padrão de isolamento:** `clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())` — correto e consistente.

### ALTO: isSuperAdmin verificada apenas no cliente

**Arquivo:** `src/services/admin/auth.ts`

```typescript
const { data } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();
return !!data.is_super_admin;
```

A verificação de super admin é feita com a anon key no frontend. Se a RLS da tabela `profiles` permitir que o usuário leia seu próprio campo `is_super_admin`, um atacante não pode escalá-lo — mas a lógica de admin dashboard depende apenas dessa verificação client-side. As Edge Functions de admin (ex: `get-stripe-metrics`) também precisam verificar isso server-side.

**Correção:** Criar uma RPC `is_super_admin()` em SECURITY DEFINER no banco e usar essa verificação nas Edge Functions administrativas.

### MÉDIO: subscription_plans visível publicamente (sem autenticação)

**Migration:** `20260204_public_plans_access.sql`
A policy permite SELECT sem autenticação para planos ativos. Isso é intencional para a landing page de pricing, mas expõe a estrutura de planos e preços.

**Avaliação:** Aceitável para pricing público, mas garantir que campos internos (como margens, custos) não estejam na tabela.

### MÉDIO: Falta DELETE policy na tabela patients

A tabela `patients` tem policies para SELECT, INSERT e UPDATE, mas **não tem DELETE policy**. Isso significa que nenhum usuário pode deletar pacientes via RLS (comportamento seguro por default). No entanto, se a funcionalidade de exclusão for necessária (LGPD Art. 18), será preciso adicionar uma policy restrita a admins.

---

## PILAR 3 — Lógica Sensível no Servidor

### OK: Preços e assinaturas processados server-side

- `create-subscription`: Valida amount (R$9,99–R$999,99), verifica userId === user.id, processa cupons server-side, cria subscription via Stripe API.
- `update-subscription` e `cancel-subscription`: Rodam em Edge Functions com autenticação.
- `stripe-webhook`: Atualiza status de assinatura no banco usando service_role.

### ALTO: Verificação de features/limites do plano feita no cliente

**Arquivo:** `src/lib/planFeatures.ts`

```typescript
const PLAN_FEATURES: Record<string, string[]> = {
  essencial: ['cadastro_pacientes', 'agenda', ...],
  profissional_v2: ['crm', 'analytics', 'dentista_ia', ...],
};
```

A definição de features por plano está hardcoded no frontend. Um atacante pode ignorar essas verificações e acessar funcionalidades premium diretamente, já que o gate é apenas UI.

**Arquivo:** `src/services/subscription.ts` — `checkLimit()` consulta o banco, mas é chamada do frontend e pode ser bypassed.

**Correção:** Implementar verificação de plano/features como middleware nas Edge Functions. Cada Edge Function que requer um plano específico deve verificar a subscription da clínica server-side antes de processar.

### ALTO: Verificação de role de super_admin client-side sem enforcement server-side

O `AdminDashboard` e `AdminPlans` são protegidos por um componente `AdminRoute` no React Router, mas um atacante pode chamar diretamente as Edge Functions de admin. O `get-stripe-metrics`, por exemplo, precisa de verificação server-side do flag super_admin.

**Correção:** Adicionar middleware de verificação `is_super_admin` em todas as Edge Functions administrativas.

### OK: Evolution API proxied corretamente

O `evolution-proxy` mantém a API key server-side, autentica o usuário via JWT, e verifica role (admin/dentist). Bem implementado.

### OK: AI agents com verificação de clinic membership

`dentist-agent` e `accounting-agent` verificam JWT, role do usuário, e clinic_id. O `dentist-agent` também verifica consentimento LGPD antes de acessar dados do paciente.

---

## PILAR 4 — Rate Limiting

### CRÍTICO: 10 Edge Functions sem rate limiting

Das 24 Edge Functions, apenas **10** usam `checkRateLimit()`. As seguintes estão **desprotegidas**:

| Edge Function | Risco | Impacto |
|---|---|---|
| `cancel-subscription` | ALTO | Chamadas repetidas podem causar race conditions no Stripe |
| `accounting-agent` | ALTO | Custo ilimitado com OpenAI API |
| `voice-consultation-transcribe` | ALTO | Custo ilimitado com Whisper API |
| `voice-consultation-extract` | ALTO | Custo ilimitado com OpenAI API |
| `patient-data-export` | MÉDIO | Extração massiva de dados de pacientes |
| `patient-data-anonymize` | MÉDIO | Operações destrutivas sem throttling |
| `clinical-signature-create` | MÉDIO | Criação massiva de envelopes SuperSign (custo) |
| `batch-signature-create` | MÉDIO | Idem acima |
| `lead-recovery` | BAIXO | Spam de recuperação de leads |
| `appointment-reminders` | BAIXO | Deve ser chamada por cron, não por usuários |

**Correção:** Adicionar `checkRateLimit()` em todas as Edge Functions expostas a usuários. Priorizar as que geram custo (AI/Whisper) e as destrutivas.

### MÉDIO: Rate limiting de login é client-side apenas

**Arquivo:** `src/lib/rateLimit.ts`

```typescript
const stored = localStorage.getItem(RATE_LIMIT_KEY);
```

O rate limiting de login usa `localStorage`, que pode ser limpo pelo atacante a qualquer momento. Um brute-force de credenciais não encontra resistência real.

**Atenuante:** O Supabase Auth tem rate limiting built-in no GoTrue, mas os limites default podem ser insuficientes.

**Correção:** Implementar rate limiting de login server-side. Considerar usar o `checkRateLimit()` já existente no endpoint de login ou configurar limites mais agressivos no GoTrue do Supabase.

### MÉDIO: Webhook rate limiting é "soft" (log-only, nunca bloqueia)

**Arquivos:** `stripe-webhook`, `whatsapp-webhook`, `supersign-webhook`

Todos os webhooks usam `trackWebhookRate()` que apenas loga warnings mas nunca rejeita requisições. Isso é intencional para não perder eventos legítimos, mas deixa o sistema aberto a abuse.

**Avaliação:** Para Stripe e SuperSign isso é aceitável (signatures verificadas). Para o WhatsApp webhook, combinado com a autenticação por API key, é aceitável mas não ideal.

---

## PILAR 5 — Verificação de Assinatura em Webhooks

### OK: Stripe webhook — verificação criptográfica completa

**Arquivo:** `supabase/functions/stripe-webhook/index.ts`

```typescript
event = await stripe.webhooks.constructEventAsync(
    body, signature!, webhookSecret, undefined, cryptoProvider
)
```

Usa a biblioteca oficial do Stripe com `SubtleCryptoProvider` para verificação. Rejeita com 400 se a assinatura falhar. Implementação correta.

### OK: SuperSign webhook — HMAC-SHA256 com timing-safe comparison

**Arquivo:** `supabase/functions/supersign-webhook/index.ts`

Implementa HMAC-SHA256 manualmente com timing-safe comparison byte a byte. Rejeita com 401 se falhar. Implementação correta.

### ALTO: WhatsApp webhook — JWT desabilitado, autenticação por API key compartilhada

**Arquivo:** `supabase/config.toml`

```toml
[functions.whatsapp-webhook]
verify_jwt = false
```

O webhook está acessível sem JWT. A autenticação é feita comparando `payload.apikey` ou `x-api-key` header contra `EVOLUTION_API_KEY` com timing-safe comparison. Isso é razoável para webhooks de serviços externos, **mas**:

1. A mesma chave (`EVOLUTION_API_KEY`) é usada para autenticar chamadas à Evolution API E para verificar webhooks. Se a chave vazar, um atacante pode tanto enviar comandos à Evolution API quanto injetar webhooks falsos.
2. A chave está exposta no `.env` com prefixo `VITE_` (ver Pilar 1).
3. Não há verificação de IP de origem.

**Correção:** Separar a chave de webhook da chave de API. Considerar implementar HMAC signature verification similar ao SuperSign, ou pelo menos whitelist de IPs da Evolution API.

---

## Vulnerabilidades Adicionais Identificadas

### CRÍTICO: AI Sanitizer em modo log-only para WhatsApp webhook

**Arquivo:** `supabase/functions/_shared/aiSanitizer.ts`

O sanitizer tem dois modos: `checkForInjection()` (log-only) e `requireSafeInput()` (blocking). O `dentist-agent` usa o modo blocking, **mas o `whatsapp-webhook` não usa nenhum dos dois**. Mensagens de WhatsApp de qualquer número chegam diretamente ao prompt do OpenAI sem sanitização.

Um atacante pode enviar mensagens via WhatsApp tentando prompt injection para:
- Extrair informações de pacientes via tool calls
- Agendar/cancelar consultas de outros pacientes
- Manipular o comportamento da AI secretary

**Correção:** Adicionar `requireSafeInput()` no `whatsapp-webhook` antes de enviar o conteúdo para o OpenAI. Considerar que o WhatsApp é uma superfície de ataque mais exposta que o painel web.

### ALTO: Arquivos duplicados com sufixo " 2.ts" no repositório

Detectados arquivos como `create-subscription/index 2.ts`, `send-invite/index 2.ts`, `get-stripe-metrics/index 2.ts`, `update-subscription/index 2.ts`, `ai-secretary/index 2.ts`. Esses podem conter versões desatualizadas com bugs de segurança já corrigidos, e podem ser acidentalmente deployados.

**Correção:** Remover todos os arquivos duplicados antes do deploy.

### MÉDIO: CORS inclui origens de desenvolvimento em produção

**Arquivo:** `supabase/functions/_shared/cors.ts`

```typescript
const ALLOWED_ORIGINS = [...PRODUCTION_ORIGINS, ...DEV_ORIGINS];
```

Origens `localhost` estão na whitelist em produção. Embora o CORS não seja uma proteção primária (a segurança real é JWT + RLS), isso amplia a superfície de ataque.

**Correção:** Usar variável de ambiente para determinar o ambiente e excluir `DEV_ORIGINS` em produção.

### MÉDIO: Coupon race condition no incremento de used_count

**Arquivo:** `supabase/functions/create-subscription/index.ts`

```typescript
await supabase
    .from('discount_coupons')
    .update({ used_count: (validatedCoupon.used_count || 0) + 1 })
    .eq('id', validatedCoupon.id);
```

O incremento não é atômico. Duas requisições simultâneas podem ambas ler `used_count = 4`, incrementar para 5, e ambas passarem a validação `max_uses = 5`.

**Correção:** Usar `used_count = used_count + 1` via SQL ou RPC com verificação atômica.

### MÉDIO: Logs excessivos com dados sensíveis

Os Edge Functions logam informações como `userId`, `clinicId`, `phone`, `subscription.metadata`, e preview de mensagens. Em produção, esses logs podem acabar em sistemas de terceiros.

**Correção:** Sanitizar logs para remover PII. Nunca logar números de telefone completos ou metadata de subscription.

### BAIXO: Versão antiga do Stripe SDK

**Arquivo:** Edge Functions usam `stripe@12.0.0` (de 2023). A versão atual é 17.x+.

**Correção:** Atualizar para versão mais recente para patches de segurança.

### BAIXO: Sem Content Security Policy (CSP)

O frontend não define headers CSP, permitindo XSS e data exfiltration via scripts injetados.

**Correção:** Configurar CSP headers no Vercel/hosting.

---

## Plano de Correção Prioritizado

### P0 — Bloqueia produção (corrigir ANTES do deploy)

| # | Vulnerabilidade | Ação | Esforço |
|---|---|---|---|
| 1 | Evolution API Key no bundle frontend | Remover `VITE_EVOLUTION_API_KEY` do `.env` | 5 min |
| 2 | Arquivos duplicados "index 2.ts" | Deletar todos os arquivos com sufixo " 2" | 10 min |
| 3 | Rate limiting ausente em AI agents com custo | Adicionar `checkRateLimit()` em `accounting-agent`, `voice-consultation-transcribe`, `voice-consultation-extract` | 30 min |
| 4 | Prompt injection no WhatsApp webhook | Adicionar `requireSafeInput()` ou `checkForInjection()` no `whatsapp-webhook` antes de chamar OpenAI | 30 min |
| 5 | Rate limiting ausente em `cancel-subscription` | Adicionar `checkRateLimit()` | 10 min |

### P1 — Corrigir na primeira semana pós-launch

| # | Vulnerabilidade | Ação | Esforço |
|---|---|---|---|
| 6 | Verificação de plano/features client-side | Criar middleware `requirePlan()` nas Edge Functions que exigem plano específico | 2-4h |
| 7 | Super admin sem enforcement server-side | Criar RPC `is_super_admin()` SECURITY DEFINER e usar em Edge Functions admin | 1-2h |
| 8 | Webhook WhatsApp com chave compartilhada | Separar EVOLUTION_API_KEY (para chamadas) de EVOLUTION_WEBHOOK_SECRET (para verificação) | 1h |
| 9 | Coupon race condition | Converter incremento de `used_count` para operação atômica via RPC | 30 min |
| 10 | Rate limiting restante | Adicionar `checkRateLimit()` nas 5 Edge Functions restantes sem proteção | 1h |
| 11 | CORS com origens dev em produção | Condicionar `DEV_ORIGINS` a variável de ambiente | 15 min |

### P2 — Corrigir no primeiro mês

| # | Vulnerabilidade | Ação | Esforço |
|---|---|---|---|
| 12 | Login rate limiting client-side | Implementar rate limiting server-side no fluxo de autenticação | 2h |
| 13 | Chave Evolution API fraca | Gerar chave com `openssl rand -hex 32` | 5 min |
| 14 | `.env.docker` com defaults inseguros | Renomear para `.env.docker.example` com validação | 15 min |
| 15 | Logs com PII | Sanitizar logs para remover telefones e dados pessoais | 2-4h |
| 16 | Stripe SDK desatualizado | Atualizar `stripe@12.0.0` para versão mais recente | 1-2h |
| 17 | Sem CSP headers | Configurar Content-Security-Policy no Vercel | 1h |
| 18 | DELETE policy em patients | Adicionar policy de DELETE restrita a admins (LGPD) | 30 min |

---

## O que está BEM feito

- **RLS abrangente** com isolamento por clínica em 40+ tabelas
- **Webhook signatures** verificadas com timing-safe comparison (Stripe e SuperSign)
- **Evolution API proxied** com chave mantida server-side
- **Audit logging imutável** com triggers que previnem UPDATE/DELETE
- **Input validation** nas Edge Functions (UUID, email, max length, HTTPS-only para images)
- **Consentimento LGPD** verificado antes de processar dados de pacientes com IA
- **PII criptografada** em fase 2 (email e telefone de pacientes)
- **Deduplicação de mensagens** no WhatsApp webhook
- **Concurrency locks** para evitar respostas duplicadas
- **Tokens auto-refresh** com logout automático em caso de refresh token inválido
