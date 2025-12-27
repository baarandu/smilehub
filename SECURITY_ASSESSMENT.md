# 🔐 Avaliação de Segurança - SmileHub / Organiza Odonto

**Data:** 24/12/2024  
**Última atualização:** 27/12/2024 11:15

---

## Mapeamento OWASP - 9 Vulnerabilidades Principais

| # | Vulnerabilidade | Status no Projeto | Nível |
|---|-----------------|-------------------|-------|
| 1 | Injeção de Código (SQL/NoSQL) | ✅ Protegido | Baixo |
| 2 | Cross-Site Scripting (XSS) | ✅ Protegido | Baixo |
| 3 | Validação de Upload de Arquivos | ✅ Corrigido | Baixo |
| 4 | Autenticação e Sessão | ✅ Melhorado | Baixo |
| 5 | Exposição de APIs/Dados Sensíveis | ✅ Corrigido | Baixo |
| 6 | CSRF (Cross-Site Request Forgery) | ✅ Protegido | Baixo |
| 7 | Componentes com Vulnerabilidades | ✅ Verificado | Baixo |
| 8 | Misconfiguration | ✅ Melhorado | Baixo |
| 9 | Monitoramento e Logging | ✅ Implementado | Baixo |

---

## 1️⃣ Injeção de Código (SQL/NoSQL/Command Injection)

### Status: ✅ PROTEGIDO

**O que verificamos:**
- ❌ Não há uso de `eval()` no código
- ✅ Supabase SDK usa prepared statements automaticamente
- ✅ Validação com Zod schemas em `src/lib/validation.ts`
- ✅ Queries via Supabase Client (não há SQL raw)

**Por que está protegido:**
```typescript
// Todas as queries usam o Supabase SDK que usa prepared statements
const { data } = await supabase
  .from('patients')
  .select('*')
  .eq('clinic_id', clinicId);  // Parâmetro escapado automaticamente
```

**Recomendações adicionais:**
- [x] Ativar `STRICT_VALIDATION = true` em `validation.ts` ✅ FEITO (26/12/2024)
- [ ] Adicionar validação server-side via Supabase Edge Functions

---

## 2️⃣ Cross-Site Scripting (XSS)

### Status: ✅ PROTEGIDO

**O que verificamos:**
- ✅ React escapa automaticamente outputs por padrão
- ✅ Único uso de `dangerouslySetInnerHTML` é controlado (CSS interno em `chart.tsx`)
- ✅ Não há interpolação de HTML de usuário
- ✅ Security headers configurados em `vercel.json` (26/12/2024)

**Proteções do React:**
```jsx
// React escapa automaticamente - seguro
<div>{userInput}</div>

// Único dangerouslySetInnerHTML - CSS interno, não vem do usuário
<style dangerouslySetInnerHTML={{ __html: cssVariables }} />
```

