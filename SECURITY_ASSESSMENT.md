# Avaliação de Segurança - Organiza Odonto

**Data**: 13/02/2026  
**Versão avaliada**: 1.0.5 (build 16)  
**Escopo**: Aplicação mobile (React Native/Expo), Backend (Supabase), Edge Functions, Web

---

## Resumo Executivo

A aplicação possui uma base de segurança razoável com uso de armazenamento seguro de tokens, criptografia de dados sensíveis (CPF/RG) e políticas RLS habilitadas. No entanto, foram identificadas **vulnerabilidades críticas** que precisam de atenção imediata, especialmente em relação a isolamento multi-tenant e validação de dados.

### Contagem de Vulnerabilidades

| Severidade | Quantidade | Status |
|-----------|-----------|--------|
| 🔴 CRÍTICO | 6 | Requer ação imediata |
| 🟠 ALTO | 7 | Requer ação em curto prazo |
| 🟡 MÉDIO | 6 | Requer ação planejada |
| 🟢 BAIXO | 5 | Melhorias recomendadas |
| **Total** | **24** | |

---

## 🔴 VULNERABILIDADES CRÍTICAS

### C1. Credenciais reais no arquivo `.env` (se comprometido)

**Arquivos**: `.env`, `mobile/.env`  
**Status Git**: Estão no `.gitignore` e NÃO estão rastreados no git ✅  
**Risco**: Se o repositório for tornado público ou compartilhado, credenciais podem vazar.

**Credenciais expostas localmente**:
- Supabase URL e Anon Key
- Stripe LIVE Publishable Key (`pk_live_...`)
- Sentry DSN
- Evolution API Key

**Ações necessárias**:
- [ ] Verificar que `.env` nunca foi commitado no histórico (`git log --all -- .env`)
- [ ] Considerar rotação periódica de chaves
- [ ] Usar EAS Secrets para builds em produção ao invés de `.env` local
- [ ] Manter `.env.example` sem valores reais

---

### C2. Credenciais hardcoded no `docker-compose.yml`

**Arquivo**: `docker-compose.yml`  
**Detalhes**:
```
AUTHENTICATION_API_KEY=minhaChaveSecreta123
POSTGRES_PASSWORD=postgres
DATABASE_CONNECTION_URI=postgresql://postgres:postgres@...
```

**Ações necessárias**:
- [ ] Mover credenciais para variáveis de ambiente
- [ ] Usar `.env` não rastreado para valores do docker-compose
- [ ] Alterar senha padrão "postgres"

---

### C3. Políticas RLS com `WITH CHECK (true)` - Sem isolamento de dados

**Tabelas afetadas** (qualquer usuário autenticado pode inserir dados em qualquer clínica):
- `patient_documents` → `FOR ALL USING (true)` ⚠️ Mais grave
- `exams` → INSERT `WITH CHECK (true)`
- `locations` → INSERT e UPDATE `WITH CHECK (true)`
- `financial_transactions` → INSERT `WITH CHECK (true)`
- `patients` → INSERT `WITH CHECK (true)`
- `appointments` → INSERT `WITH CHECK (true)`
- `procedures` → INSERT `WITH CHECK (true)`
- `budgets` → INSERT `WITH CHECK (true)`
- `anamneses` → INSERT `WITH CHECK (true)`

**Impacto**: Um usuário autenticado de uma clínica pode inserir dados em outra clínica. Se houver trigger para definir `clinic_id`, há proteção parcial, mas se o trigger falhar, dados ficam órfãos.

**Ações necessárias**:
- [ ] Substituir `WITH CHECK (true)` por `WITH CHECK (clinic_id = get_user_clinic_id())`
- [ ] Ou manter trigger mas adicionar constraint `NOT NULL` em `clinic_id`
- [ ] Remover política `FOR ALL USING (true)` de `patient_documents`
- [ ] Testar todas as operações de INSERT após a mudança

---

### C4. `STRICT_VALIDATION` desabilitado

