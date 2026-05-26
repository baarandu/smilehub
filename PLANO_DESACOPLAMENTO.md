# Plano de Desacoplamento: Supabase → Arquitetura Portável

## Contexto

O Smile Care Hub usa uma **arquitetura em camadas orientada a domínio, Supabase-first**: frontend web e mobile separados, serviços chamando Supabase diretamente, autenticação/autorização distribuídas entre client, contexts (`ClinicContext`), rotas protegidas (`PrivateRoute`), RLS e Edge Functions. Não é clean architecture nem hexagonal — é modular e pragmática, adequada ao estágio do produto.

O sócio quer migrar para AWS com servidor próprio no futuro. Este plano prepara o código para essa migração de forma incremental, sem quebrar a aplicação. Cada etapa tem testes obrigatórios antes de avançar.

**Princípio:** desacoplar primeiro, migrar depois. Autorização server-side real só existe quando houver servidor próprio (Etapa 5).

**Avaliação atual: 7,5/10**
- Velocidade de produto: 8/10
- Segurança relativa ao estágio: 8/10
- Escalabilidade arquitetural: 6/10
- Portabilidade e manutenção futura: 5,5/10

**Estado atual:**
- 57 services web + 48 services mobile (duplicação real, ex: `patients.ts` em ambos)
- 17 tabelas com RLS (segurança depende disso — enquanto não houver API própria, RLS é a barreira real)
- 26 Edge Functions com padrão consistente (JWT + rate limit + validation)
- ~75 testes unitários existentes (Vitest: budgetUtils, roles, validation, contentHash)
- CI existente em `.github/workflows/ci.yml` (build, lint, typecheck, testes)
- Auth **não** centralizada — distribuída entre PrivateRoute, ClinicContext e Supabase client direto
- Sem testes de integração, E2E, ou testes mobile

---

## Etapa 0 — Testes e CI Mais Fortes

**Objetivo:** Criar a rede de segurança que valida todas as etapas seguintes. Começar pelos testes unitários dos services, depois auth, depois poucos E2Es essenciais.

### 0.1 — Testes unitários dos services críticos (web)

**Arquivos a criar:**
- `src/test/services/patients.test.ts`
- `src/test/services/appointments.test.ts`
- `src/test/services/financial.test.ts`
- `src/test/services/budgets.test.ts`
- `src/test/services/procedures.test.ts`

**Abordagem:**
- Mockar o `supabase` client com `vi.mock('@/lib/supabase')`
- Testar que cada service chama os métodos corretos (`.from()`, `.select()`, `.eq()`, `.order()`)
- Testar tratamento de erros (quando supabase retorna `{ error }`)
- Testar transformações de dados (camelCase ↔ snake_case)
- **Não testar RLS** (isso será teste de integração futuro)

**Cobertura:** foco nos fluxos críticos (CRUD de pacientes, agendamentos, financeiro, orçamentos, procedimentos). Não perseguir % arbitrário — cobertura suficiente dos caminhos que quebram a app é mais valioso que 80% de código pouco relevante.

### 0.2 — Testes do fluxo de auth

**Arquivos a criar:**
- `src/test/contexts/ClinicContext.test.tsx`
- `src/test/components/PrivateRoute.test.tsx`

**O que testar:**
- ClinicContext: carrega dados da clínica, deriva `isAdmin`/`isDentist`, trata erro de sessão
- PrivateRoute: redireciona sem sessão, bloqueia sem subscription, permite super_admin

### 0.3 — Testes E2E essenciais (poucos, focados)

**Framework:** Playwright (adicionar ao projeto)

**Arquivos a criar (apenas 2-4 fluxos críticos):**
- `e2e/login.spec.ts` — login, redirecionamento, logout
- `e2e/patients.spec.ts` — listar, criar paciente
- `e2e/appointments.spec.ts` — criar agendamento
- `e2e/financial.spec.ts` — visualizar financeiro (opcional, se não travar)

**Configuração:**
- `playwright.config.ts` na raiz
- Usar ambiente de staging/dev do Supabase
- Adicionar script `"test:e2e": "playwright test"` ao `package.json`

