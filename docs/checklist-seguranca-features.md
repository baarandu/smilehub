# Checklist de Segurança para Novas Features

**Sistema:** Organiza Odonto
**Data:** 11/02/2026
**Versão:** 1.0

---

## Quando Usar Este Checklist

Este checklist é **obrigatório** antes de fazer deploy de:

- Nova Edge Function
- Novo fluxo que processe dados de pacientes
- Integração com serviço terceiro
- Modificação em Edge Function existente que altere fluxo de dados

---

## Checklist (12 itens)

### 1. CORS: `getCorsHeaders()` (nunca `*`)

- [ ] Importar `getCorsHeaders` e `handleCorsOptions` de `_shared/cors.ts`
- [ ] Usar `getCorsHeaders(req)` para todas as respostas
- [ ] Tratar `OPTIONS` com `handleCorsOptions(req)` no início da função
- [ ] **Nunca** usar `Access-Control-Allow-Origin: *`

```typescript
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";

// No início do handler:
const corsHeaders = getCorsHeaders(req);
if (req.method === "OPTIONS") {
  return handleCorsOptions(req);
}
```

### 2. Auth: JWT via `extractBearerToken()` + `clinic_users`

- [ ] Importar `extractBearerToken` de `_shared/validation.ts`
- [ ] Extrair e validar o token JWT
- [ ] Verificar usuário via `supabase.auth.getUser(token)`
- [ ] Verificar permissão na clínica via tabela `clinic_users`
- [ ] Registrar `AUTH_FAILURE` em caso de falha

```typescript
import { extractBearerToken } from "../_shared/validation.ts";

const token = extractBearerToken(req.headers.get("Authorization"));
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  log.audit(supabase, { action: "AUTH_FAILURE", table_name: "System" });
  throw new Error("Unauthorized");
}

// Verificar clinic_users
const { data: clinicUser } = await supabase
  .from("clinic_users")
  .select("role")
  .eq("user_id", user.id)
  .eq("clinic_id", clinicId)
  .single();

if (!clinicUser) throw new Error("Unauthorized");
```

### 3. Input: `validateUUID()`, `validateMaxLength()`, `validateRequired()`

- [ ] Validar todos os UUIDs recebidos (clinicId, patientId, etc.)
- [ ] Limitar tamanho de strings (mensagens, nomes, etc.)
- [ ] Validar campos obrigatórios
- [ ] Validar URLs de imagem com `validateImageUrls()` se aplicável

```typescript
import {
  validateUUID,
  validateMaxLength,
  validateRequired,
  validateImageUrls,
} from "../_shared/validation.ts";

validateUUID(clinicId, "clinicId");
validateUUID(patientId, "patientId");
validateMaxLength(message, 5000, "message");
validateRequired(action, "action");
```

### 4. Erros: `createErrorResponse()` (nunca `error.message`)

- [ ] Importar `createErrorResponse` de `_shared/errorHandler.ts`
- [ ] Usar no `catch` de toda Edge Function
- [ ] **Nunca** retornar `error.message` diretamente ao cliente
- [ ] **Nunca** usar `console.error(error)` — usar logger estruturado

```typescript
import { createErrorResponse } from "../_shared/errorHandler.ts";

try {
  // ... lógica da função
} catch (error: unknown) {
  return createErrorResponse(error, corsHeaders, "nome-da-funcao");
}
```

### 5. IA: `checkForInjection()` em inputs para modelos

- [ ] Aplicar em toda mensagem/texto que será enviado a um modelo de IA
- [ ] Registrar resultado suspeito (o módulo já faz log automaticamente)
- [ ] Considerar modo bloqueante para funções de alto risco

```typescript
import { checkForInjection } from "../_shared/aiSanitizer.ts";

const sanitizeResult = checkForInjection(userMessage, {
  functionName: "nome-da-funcao",
  userId: user.id,
  clinicId,
});
// sanitizeResult.suspicious indica se o input é suspeito
// sanitizeResult.matchedPatterns lista os padrões detectados
```

### 6. Rate Limiting: `checkRateLimit()` configurado

- [ ] Importar `checkRateLimit` de `_shared/rateLimit.ts`
- [ ] Definir limite adequado (considerar custo da operação e uso esperado)
- [ ] Aplicar **após** autenticação (usar `user.id` como identificador)