**Arquivo**: `mobile/src/lib/validation.ts:12`  
**Detalhes**: `STRICT_VALIDATION = false` - Schemas de validação existem mas NÃO são aplicados.

**Impacto**: Dados inválidos (CPF errado, email inválido, telefone incorreto) são salvos no banco.

**Ações necessárias**:
- [ ] Habilitar `STRICT_VALIDATION = true`
- [ ] Testar todos os formulários com validação habilitada
- [ ] Garantir que mensagens de erro são claras para o usuário

---

### C5. Formulários sem validação antes de salvar

**Arquivos afetados**:
- `mobile/src/components/patients/EditPatientModal.tsx` → Só verifica `name` e `phone`
- `mobile/app/(tabs)/patients.tsx` (NewPatientModal) → Sem validação
- `mobile/src/components/financial/NewExpenseModal.tsx` → Só verifica `description`

**Impacto**: Dados financeiros e de pacientes podem ser salvos sem validação de formato.

**Ações necessárias**:
- [ ] Integrar `safeValidate()` com schemas do `validation.ts` em todos os formulários
- [ ] Validar CPF, telefone e email antes de salvar pacientes
- [ ] Validar valor, data e categoria antes de salvar transações financeiras

---

### C6. Ausência de filtro `clinic_id` explícito nas queries do serviço

**Arquivos afetados**:
- `mobile/src/services/appointments.ts` → `getByDate()` sem filtro `clinic_id`
- `mobile/src/services/financial.ts` → `getTransactions()` filtra por `user_id` mas não `clinic_id`
- `mobile/src/services/patients.ts` → `getPatients()` sem filtro `clinic_id`

**Impacto**: Depende 100% do RLS para isolamento. Se RLS falhar ou for reconfigurada incorretamente, dados de outras clínicas podem ser expostos.

**Ações necessárias**:
- [ ] Adicionar `.eq('clinic_id', clinicId)` em todas as queries de serviço
- [ ] Criar helper `getCurrentClinicId()` para uso consistente
- [ ] Implementar defesa em profundidade (RLS + filtro na query)

---

## 🟠 VULNERABILIDADES DE ALTA SEVERIDADE

### A1. Rate limiting apenas no client-side

**Arquivo**: `mobile/src/lib/rateLimit.ts`  
**Detalhes**: Usa `AsyncStorage` (não criptografado) para controlar tentativas. Pode ser contornado reinstalando o app ou limpando o cache.

**Ações necessárias**:
- [ ] Implementar rate limiting no servidor (Supabase Auth config ou Edge Function)
- [ ] Manter rate limiting client-side apenas como UX

---

### A2. Sem rate limiting no signup

**Arquivo**: `mobile/app/signup.tsx`  
**Impacto**: Possibilidade de spam de criação de contas.

**Ações necessárias**:
- [ ] Adicionar rate limiting no fluxo de signup
- [ ] Considerar verificação de email obrigatória

---

### A3. Mensagens de erro do Supabase expostas diretamente

**Arquivo**: `mobile/src/contexts/AuthContext.tsx`  
**Detalhes**: Erros do Supabase são mostrados ao usuário sem sanitização.

**Impacto**: Pode revelar informações sobre emails válidos ou detalhes do sistema.

**Ações necessárias**:
- [ ] Usar mensagens genéricas: "Email ou senha incorretos"
- [ ] Logar erros detalhados apenas em ferramentas de monitoramento (Sentry)

---

### A4. Função `SECURITY DEFINER` com privilégios elevados

**Arquivo**: `supabase-multi-tenant-schema.sql`  
**Detalhes**: `get_user_clinic_id()` roda com permissões do dono da função.

**Impacto**: Se explorada, poderia bypassar RLS.

**Ações necessárias**:
- [ ] Auditar a função para garantir que não pode ser manipulada
- [ ] Considerar `SECURITY INVOKER` onde possível

---