### 0.4 — CI reforçado

**Modificar:** `.github/workflows/ci.yml` (já existe com build+lint+typecheck+test)

- Adicionar step de cobertura mínima (`vitest --coverage`)
- Adicionar job de E2E com Playwright
- Cobertura como métrica de acompanhamento (não como gate bloqueante por %)

### ✅ Gate de validação (Etapa 0 → 1)
```
✅ npm test -- --run (todos passam, incluindo novos)
✅ npm run test:e2e (2-4 fluxos críticos passam)
✅ Fluxos críticos cobertos (CRUD pacientes, agendamentos, financeiro)
✅ CI verde no GitHub Actions
✅ App funciona normalmente em staging
```

---

## Etapa 1 — Adapters/Gateways Supabase (Desacoplamento Leve)

**Objetivo:** Reduzir acoplamento dos services ao Supabase sem criar um repository pattern completo de cara. Camada fina que isola as queries.

> Em vez de inventar muita interface cedo, criar uma camada fina tipo `src/data/supabase/*` e mover as queries para lá. Menos cerimônia, já reduz acoplamento.

### 1.1 — Criar camada de data/gateways

**Diretório a criar:** `src/data/supabase/`

**Arquivos a criar:**
- `src/data/supabase/patients.ts` — queries de pacientes extraídas de `src/services/patients.ts`
- `src/data/supabase/appointments.ts` — queries de agendamentos
- `src/data/supabase/financial.ts` — queries financeiras
- `src/data/supabase/budgets.ts` — queries de orçamentos
- `src/data/supabase/procedures.ts` — queries de procedimentos
- `src/data/supabase/index.ts` — barrel export

**Padrão:** Extrair apenas as chamadas `supabase.from(...)` do service para o gateway. O service fica com lógica de negócio e transformações de dados.

```typescript
// src/data/supabase/patients.ts
import { supabase } from '@/lib/supabase'

export async function queryPatients(clinicId?: string) {
  let query = supabase.from('patients_secure').select('*').order('name')
  if (clinicId) query = query.eq('clinic_id', clinicId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function queryPatientById(id: string) {
  const { data, error } = await supabase
    .from('patients_secure')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}
// ...
```

### 1.2 — Regra de fronteira (crítico)

**A partir desta etapa, qualquer nova query Supabase só pode nascer em `src/data/supabase/*`.** Services não podem importar `@/lib/supabase` diretamente. Sem essa regra, o time extrai hoje e volta a acoplar amanhã.

- Adicionar lint rule ou code review checklist para garantir
- Considerar ESLint `no-restricted-imports` para bloquear `@/lib/supabase` em `src/services/`

### 1.3 — Migrar services para usar gateways

**Modificar:** os 5 services críticos

- Trocar `import { supabase } from '@/lib/supabase'` por imports do gateway
- Service mantém lógica de negócio, validações e transformações
- API pública do service não muda (hooks continuam iguais)
- Migrar um service por vez, rodar testes após cada um

### 1.4 — Testes dos gateways

**Arquivos a criar:**
- `src/test/data/patients.test.ts`
- `src/test/data/appointments.test.ts`
- etc.

**O que testar:**
- Gateway chama os métodos Supabase corretos
- Testes existentes dos services continuam passando
- Services não importam mais `@/lib/supabase` diretamente

### ✅ Gate de validação (Etapa 1 → 2)
```
✅ Todos os testes unitários passam (incluindo gateways)
✅ Todos os testes E2E passam (comportamento idêntico)
✅ Nenhum service crítico importa '@/lib/supabase' diretamente
✅ CI verde
✅ App funciona normalmente em staging
```

---

## Etapa 2 — Unificar Autenticação no Web

**Objetivo:** Centralizar a auth que hoje está espalhada em 3 lugares. Depois, abstrair em uma interface trocável.

**Situação atual:** Auth distribuída em:
- `PrivateRoute.tsx` — verifica sessão, subscription, terms
- `ClinicContext.tsx` — busca roles/clínica via `supabase.auth` + `clinic_users`
- `supabase` client direto — usado em services para `getUser()`