```typescript
import { checkRateLimit } from "../_shared/rateLimit.ts";

await checkRateLimit(supabase, user.id, {
  endpoint: "nome-da-funcao",
  maxRequests: 30,      // Ajustar conforme uso esperado
  windowMinutes: 60,    // Janela de tempo
});
```

**Referência de limites existentes:**

| Tipo de operação | Limite sugerido |
|------------------|----------------|
| Chamada a modelo caro (GPT-4o, Whisper) | 10-20/hora |
| Chamada a modelo leve (GPT-4o-mini) | 40-100/hora |
| Operação financeira (Stripe) | 5-10/hora |
| Leitura de dashboard | 20-60/hora |
| Export de dados | 5/hora |

### 7. Timeout: timeout explícito para chamadas externas

- [ ] Configurar timeout em chamadas `fetch` para APIs externas (OpenAI, Stripe, etc.)
- [ ] Timeout recomendado: 30-45s para IA, 15s para APIs REST

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s

try {
  const response = await fetch("https://api.openai.com/v1/...", {
    signal: controller.signal,
    // ...
  });
} finally {
  clearTimeout(timeoutId);
}
```

### 8. LGPD: dados anonimizados antes de enviar a terceiros

- [ ] **Nunca** enviar CPF, RG, endereço completo, telefone ou email de paciente à OpenAI
- [ ] Remover dados de contato do contexto antes de chamadas de IA
- [ ] Usar apenas dados clínicos necessários (nome, idade, histórico odontológico)
- [ ] Documentar em `docs/DPA-terceiros.md` se novo terceiro

### 9. Audit: operações sensíveis registradas via `log.audit()`

- [ ] Importar `createLogger` de `_shared/logger.ts`
- [ ] Registrar `AUTH_FAILURE` para falhas de autenticação
- [ ] Registrar operações de leitura de dados sensíveis (`READ`)
- [ ] Registrar criação, edição e exclusão (`CREATE`, `UPDATE`, `DELETE`)
- [ ] Registrar chamadas de IA (`AI_REQUEST`) com modelo e ferramentas usadas
- [ ] Registrar exports de dados (`EXPORT`)

```typescript
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("nome-da-funcao");

// Exemplo: audit de chamada de IA
log.audit(supabase, {
  action: "AI_REQUEST",
  table_name: "NomeDaEntidade",
  record_id: entityId,
  user_id: user.id,
  clinic_id: clinicId,
  details: { model: "gpt-4o", tools_used: ["tool1", "tool2"] },
});
```

### 10. Consentimento: `checkAiConsent()` antes de processar dados de paciente com IA

- [ ] Aplicável quando dados de um paciente específico são enviados a modelo de IA
- [ ] Verificar consentimento **antes** de montar o contexto com dados do paciente
- [ ] Registrar `CONSENT_DENIED` se consentimento não concedido

```typescript
import { requireAiConsent } from "../_shared/consent.ts";

// Lança ConsentError (403) se paciente não consentiu
await requireAiConsent(supabase, patientId, clinicId);
```

### 11. Criptografia: CPF/RG via `encrypt_pii()`, leitura via `patients_secure`

- [ ] **Escrita:** Inserir dados na tabela `patients` (trigger `encrypt_pii()` criptografa automaticamente)
- [ ] **Leitura:** Usar view `patients_secure` (descriptografa CPF/RG automaticamente)
- [ ] **Busca por CPF:** Usar coluna `cpf_last4` para busca (nunca buscar no CPF criptografado)
- [ ] **PostgREST joins:** Usar helper function para descriptografar dados em joins

```typescript
// Leitura (view descriptografa automaticamente)
const { data } = await supabase
  .from("patients_secure")
  .select("*")
  .eq("id", patientId);

// Busca por CPF (usar últimos 4 dígitos)
const { data } = await supabase
  .from("patients_secure")
  .select("*")
  .eq("cpf_last4", cpfUltimos4Digitos);