### A5. `clinic_id` pode ser NULL em algumas tabelas

**Arquivo**: `supabase-fix-exams.sql`  
**Detalhes**: `ALTER TABLE exams ALTER COLUMN clinic_id DROP NOT NULL`

**Impacto**: Registros sem `clinic_id` podem não ser filtrados pelo RLS e ficar "invisíveis" ou acessíveis por qualquer pessoa.

**Ações necessárias**:
- [ ] Auditar tabelas para registros com `clinic_id` NULL
- [ ] Adicionar constraint `NOT NULL` em `clinic_id` para todas as tabelas principais
- [ ] Preencher registros existentes com NULL

---

### A6. `console.log` com dados sensíveis em produção

**Arquivos**:
- `mobile/app/secretary.tsx:628` → Loga `clinicId, messageContent`
- `mobile/src/services/secretary.ts:1265` → Loga dados de mensagens
- Diversos arquivos de serviço → Logs de debug

**Impacto**: Dados de clínica e pacientes podem ser expostos em logs.

**Ações necessárias**:
- [ ] Remover ou condicionar todos os `console.log` a ambiente de desenvolvimento
- [ ] Usar serviço de logging que sanitiza dados sensíveis

---

### A7. Políticas de Storage permissivas

**Arquivo**: `supabase-exams.sql`  
**Detalhes**: Qualquer usuário autenticado pode acessar o bucket `exams`.

**Impacto**: Documentos de exames de outras clínicas podem ser acessados.

**Ações necessárias**:
- [ ] Restringir políticas de storage por `clinic_id` ou pasta

---

## 🟡 VULNERABILIDADES MÉDIAS

### M1. Fallback para AsyncStorage (não criptografado) durante migração de tokens

**Arquivo**: `mobile/src/lib/secureStorage.ts`  
**Detalhes**: Se a migração de SecureStore não foi concluída, tokens podem ser lidos de `AsyncStorage`.

**Ações**: Definir prazo para remover fallback.

---

### M2. Inconsistência na sanitização de dados

**Arquivo**: `mobile/src/services/patients.ts`  
**Detalhes**: Apenas alguns campos são sanitizados (`address`, `allergies`), outros não (`name`, `email`, `cpf`).

**Ações**: Sanitizar todos os campos de texto antes de salvar.

---

### M3. Múltiplos arquivos SQL com políticas conflitantes

**Arquivos**: `supabase-multi-tenant-rls.sql`, `supabase-complete-data-isolation.sql`, `supabase-fix-insert-policies.sql`  
**Impacto**: Não é claro quais políticas estão ativas no banco.

**Ações**: Criar um script único que representa o estado atual das políticas.

---

### M4. JSON.parse sem tratamento de erros consistente

**Arquivos**: `NewBudgetModal.tsx`, `NewProcedureModal.tsx`  
**Impacto**: App pode crashar com dados malformados.

**Ações**: Envolver todas as chamadas JSON.parse em try-catch.

---

### M5. Schemas de validação existem mas não são utilizados

**Arquivo**: `mobile/src/lib/validation.ts`  
**Detalhes**: Schemas completos (`patientSchema`, `financialTransactionSchema`, `cpfSchema`, etc.) foram criados mas quase nenhum formulário os importa.

**Ações**: Integrar schemas em todos os handlers de submit.

---

### M6. Funções RPC podem ignorar RLS

**Arquivos**: `mobile/src/services/budgets.ts`, `TeamManagementModal.tsx`  
**Detalhes**: Chamadas `supabase.rpc()` podem rodar com `SECURITY DEFINER`.

**Ações**: Auditar todas as funções RPC no Supabase.

---

## 🟢 VULNERABILIDADES BAIXAS

### B1. Toggle de visibilidade de senha
Risco de "shoulder surfing". Aceitável como UX feature.

### B2. Variáveis `EXPO_PUBLIC_*` visíveis no bundle
Esperado para chaves públicas (anon key). RLS deve compensar.