**Importante:** Unificar auth **não** significa jogar tudo num provider só. `PrivateRoute` hoje mistura autenticação (sessão), autorização (roles), paywall (subscription/trial) e compliance (terms). Essas são responsabilidades diferentes:
- **AuthProvider** — sessão, login, logout, getUser, onAuthStateChange
- **Paywall/subscription** — continua em `PrivateRoute` ou guarda dedicada
- **Terms acceptance** — continua em `PrivateRoute` ou componente dedicado

### 2.1 — Interface de auth

**Arquivo a criar:** `src/auth/interfaces.ts`

```typescript
export interface AuthProvider {
  signIn(email: string, password: string): Promise<AuthResult>
  signUp(email: string, password: string): Promise<AuthResult>
  signOut(): Promise<void>
  getSession(): Promise<Session | null>
  getUser(): Promise<User | null>
  onAuthStateChange(callback: AuthStateCallback): Unsubscribe
  resetPassword(email: string): Promise<void>
}
```

### 2.2 — Implementação Supabase

**Arquivo a criar:** `src/auth/supabase-auth.ts`

- Centralizar chamadas `supabase.auth.*` que hoje estão espalhadas em PrivateRoute, ClinicContext e services
- Wrapping na interface `AuthProvider`

### 2.3 — Unificar auth em um provider

**Arquivo a criar:** `src/auth/AuthProvider.tsx`

- Novo contexto que encapsula o `AuthProvider` interface
- ClinicContext passa a consumir este contexto em vez de chamar `supabase.auth` direto
- PrivateRoute passa a consumir este contexto

**Modificar:**
- `src/contexts/ClinicContext.tsx` — remover chamadas diretas a `supabase.auth`, usar AuthProvider
- `src/components/auth/PrivateRoute.tsx` — idem

### 2.4 — Services param de buscar user via auth provider

**Modificar:** services que chamam `supabase.auth.getUser()` diretamente — passar userId/clinicId explicitamente como parâmetro quando possível, em vez de depender de ClinicContext dentro do service. Isso mantém os services puros e testáveis.

### 2.5 — Testes

**Modificar:** testes existentes de ClinicContext e PrivateRoute
**Adicionar:** `src/test/auth/supabase-auth.test.ts`

- Testar com mock do AuthProvider
- Verificar que login/logout/redirect funcionam com a interface

### ✅ Gate de validação (Etapa 2 → 3)
```
✅ Todos os testes passam
✅ Testes E2E de login/logout/redirect passam
✅ ClinicContext e PrivateRoute não chamam supabase.auth diretamente
✅ CI verde
✅ App funciona em staging (login, navegação, permissões)
```

---

## Etapa 3 — Reduzir Duplicação Web/Mobile (Pacote Leve)

**Objetivo:** Extrair tipos, schemas e utilitários puros para um pacote compartilhado leve. Sem reestruturar toda a árvore de diretórios.

> Antes de um monorepo completo, extrair apenas o que é claramente compartilhável. Não mexer já em toda a estrutura `/apps/web`.

### 3.1 — Criar pacote compartilhado

**Diretório a criar:** `packages/shared/`

```
packages/
  shared/
    src/
      types/          (tipos de domínio: Patient, Appointment, Budget, etc.)
      utils/          (formatters.ts, validation.ts)
      auth/           (interfaces de auth da Etapa 2)
    package.json      (name: "@smile-care-hub/shared")
    tsconfig.json
```

**Configurar:** npm workspaces no `package.json` raiz

### 3.2 — Mover código compartilhado (apenas o que é puro)

**O que entra:**
- Tipos de domínio (não o `database.ts` auto-gerado, apenas interfaces/tipos customizados)
- Utilitários puros (`formatters.ts`, `validation.ts`, `budgetUtils.ts`)
- Schemas de validação (se houver Zod/Yup)

**O que NÃO entra:**
- Nada que dependa de ambiente (env vars, platform-specific)
- Nada que dependa de storage (AsyncStorage, SecureStore, localStorage)
- Nada que dependa de React, router, ou UI framework
- Nada que importe Supabase client
- Interfaces de auth podem entrar se forem puramente TypeScript (sem React context)