**Headers de segurança implementados:**
- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY`
- [x] `X-XSS-Protection: 1; mode=block`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 3️⃣ Falta de Validação de Entrada (Upload de Arquivos)

### Status: ✅ CORRIGIDO (26/12/2024)

**O que verificamos:**
- ✅ Uploads vão para Supabase Storage (fora do webroot)
- ✅ Arquivos são armazenados com UUIDs (não nomes originais)
- ✅ Validação de MIME type implementada (26/12/2024)
- ✅ Limite de tamanho: 10MB

**Validação implementada em:**
- `src/services/documents.ts` (web)
- `mobile/src/services/exams.ts` (mobile)

**Tipos permitidos:**
- Imagens: JPEG, PNG, GIF, WebP, HEIC
- Documentos: PDF

**Recomendações pendentes:**
- [x] Validar MIME type real do arquivo
- [x] Definir whitelist de extensões permitidas
- [x] Configurar limites de tamanho (10MB)
- [ ] Adicionar scan de malware (opcional - Supabase não tem nativo)

---

## 4️⃣ Autenticação e Gerenciamento de Sessão

### Status: ✅ MELHORADO (26/12/2024)

**O que está BOM:**
| Aspecto | Status |
|---------|--------|
| Login com email/senha | ✅ Supabase Auth |
| Hash de senhas | ✅ bcrypt (Supabase) |
| Tokens JWT | ✅ Gerados pelo Supabase |
| Refresh Token | ✅ `autoRefreshToken: true` |
| Sessão persistida | ✅ SecureStore (mobile), localStorage (web) |
| Recuperação de senha | ✅ Via email |
| Rate limiting login | ✅ 5 tentativas, bloqueio 15min |

**Rate Limiting implementado (26/12/2024):**
- Arquivos: `src/lib/rateLimit.ts`, `mobile/src/lib/rateLimit.ts`
- Configuração: 5 tentativas máximas, bloqueio de 15 minutos
- Avisos ao usuário: a partir de 2 tentativas restantes

> [!NOTE]
> **Implementação atual é frontend-only** (localStorage/AsyncStorage).
> Protege contra ataques simples de força bruta, mas pode ser bypassada por atacantes mais sofisticados.
> 
> **Recomendado para o futuro:** Migrar para Supabase Edge Function com Redis ou tabela de rate limiting no banco para proteção server-side.

**O que ainda FALTA:**
| Aspecto | Status |
|---------|--------|
| 2FA/MFA | ❌ Não implementado |
| Política de senha complexa | ⚠️ Só mínimo 6 caracteres |
| Cookies HttpOnly | ⚠️ Supabase usa localStorage |
| Expiração curta de sessão | ⚠️ Padrão Supabase (1h JWT, 1 semana refresh) |

**Recomendações pendentes:**
- [ ] Implementar 2FA com Supabase Auth (SMS ou TOTP)
- [ ] Exigir senha com maiúscula, número e símbolo
- [ ] Migrar rate limiting para server-side (Edge Function)

---

## 5️⃣ Exposição de Informações Sensíveis e APIs Inseguras

### Status: ✅ CORRIGIDO (24/12/2024)

**Problema original:**
- Credenciais Supabase hardcoded no código-fonte

**Correções aplicadas:**
- ✅ Removido fallback hardcoded de `src/lib/supabase.ts`
- ✅ Removido fallback hardcoded de `mobile/src/lib/supabase.ts`
- ✅ Adicionada validação que exige variáveis de ambiente
- ✅ Configuradas variáveis na Vercel (Production, Preview, Development)
- ✅ Verificado `.env` local (web e mobile)

**Código atualizado:**
```typescript
// Agora exige variáveis de ambiente - erro claro se não configuradas
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (!supabaseUrl) {
    throw new Error('Missing Supabase environment variables...');
}
```

**Proteções ativas:**
- ✅ RLS (Row Level Security) impede acesso a dados de outras clínicas
- ✅ anon key só funciona com RLS ativo
- ✅ HTTPS forçado pelo Supabase
- ✅ Variáveis de ambiente obrigatórias

**Próximos passos (opcionais):**
- [x] Remover fallback hardcoded das credenciais
- [x] Usar apenas variáveis de ambiente
- [ ] Regenerar a anon key no Supabase (recomendado)
- [ ] Implementar rate limiting via Supabase Edge Functions

---

## 6️⃣ CSRF (Cross-Site Request Forgery)

### Status: ✅ PROTEGIDO

**Por que está protegido:**
- ✅ Supabase usa Bearer Token (JWT) para autenticação
- ✅ Tokens não são enviados automaticamente como cookies
- ✅ SPA (Single Page Application) com fetch/axios

**Explicação:**
CSRF explora cookies enviados automaticamente. Como Supabase usa:
```typescript
// Token vai no header Authorization, não em cookie
headers: {
  'Authorization': `Bearer ${session.access_token}`
}
```
Requisições de outros sites não terão o token.

---

## 7️⃣ Componentes com Vulnerabilidades Conhecidas

### Status: ✅ VERIFICADO (24/12/2024)

**Resultado do npm audit:**

| Projeto | Critical | High | Moderate | Low |
|---------|----------|------|----------|-----|
| Web | 0 | 0 | 2 | 0 |
| Mobile | 0 | 0 | 0 | 0 |

**Vulnerabilidades encontradas (Web):**
- `esbuild` + `vite`: Moderate - afeta apenas servidor de desenvolvimento
- ⚠️ Fix requer Vite v7 (major update) - não urgente

**Configurações implementadas:**
- ✅ Dependabot configurado (`.github/dependabot.yml`)
- ✅ Verifica atualizações toda segunda-feira às 9h
- ✅ Monitora projeto web e mobile separadamente

**Próximos passos:**
- [x] Rodar `npm audit` regularmente
- [x] Configurar GitHub Dependabot
- [ ] Usar Snyk ou OWASP Dependency-Check (opcional)
- [ ] Criar política de atualização mensal

---

## 8️⃣ Misconfiguration (Configurações Incorretas)

### Status: ✅ MELHORADO (27/12/2024)

**Problemas corrigidos:**

| Configuração | Status | Problema |
|--------------|--------|----------|
| `.env` no `.gitignore` | ✅ OK | - |
| Credenciais hardcoded | ✅ CORRIGIDO | Removido fallback |
| Storage policies | ✅ CORRIGIDO | Isolamento por clinic_id |
| Validação strict | ✅ CORRIGIDO | Ativada |
| Audit triggers | ✅ CORRIGIDO | 18 triggers ativos |

**Storage policies implementadas (27/12/2024):**
- SQL: `supabase-storage-policies-by-clinic.sql`
- Código atualizado para usar path `{clinicId}/{filename}`
- Usuários só podem acessar arquivos da própria clínica

> [!NOTE]
> O bucket `clinic-assets` permanece público para leitura (logos são públicos em relatórios).
> A gestão de arquivos está isolada por clínica.

**Recomendações pendentes:**
- [x] Ativar `STRICT_VALIDATION = true`
- [x] Ativar triggers de auditoria
- [x] Implementar storage policies por clínica
- [ ] Fazer checklist de segurança antes de deploy

---

## 9️⃣ Monitoramento e Logging

### Status: ✅ IMPLEMENTADO (24/12/2024)

**O que foi configurado:**
- ✅ Tabela `audit_logs` criada
- ✅ Função `log_audit_action()` implementada
- ✅ RLS na tabela de logs (usuário só vê da sua clínica)
- ✅ **18 triggers ativos** monitorando ações críticas

**Triggers ativados:**

| Tabela | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|
| `patients` | ✅ | ✅ | ✅ |
| `budgets` | ✅ | ✅ | ✅ |
| `financial_transactions` | ✅ | ✅ | ✅ |
| `procedures` | ✅ | ✅ | ✅ |
| `exams` | ✅ | ✅ | ✅ |
| `anamneses` | ✅ | ✅ | ✅ |

**SQL aplicado:** `supabase-enable-audit-triggers.sql`

**Próximos passos (opcionais):**
- [x] Ativar triggers para tabelas críticas
- [ ] Integrar com Supabase Logs (dashboard)
- [ ] Configurar alertas no Supabase para:
  - Muitas tentativas de login falhas
  - Acessos de IPs incomuns
  - Exclusões em massa

---

## 📊 Resumo Comparativo

| Vulnerabilidade | Vídeo | Projeto | Gap |
|-----------------|-------|---------|-----|
| 1. SQL Injection | Crítico | ✅ OK | - |
| 2. XSS | Crítico | ✅ OK | Falta CSP |
| 3. Upload Files | Alto | ⚠️ Parcial | Validação MIME |
| 4. Auth/Session | Alto | ⚠️ Parcial | Falta 2FA |
| 5. API/Data Exposure | Crítico | 🔴 Crítico | **Chaves expostas** |
| 6. CSRF | Médio | ✅ OK | - |
| 7. Dependencies | Alto | ⚠️ ? | Não auditado |
| 8. Misconfiguration | Alto | ⚠️ Parcial | Storage público |
| 9. Logging | Alto | ⚠️ Parcial | Triggers off |

---

## 🎯 Plano de Ação Priorizado

### 🔴 URGENTE (fazer agora)
- [x] 1. ~~**Remover credenciais hardcoded**~~ ✅ FEITO (24/12/2024)
- [ ] 2. **Regenerar anon key** no dashboard Supabase (recomendado - chave ainda está no histórico Git)
- [x] 3. ~~**Rodar `npm audit`**~~ ✅ FEITO - 2 moderate (dev only)

### ⚠️ ALTO (próxima semana)
- [x] 4. ~~Ativar `STRICT_VALIDATION = true`~~ ✅ FEITO (26/12/2024)
- [x] 5. ~~Ativar triggers de auditoria no banco~~ ✅ FEITO - 18 triggers ativos
- [x] 6. ~~Implementar validação de MIME type em uploads~~ ✅ FEITO (26/12/2024)
- [x] 7. ~~Adicionar rate limiting para login~~ ✅ FEITO (26/12/2024) - 5 tentativas, bloqueio 15min

### 📋 MÉDIO (próximo mês)
- [ ] 8. Implementar 2FA (Supabase Auth suporta)
- [x] 9. ~~Adicionar CSP headers~~ ✅ FEITO (26/12/2024) - `vercel.json`
- [x] 10. ~~Configurar Dependabot no GitHub~~ ✅ FEITO - `.github/dependabot.yml`
- [x] 11. ~~Revisar storage policies por clínica~~ ✅ FEITO (27/12/2024)

### 📝 BAIXO (backlog)
- [ ] 12. Integrar ferramenta de análise de logs
- [ ] 13. Configurar alertas de segurança
- [ ] 14. Fazer pentest profissional
- [ ] 15. Treinar equipe em segurança

---

## ✅ Checklist de Verificações Realizadas

### Injeção de Código
- [x] Busca por `eval()` - não encontrado
- [x] Verificação de prepared statements - Supabase SDK
- [x] Validação de schemas Zod

### XSS
- [x] Busca por `dangerouslySetInnerHTML` - 1 uso controlado
- [x] Verificação de escape em outputs - React automático
- [x] CSP configurada ✅ (26/12/2024)

### Upload de Arquivos
- [x] Arquivos em storage externo (Supabase)
- [x] Nomes aleatórios (UUID)
- [x] Validação de MIME type ✅ (26/12/2024)
- [x] Limite de tamanho ✅ (26/12/2024) - 10MB

### Autenticação
- [x] Hash de senhas (bcrypt via Supabase)
- [x] Tokens JWT
- [x] Refresh token
- [ ] 2FA/MFA
- [x] Rate limiting ✅ (26/12/2024) - 5 tentativas, 15min bloqueio

### APIs e Dados
- [x] RLS implementado
- [x] HTTPS
- [x] Credenciais em variáveis de ambiente apenas ✅ (24/12/2024)
- [x] Rate limiting ✅ (26/12/2024)

### CSRF
- [x] Bearer token (não cookies)
- [x] SPA architecture

### Dependências
- [x] npm audit executado ✅ (24/12/2024)
- [x] Dependabot configurado ✅ (24/12/2024)

### Configurações
- [x] .env no .gitignore
- [x] Validação strict ativa ✅ (26/12/2024)
- [x] Storage policies por clínica ✅ (27/12/2024)

### Logging
- [x] Tabela audit_logs
- [x] Função de logging
- [x] Triggers ativos ✅ (24/12/2024)
- [ ] Alertas configurados
