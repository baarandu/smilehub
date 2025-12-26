# 🔐 Avaliação de Segurança - SmileHub / Organiza Odonto

**Data:** 24/12/2024  
**Última atualização:** 26/12/2024 08:37

---

## Mapeamento OWASP - 9 Vulnerabilidades Principais

| # | Vulnerabilidade | Status no Projeto | Nível |
|---|-----------------|-------------------|-------|
| 1 | Injeção de Código (SQL/NoSQL) | ✅ Protegido | Baixo |
| 2 | Cross-Site Scripting (XSS) | ✅ Protegido | Baixo |
| 3 | Validação de Upload de Arquivos | ⚠️ Parcial | Médio |
| 4 | Autenticação e Sessão | ⚠️ Parcial | Médio |
| 5 | Exposição de APIs/Dados Sensíveis | ✅ Corrigido | Baixo |
| 6 | CSRF (Cross-Site Request Forgery) | ✅ Protegido | Baixo |
| 7 | Componentes com Vulnerabilidades | ✅ Verificado | Baixo |
| 8 | Misconfiguration | ⚠️ Atenção | Médio |
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

### Status: ⚠️ PARCIAL

**O que verificamos:**
- ✅ Uploads vão para Supabase Storage (fora do webroot)
- ✅ Arquivos são armazenados com UUIDs (não nomes originais)
- ⚠️ Sem validação explícita de MIME type real
- ⚠️ Storage policies permitem qualquer arquivo autenticado

**Arquivos relacionados:**
- `supabase-storage-policies.sql`
- Buckets: `exams`, `clinic-assets`, `documents`

**Riscos identificados:**
- Usuário pode fazer upload de qualquer tipo de arquivo
- Sem limite de tamanho definido no código

**Recomendações:**
- [ ] Validar MIME type real do arquivo (não só extensão)
- [ ] Definir whitelist de extensões permitidas: `.jpg`, `.png`, `.pdf`
- [ ] Configurar limites de tamanho no Supabase Storage
- [ ] Adicionar scan de malware (Supabase não tem nativo)

---

## 4️⃣ Autenticação e Gerenciamento de Sessão

### Status: ⚠️ PARCIAL

**O que está BOM:**
| Aspecto | Status |
|---------|--------|
| Login com email/senha | ✅ Supabase Auth |
| Hash de senhas | ✅ bcrypt (Supabase) |
| Tokens JWT | ✅ Gerados pelo Supabase |
| Refresh Token | ✅ `autoRefreshToken: true` |
| Sessão persistida | ✅ SecureStore (mobile), localStorage (web) |
| Recuperação de senha | ✅ Via email |

**O que FALTA:**
| Aspecto | Status |
|---------|--------|
| 2FA/MFA | ❌ Não implementado |
| Política de senha complexa | ⚠️ Só mínimo 6 caracteres |
| Cookies HttpOnly | ⚠️ Supabase usa localStorage |
| Expiração curta de sessão | ⚠️ Padrão Supabase (1h JWT, 1 semana refresh) |
| Rate limiting login | ❌ Não implementado |

**Código atual:**
```typescript
// Signup - apenas tamanho mínimo
if (password.length < 6) {
    toast.error('A senha deve ter pelo menos 6 caracteres');
    return;
}
```

**Recomendações:**
- [ ] Implementar 2FA com Supabase Auth (SMS ou TOTP)
- [ ] Exigir senha com maiúscula, número e símbolo
- [ ] Implementar rate limiting para tentativas de login
- [ ] Adicionar bloqueio após X tentativas falhas

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

### Status: ⚠️ ATENÇÃO

**Problemas encontrados:**

| Configuração | Status | Problema |
|--------------|--------|----------|
| `.env` no `.gitignore` | ✅ OK | - |
| Credenciais hardcoded | 🔴 | Fallback no código |
| Storage público | ⚠️ | `clinic-assets` é público |
| Validação strict | ⚠️ | Desativada (`false`) |
| Audit triggers | ⚠️ | Comentados no SQL |

**Storage policies permissivas:**
```sql
-- clinic-assets é PÚBLICO para leitura
CREATE POLICY "Public access to clinic-assets"
ON storage.objects FOR SELECT
TO public  -- Qualquer um pode ver logos
USING (bucket_id = 'clinic-assets');
```

**Recomendações:**
- [ ] Revisar se `clinic-assets` precisa ser público
- [ ] Ativar `STRICT_VALIDATION = true`
- [ ] Ativar triggers de auditoria
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
1. ~~**Remover credenciais hardcoded**~~ ✅ FEITO (24/12/2024)
2. **Regenerar anon key** no dashboard Supabase (recomendado - chave ainda está no histórico Git)
3. ~~**Rodar `npm audit`**~~ ✅ FEITO - 2 moderate (dev only)

### ⚠️ ALTO (próxima semana)
4. ~~Ativar `STRICT_VALIDATION = true`~~ ✅ FEITO (26/12/2024)
5. ~~Ativar triggers de auditoria no banco~~ ✅ FEITO - 18 triggers ativos
6. Implementar validação de MIME type em uploads
7. Adicionar rate limiting para login

### 📋 MÉDIO (próximo mês)
8. Implementar 2FA (Supabase Auth suporta)
9. ~~Adicionar CSP headers~~ ✅ FEITO (26/12/2024) - `vercel.json`
10. ~~Configurar Dependabot no GitHub~~ ✅ FEITO - `.github/dependabot.yml`
11. Revisar storage policies por clínica

### 📝 BAIXO (backlog)
12. Integrar ferramenta de análise de logs
13. Configurar alertas de segurança
14. Fazer pentest profissional
15. Treinar equipe em segurança

---

## ✅ Checklist de Verificações Realizadas

### Injeção de Código
- [x] Busca por `eval()` - não encontrado
- [x] Verificação de prepared statements - Supabase SDK
- [x] Validação de schemas Zod

### XSS
- [x] Busca por `dangerouslySetInnerHTML` - 1 uso controlado
- [x] Verificação de escape em outputs - React automático
- [ ] CSP configurada

### Upload de Arquivos
- [x] Arquivos em storage externo (Supabase)
- [x] Nomes aleatórios (UUID)
- [ ] Validação de MIME type
- [ ] Limite de tamanho

### Autenticação
- [x] Hash de senhas (bcrypt via Supabase)
- [x] Tokens JWT
- [x] Refresh token
- [ ] 2FA/MFA
- [ ] Rate limiting

### APIs e Dados
- [x] RLS implementado
- [x] HTTPS
- [ ] Credenciais em variáveis de ambiente apenas
- [ ] Rate limiting

### CSRF
- [x] Bearer token (não cookies)
- [x] SPA architecture

### Dependências
- [x] npm audit executado ✅ (24/12/2024)
- [x] Dependabot configurado ✅ (24/12/2024)

### Configurações
- [x] .env no .gitignore
- [ ] Validação strict ativa
- [ ] Storage policies por clínica

### Logging
- [x] Tabela audit_logs
- [x] Função de logging
- [x] Triggers ativos ✅ (24/12/2024)
- [ ] Alertas configurados