### 3.3 — Web e mobile importam do pacote

**Modificar:** imports no web e mobile para usar `@smile-care-hub/shared`

- Estrutura de diretórios do web e mobile **não muda** (sem `/apps/web`)
- Apenas imports atualizados

### 3.4 — Testes

- Testes do pacote compartilhado rodam independentemente
- Testes web e mobile continuam passando com novos imports
- CI adiciona job para testar o pacote

### ✅ Gate de validação (Etapa 3 → 4)
```
✅ npm test em cada workspace passa
✅ npm run build no web e mobile passa
✅ Testes E2E passam
✅ Tipos e utilitários duplicados removidos do web e mobile
✅ CI verde
✅ App web e mobile funcionam em staging
```

---

## Etapa 4 — Edge Functions → Handlers Portáveis

**Objetivo:** Separar lógica de negócio do runtime Deno/HTTP para facilitar futura migração para Express/Fastify na AWS.

### 4.1 — Extrair handlers de business logic

**Para cada Edge Function:**
- Separar: `handler.ts` (lógica pura) de `index.ts` (HTTP/Deno runtime)
- Handler recebe dados já validados, retorna resultado
- `index.ts` faz CORS, auth, validation, rate limit, e chama handler

```typescript
// supabase/functions/dentist-agent/handler.ts
export async function handleDentistAgent(req: DentistAgentRequest): Promise<DentistAgentResponse> {
  // lógica de negócio pura, sem Request/Response, sem Deno.serve
}

// supabase/functions/dentist-agent/index.ts
serve(async (req) => {
  // CORS, auth, validation, rate limit...
  const result = await handleDentistAgent(parsedRequest)
  return new Response(JSON.stringify(result), { headers: corsHeaders })
})
```

### 4.2 — Padronizar request/response

**Arquivo a criar:** `supabase/functions/_shared/types.ts`

```typescript
export interface FunctionRequest<T> {
  user: { id: string; email: string }
  clinicId: string
  body: T
}

export interface FunctionResponse<T> {
  data?: T
  error?: { message: string; code: string }
}
```

### 4.3 — Testes dos handlers

**Arquivos a criar:** `supabase/functions/*/handler.test.ts`

- Testar handlers isolados (sem HTTP, sem Deno)
- Mockar Supabase client
- Cobertura dos 5 handlers mais críticos (dentist-agent, accounting-agent, send-invite, clinical-signature-create, voice-consultation-extract)

### 4.4 — Documentação de mapeamento

**Arquivo a criar:** `docs/edge-functions-to-api.md`

- Mapeamento: Edge Function → futuro endpoint AWS (método HTTP, path, body, resposta)
- Serve como spec para a API própria na Etapa 5

### ✅ Gate de validação (Etapa 4 → 5)
```
✅ Todos os handlers têm testes
✅ Edge Functions funcionam igual em staging
✅ Handlers são portáveis (sem dependência de Deno.serve ou Request/Response)
✅ CI verde
✅ Mapeamento Edge Function → endpoint documentado
```

---

## Etapa 5 — API Própria (Servidor + Autorização Real)

**Objetivo:** Criar API própria (Express/Fastify) que substitui Edge Functions e adiciona autorização server-side real. Só nesta etapa faz sentido mover autorização para a camada de aplicação, porque agora existe um servidor entre o cliente e o banco.

> Autorização no frontend (Etapa 3 do plano original) não substitui RLS. Enquanto queries saem do browser com anon key, a barreira real é o banco. Autorização server-side só é real quando existe um servidor seu.

### 5.0 — Validação em paralelo (antes de trocar infra)

**Subir a API própria usando o mesmo banco Supabase atual**, rodando em paralelo. O frontend continua apontando para o Supabase; a API roda em staging e recebe tráfego de teste.

**Objetivo:** Validar que os handlers portados (Etapa 4) funcionam corretamente via API, antes de fazer qualquer troca de infra.