### B3. Supabase client usa queries parametrizadas
Sem risco significativo de SQL injection via SDK.

### B4. Sem uso de `dangerouslySetInnerHTML`
Risco de XSS baixo em React Native (sem DOM).

### B5. Logs de console desabilitados em produção no `_layout.tsx`
Boa prática, mas alguns logs manuais escapam.

---

## Práticas Positivas Encontradas ✅

| Prática | Arquivo | Status |
|---------|---------|--------|
| Armazenamento seguro de tokens (Keychain/EncryptedSharedPreferences) | `secureStorage.ts` | ✅ |
| Configuração `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` | `secureStorage.ts` | ✅ |
| Auto-refresh de tokens com tratamento de erro | `supabase.ts` | ✅ |
| Validação forte de senha (12+ chars, mista) | `signup.tsx` | ✅ |
| Criptografia de CPF/RG no banco | Migration SQL | ✅ |
| Edge Functions sanitizam logs e erros | `errorHandler.ts` | ✅ |
| `.env` no `.gitignore` | `.gitignore` | ✅ |
| Proteção de rotas por autenticação | `_layout.tsx` | ✅ |
| Audit logging implementado | Supabase | ✅ |
| Dependabot configurado | GitHub | ✅ |

---

## Plano de Ação Priorizado

### Fase 1 - Imediata (1-2 dias)
1. 🔴 Verificar que `.env` nunca foi commitado no histórico git
2. 🔴 Remover credenciais hardcoded do `docker-compose.yml`
3. 🔴 Habilitar `STRICT_VALIDATION = true` e testar formulários
4. 🟠 Remover/condicionar `console.log` com dados sensíveis

### Fase 2 - Curto Prazo (1 semana)
5. 🔴 Substituir `WITH CHECK (true)` por checks com `clinic_id`
6. 🔴 Adicionar `NOT NULL` constraint em `clinic_id` de todas as tabelas
7. 🔴 Adicionar filtro `clinic_id` explícito em todas as queries de serviço
8. 🟠 Implementar rate limiting server-side

### Fase 3 - Médio Prazo (2-4 semanas)
9. 🟠 Sanitizar mensagens de erro exibidas ao usuário
10. 🟠 Restringir políticas de Storage por clínica
11. 🟡 Integrar schemas de validação em todos os formulários
12. 🟡 Consolidar scripts SQL em um estado único de políticas
13. 🟡 Auditar funções RPC e `SECURITY DEFINER`

### Fase 4 - Longo Prazo (1-2 meses)
14. 🟡 Implementar pre-commit hooks para prevenir commit de `.env`
15. 🟢 Adicionar scanning de segurança automatizado no CI/CD
16. 🟢 Implementar gestão de secrets (EAS Secrets para mobile, Supabase Secrets)

---

## Classificação Geral de Segurança

| Área | Nota | Comentário |
|------|------|-----------|
| Autenticação | ⭐⭐⭐⭐ | Boa, com SecureStore e validação de senha forte |
| Autorização (RLS) | ⭐⭐ | Existe mas com políticas permissivas demais |
| Isolamento Multi-Tenant | ⭐⭐ | Triggers ajudam, mas defesa em profundidade ausente |
| Validação de Dados | ⭐⭐ | Schemas criados mas não aplicados |
| Criptografia | ⭐⭐⭐⭐ | CPF/RG criptografados, tokens em SecureStore |
| Gerenciamento de Secrets | ⭐⭐⭐ | `.gitignore` correto, mas docker-compose expõe |
| Logging e Monitoramento | ⭐⭐⭐ | Sentry configurado, mas logs manuais vazam dados |
| Dependências | ⭐⭐⭐ | Dependabot ativo, poucas vulnerabilidades |

**Nota geral**: **6/10** - A aplicação tem fundamentos de segurança bons, mas precisa de reforço no isolamento multi-tenant e na validação de dados para estar pronta para produção com múltiplas clínicas.
