# Configuração do Agente de Contabilidade IA

Este documento explica como configurar o Agente de Contabilidade IA no Smile Care Hub.

## 📋 Requisitos

- Conta no [Google AI Studio](https://aistudio.google.com) (gratuito)
- Projeto Supabase configurado
- Permissões de admin no Supabase

## 🚀 Passo a Passo

### 1. Obter API Key do Google Gemini

1. Acesse [Google AI Studio](https://aistudio.google.com)
2. Faça login com sua conta Google
3. Clique em "Get API Key"
4. Crie uma nova API key
5. Copie a chave (formato: `AIza...`)

> **💰 Custo:** O Gemini 1.5 Pro tem tier gratuito generoso (50 requests/dia). Para produção, o custo é ~$0.004 por mensagem (~$1-4/mês por clínica ativa).

### 2. Aplicar Migration SQL

#### Opção A: Via Supabase Dashboard (Recomendado)

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor** (sidebar esquerda)
3. Clique em **New Query**
4. Cole o conteúdo do arquivo:
   ```
   supabase/migrations/20260210_create_accounting_agent_tables.sql
   ```
5. Clique em **Run** (ou pressione Ctrl+Enter)
6. Verifique se apareceu "Success. No rows returned"

#### Opção B: Via CLI do Supabase

```bash
# Certifique-se de estar no diretório do projeto
cd smile-care-hub-main

# Aplique a migration
npx supabase db push

# Ou se preferir migration específica
npx supabase migration up --file 20260210_create_accounting_agent_tables.sql
```

### 3. Configurar API Key no Supabase

1. No Supabase Dashboard, vá em **Project Settings** → **Edge Functions**
2. Clique em **Secrets** (ou **Environment Variables**)
3. Adicione uma nova secret:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** Cole sua API key do Google AI Studio (ex: `AIzaSyAbc123...`)
4. Clique em **Add Secret**

> **⚠️ Importante:** A API key fica segura no servidor e nunca é exposta ao frontend.

### 4. Deploy da Edge Function

```bash
# Deploy da função accounting-agent
npx supabase functions deploy accounting-agent

# Ou deploy de todas as funções
npx supabase functions deploy
```

### 5. Testar a Integração

1. Faça login no sistema como **admin**
2. Vá em **Contabilidade IA** (sidebar)
3. Digite uma mensagem de teste: "Olá"
4. Você deve receber uma resposta do agente

#### Testes Recomendados (MVP)

**Teste 1: Classificação**
```
"Classifique: Mercado Livre - Material odontológico, R$ 450"
```
Esperado: Sugestão de categoria + confiança + justificativa

**Teste 2: Auditoria**
```
"Audite o mês atual"
```
Esperado: Lista de problemas (duplicidades, sem categoria, sem documento)

**Teste 3: Fechamento**
```
"Feche o mês anterior"
```
Esperado: DRE + DAS calculado (se Simples) + alertas

**Teste 4: Checklist**
```
"Mostre o checklist fiscal"
```
Esperado: Lista de documentos obrigatórios com status

## 🔍 Troubleshooting

### Erro: "GEMINI_API_KEY not configured"

**Causa:** API key não foi configurada ou não foi atualizada após deployment.

**Solução:**
1. Verifique se a secret foi adicionada corretamente
2. Re-deploy a Edge Function: `npx supabase functions deploy accounting-agent`
3. Aguarde ~1 minuto para propagação

### Erro: "Only admins can use the accounting agent"

**Causa:** Usuário não tem role de admin na clínica.

**Solução:**
1. Vá no Supabase Dashboard → Table Editor → `clinic_users`
2. Encontre o registro do usuário
3. Altere `role` para `'admin'`

### Erro: "Missing authorization header"

**Causa:** Problema de autenticação.

**Solução:**
1. Faça logout e login novamente
2. Limpe cache do navegador (Ctrl+Shift+Delete)
3. Verifique se o token JWT não expirou

### Erro: "Gemini API error: 429"

**Causa:** Limite de rate (50 requests/dia no tier gratuito).

**Solução:**
1. Aguarde 24h para reset
2. Ou upgrade para tier pago (opcional)

### Erro: SQL function not found (calculate_factor_r, etc.)

**Causa:** Migration não foi aplicada corretamente.

**Solução:**
1. Verifique no Supabase SQL Editor se as funções existem:
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name LIKE '%accounting%' OR routine_name LIKE '%factor%';
   ```
2. Se não existir, re-aplique a migration (Passo 2)

## 📊 Verificar se está Funcionando

### 1. Verificar Tabelas Criadas

No Supabase SQL Editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'accounting_agent%';

-- Deve retornar:
-- accounting_agent_conversations
-- accounting_agent_messages
```

### 2. Verificar Funções SQL Criadas

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'calculate_factor_r',
  'calculate_simples_tax',
  'validate_bookkeeping',
  'get_monthly_summary'
);

-- Deve retornar as 4 funções
```

### 3. Verificar RLS (Row Level Security)

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'accounting_agent%';

-- Deve retornar várias policies de RLS
```

### 4. Testar Função SQL Diretamente

```sql
-- Teste a função de resumo mensal (substitua o clinic_id)
SELECT get_monthly_summary(
  'YOUR_CLINIC_ID_HERE'::uuid,
  '2024-01-01'::date
);
```

## 🎯 Funcionalidades MVP

Uma vez configurado, o agente pode:

1. ✅ **Classificar transações** - Sugere categoria baseado em histórico
2. ✅ **Auditar mês** - Detecta duplicidades, sem documento, sem categoria
3. ✅ **Fechar mês** - DRE + DAS do Simples Nacional calculado
4. ✅ **Checklist fiscal** - Documentos obrigatórios por regime

## 🔐 Segurança

- ✅ API key do Gemini fica no servidor (Edge Function)
- ✅ RLS garante isolamento por clínica
- ✅ Apenas admins podem acessar
- ✅ Todas as conversas são logadas para auditoria
- ✅ Funções SQL são determinísticas (não alucina valores)

## 💰 Custos Estimados

**Gemini 1.5 Pro:**
- Tier gratuito: 50 requests/dia
- Tier pago: $0.004 por mensagem

**Por clínica ativa (mensal):**
- 100 mensagens: $0.40
- 500 mensagens: $2.00
- 1000 mensagens: $4.00

**Infraestrutura:**
- Supabase: $0 adicional (já incluso no plano atual)
- Edge Functions: $0 (incluído no tier free/pro do Supabase)

## 📚 Recursos Adicionais

- [Documentação do Gemini API](https://ai.google.dev/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Plano de Implementação Completo](/Users/vitor/.claude/plans/noble-soaring-abelson-agent-af0dfd5.md)

## 🐛 Reportar Problemas

Se encontrar bugs ou tiver sugestões:
1. Verifique os logs da Edge Function no Supabase Dashboard
2. Verifique o console do navegador (F12)
3. Documente o erro completo
4. Descreva os passos para reproduzir

## 📝 Próximas Fases (Roadmap)

Após o MVP funcional, as próximas features planejadas são:

**Fase 2 (3-6 semanas):**
- 📚 RAG legislação (busca semântica em docs fiscais)
- 🏦 Conciliação bancária (parser OFX/PDF)
- 📊 Gráficos interativos (code execution)

**Fase 3 (2-3 meses):**
- 📸 Multimodal (foto de nota → lançamento)
- 🤖 LangGraph workflows complexos
- 🚀 Executar ações (gerar NF-e, emitir boletos)

---

**Status:** ✅ MVP Pronto para Uso
**Última Atualização:** 2026-02-10