- Testar todos os endpoints contra o banco real
- Comparar respostas da API com respostas das Edge Functions
- Corrigir divergências antes de apontar o frontend
- Só quando a API estiver estável, migrar o frontend para apontar para ela

### 5.1 — Scaffold da API

**Estrutura:**
```
api/
  src/
    middleware/     (auth, cors, rate-limit, validation)
    routes/         (handlers portados da Etapa 4)
    auth/           (JWT verification, authorization)
    db/             (conexão direta ao Postgres, sem Supabase client)
  Dockerfile
  package.json
```

### 5.2 — Middleware de autorização (agora server-side)

```typescript
// api/src/auth/authorization.ts
export function assertClinicAccess(userId: string, clinicId: string): Promise<void>
export function assertRole(userId: string, requiredRole: Role): Promise<void>
export function assertPatientAccess(userId: string, patientId: string): Promise<void>
```

**Agora sim é defesa real:** o servidor valida antes de tocar no banco. O cliente não tem acesso direto ao Postgres.

### 5.3 — Frontend aponta para API

**Modificar:** gateways da Etapa 1 para fazer fetch à API em vez de chamar Supabase diretamente

- Trocar `supabase.from(...)` por `fetch('/api/...')`
- Mesma interface do gateway, implementação diferente

### 5.4 — RLS pode ser simplificado (com cautela)

- Com autorização server-side **e** acesso direto do cliente ao banco eliminado, RLS pode ser simplificado gradualmente
- Só simplificar RLS **depois** de a API estar estável em produção e o frontend não mais falar direto com Supabase
- O banco passa a ser acessado apenas pelo servidor (service role), não pelo browser

### 5.5 — Infraestrutura AWS

```
Route 53 → CloudFront → ALB
                          ↓
                     ECS Fargate (Node API)
                          ↓
                     RDS PostgreSQL (sa-east-1 / São Paulo)
                          ↓
                     S3 (storage) + SES (email)
                     Cognito (auth) — usando interface da Etapa 2
```

### ✅ Gate de validação (Etapa 5 → Produção)
```
✅ API responde corretamente para todos os endpoints
✅ Autorização server-side bloqueia acesso cross-clinic
✅ Testes de integração da API passam
✅ Testes E2E passam apontando para a API
✅ Performance: latência < 200ms p95
✅ Deploy automatizado via CI/CD
✅ Rollback testado
```

---

## Resumo de Impacto por Etapa

| Etapa | Risco | O que muda | Segurança |
|-------|-------|------------|-----------|
| 0 - Testes | Zero | Adiciona testes, reforça CI | Sem impacto |
| 1 - Gateways | Baixo | Extrai queries dos services | RLS continua como barreira |
| 2 - Auth | Médio | Unifica auth dispersa | RLS continua como barreira |
| 3 - Pacote leve | Baixo | Elimina duplicação web/mobile | Sem impacto |
| 4 - Handlers | Baixo | Separa lógica do runtime | RLS continua como barreira |
| 5 - API própria | Alto | Servidor próprio + auth server-side | Autorização real na app layer |

**Nota sobre segurança:** Enquanto não existir API própria (Etapas 0-4), **RLS é a barreira real de segurança**. Não remover, não simplificar, não confiar em checks no frontend como substituto.

**Prioridade real:** Etapas 0, 1 e 2 são o core. Etapa 5 só deve começar quando essas três estiverem estáveis em produção.

---

## Arquivos Críticos (referência rápida)

- `src/lib/supabase.ts` — cliente Supabase web
- `mobile/src/lib/supabase.ts` — cliente Supabase mobile (SecureStorageAdapter)
- `src/contexts/ClinicContext.tsx` — contexto de clínica + auth (multi-tenant, busca roles/sessão)
- `src/components/auth/PrivateRoute.tsx` — guarda de rotas (sessão + subscription + terms)
- `src/services/patients.ts` — service mais complexo (criptografia, views, search)
- `supabase/functions/_shared/` — módulos compartilhados das Edge Functions (cors, validation, logger, rateLimit, etc.)
- `.github/workflows/ci.yml` — pipeline CI existente
- `vite.config.ts` — configuração de build + testes (Vitest)