```

### 12. Retenção: configurar em `data_retention_config` se dados temporários

- [ ] Se a função cria dados temporários (sessões, cache, logs), configurar retenção
- [ ] Inserir configuração na tabela `data_retention_config`
- [ ] Cleanup automático executado diariamente via `pg_cron`

```sql
-- Exemplo: adicionar retenção para nova tabela
INSERT INTO data_retention_config (table_name, retention_days, description)
VALUES ('nova_tabela', 90, 'Dados temporários de feature X');
```

**Retenções existentes:**

| Tabela | Retenção | Justificativa |
|--------|----------|---------------|
| `voice_consultation_sessions` | 90 dias | Sessões de voz temporárias |
| `dentist_agent_conversations` | 180 dias | Histórico de chat IA |
| `api_rate_limits` | 1 dia | Contadores de rate limit |
| `audit_logs` | 730 dias | Compliance (2 anos) |

---

## Template: Nova Edge Function

Use este skeleton como ponto de partida para toda nova Edge Function:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
  extractBearerToken,
  validateUUID,
  validateMaxLength,
  validateRequired,
} from "../_shared/validation.ts";
import { createErrorResponse } from "../_shared/errorHandler.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { createLogger } from "../_shared/logger.ts";
// Importar se a função usa IA:
// import { checkForInjection } from "../_shared/aiSanitizer.ts";
// import { requireAiConsent } from "../_shared/consent.ts";

serve(async (req) => {
  // 1. CORS
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  // 2. Logger
  const log = createLogger("nome-da-funcao");

  try {
    // 3. Auth
    const token = extractBearerToken(req.headers.get("Authorization"));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      log.audit(supabase, {
        action: "AUTH_FAILURE",
        table_name: "System",
        details: { reason: "Invalid token" },
      });
      throw new Error("Unauthorized");
    }

    // 4. Rate Limit
    await checkRateLimit(supabase, user.id, {
      endpoint: "nome-da-funcao",
      maxRequests: 30,
      windowMinutes: 60,
    });

    // 5. Input Validation
    const body = await req.json();
    const clinicId = validateUUID(body.clinicId, "clinicId");

    // 6. Authorization (clinic_users)
    const { data: clinicUser } = await supabase
      .from("clinic_users")
      .select("role")
      .eq("user_id", user.id)
      .eq("clinic_id", clinicId)
      .single();
    if (!clinicUser) throw new Error("Unauthorized");

    // 7. (Se usa IA com dados de paciente) Consent check
    // await requireAiConsent(supabase, patientId, clinicId);

    // 8. (Se usa IA) AI Sanitizer
    // const sanitized = checkForInjection(body.message, {
    //   functionName: "nome-da-funcao",
    //   userId: user.id,
    //   clinicId,
    // });

    // ========================================
    // LÓGICA DA FUNÇÃO AQUI
    // ========================================

    // 9. Audit log
    log.audit(supabase, {
      action: "CREATE", // ou READ, UPDATE, DELETE, AI_REQUEST, EXPORT
      table_name: "NomeDaEntidade",
      record_id: "id-do-registro",
      user_id: user.id,
      clinic_id: clinicId,
      details: { /* contexto relevante */ },
    });

    // 10. Response
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    // 11. Error Handler (trata ValidationError, RateLimitError, ConsentError)
    return createErrorResponse(error, corsHeaders, "nome-da-funcao");
  }
});
```

---

## Referência Rápida: Módulos `_shared/`

| Módulo | Exports principais | Fase |
|--------|-------------------|------|
| `cors.ts` | `getCorsHeaders(req)`, `handleCorsOptions(req)` | 1 |
| `validation.ts` | `validateUUID()`, `validateMaxLength()`, `validateRequired()`, `validateImageUrls()`, `extractBearerToken()`, `sanitizeSearchTerm()`, `ValidationError` | 1 |
| `errorHandler.ts` | `createErrorResponse()`, `logError()` | 1 |
| `aiSanitizer.ts` | `checkForInjection()` | 1 |
| `rateLimit.ts` | `checkRateLimit()`, `RateLimitError` | 2 |
| `consent.ts` | `checkAiConsent()`, `requireAiConsent()`, `ConsentError` | 3 |
| `logger.ts` | `createLogger()` → `{ info, warn, error, debug, audit, requestId }` | 4 |

---

## Histórico de Versões

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 11/02/2026 | Versão inicial — 12 itens de checklist + template |
