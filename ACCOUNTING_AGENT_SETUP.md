# Agente de Contabilidade IA — Smile Care Hub

## Status Geral

| Etapa | Status |
|---|---|
| Migration SQL (tabelas + funções) | Concluido |
| Edge Function (OpenAI GPT-4o-mini) | Concluido |
| Frontend (chat + sidebar + quick actions) | Concluido |
| Auth (JWT + RLS + admin check) | Concluido |
| System Prompt (identidade + conhecimento) | Concluido |
| 12 Ferramentas (tools + executors) | Concluido |
| Base de conhecimento tributario | Concluido |
| Analise proativa (otimizacao fiscal) | Concluido |
| Diagnostico Tributario (modo 5) | Concluido |
| Quick Actions (6 botoes) | Concluido |
| Data atual no prompt | Concluido |
| Timeout + logs de timing | Concluido |
| RAG legislacao | Pendente |
| Conciliacao bancaria (OFX/PDF) | Pendente |
| Graficos interativos | Pendente |
| Multimodal (foto de nota) | Pendente |
| Executar acoes (gerar NF-e) | Pendente |

---

## Arquitetura

```
Frontend (React)
  |
  | POST /functions/v1/accounting-agent
  | Authorization: Bearer <JWT>
  |
  v
Edge Function (Deno)
  |
  |-- Supabase Auth (getUser com JWT)
  |-- Supabase DB (service role, bypass RLS)
  |-- OpenAI API (GPT-4o-mini com function calling)
  |
  v
12 Ferramentas (tools)
  |-- 4 RPCs SQL (get_monthly_summary, validate_bookkeeping, calculate_factor_r, calculate_simples_tax)
  |-- 8 queries diretas (search_transactions, compare_months, get_pending_transactions, etc.)
```

### Arquivos Principais

| Arquivo | Funcao |
|---|---|
| `supabase/functions/accounting-agent/index.ts` | Entry point — auth, historico, chamadas OpenAI, orquestracao |
| `supabase/functions/accounting-agent/systemPrompt.ts` | Personalidade, conhecimento, regras, modos de operacao |
| `supabase/functions/accounting-agent/tools.ts` | Definicao das 12 ferramentas (schema OpenAI) |
| `supabase/functions/accounting-agent/toolExecutors.ts` | Implementacao de cada ferramenta (queries SQL) |
| `src/pages/AccountingAgent.tsx` | Pagina principal do chat |
| `src/components/accounting/` | Componentes: ChatInterface, ChatInput, ChatMessage, ConversationSidebar, QuickActions |
| `src/hooks/useAccountingChat.ts` | Hook de envio de mensagens com optimistic updates |
| `src/hooks/useAccountingConversations.ts` | Hook de listagem de conversas |
| `src/services/accountingAgent.ts` | Service layer (fetch para Edge Function + queries Supabase) |
| `src/types/accountingAgent.ts` | Tipos TypeScript |
| `supabase/migrations/20260210_create_accounting_agent_tables_fixed.sql` | Migration SQL (tabelas, RPCs, RLS, triggers) |

---

## Configuracao

### Requisitos

- Conta OpenAI com creditos (API key)
- Projeto Supabase configurado
- Admin da clinica no sistema

### 1. Secrets do Supabase

Ja configurados:

| Secret | Status |
|---|---|
| `OPENAI_API_KEY` | Configurado |
| `SUPABASE_SERVICE_ROLE_KEY` | Configurado |
| `SUPABASE_URL` | Configurado |

Para alterar:
```bash
npx supabase secrets set OPENAI_API_KEY=sk-proj-xxx
```

### 2. Migration SQL

Ja aplicada via Supabase Dashboard. Arquivo: `supabase/migrations/20260210_create_accounting_agent_tables_fixed.sql`

Cria:
- Tabelas: `accounting_agent_conversations`, `accounting_agent_messages`
- RPCs: `calculate_factor_r`, `calculate_simples_tax`, `validate_bookkeeping`, `get_monthly_summary`
- RLS policies, triggers, indexes

### 3. Deploy da Edge Function

```bash
npx supabase functions deploy accounting-agent --no-verify-jwt
```

---

## 12 Ferramentas Disponiveis

### Consulta de Dados
| # | Ferramenta | Descricao | Fonte |
|---|---|---|---|
| 1 | `get_monthly_summary` | DRE simplificada do mes | RPC SQL |
| 2 | `validate_bookkeeping` | Auditoria de lancamentos | RPC SQL |
| 3 | `classify_transaction` | Sugerir categoria para transacao | Keywords + historico |
| 4 | `search_transactions` | Buscar transacoes com filtros | Query direta |
| 5 | `get_pending_transactions` | Transacoes sem categoria/comprovante | Query direta |

### Analise e Comparacao
| # | Ferramenta | Descricao | Fonte |
|---|---|---|---|
| 6 | `compare_months` | Comparar 2 meses lado a lado | Query direta |
| 7 | `get_top_expenses` | Ranking de despesas | Query direta |
| 8 | `get_revenue_by_payment_method` | Receitas por PIX/cartao/dinheiro | Query direta |

### Calculos (deterministicos — nunca alucina)
| # | Ferramenta | Descricao | Fonte |
|---|---|---|---|
| 9 | `calculate_factor_r` | Fator R para Simples Nacional | RPC SQL |
| 10 | `calculate_simples_tax` | DAS do Simples Nacional | RPC SQL |

### Documentos e Prazos
| # | Ferramenta | Descricao | Fonte |
|---|---|---|---|
| 11 | `get_fiscal_checklist` | Checklist de documentos por regime | Hardcoded + DB |
| 12 | `get_fiscal_deadlines` | Proximos vencimentos fiscais | Query direta |

---

## 6 Modos de Operacao

| Modo | Gatilho | Ferramentas | Formato |
|---|---|---|---|
| Classificar | "classifique", "categorize" | classify_transaction | Categoria + confianca + acao |
| Auditar | "audite", "problemas", "organizar" | validate_bookkeeping, get_pending_transactions | OK / Atencao / Pendencia |
| Fechar Mes | "feche", "fechamento", "DRE" | get_monthly_summary + calculate_simples_tax | DRE + impostos + diagnostico |
| Checklist | "checklist", "documentos", "contador" | get_fiscal_checklist | Lista com status + risco |
| Diagnostico Tributario | "pagar menos", "otimizar", "economizar" | calculate_factor_r + calculate_simples_tax (2x) | Simulacao Anexo III vs V + plano de acao |
| Pergunta Geral | Qualquer outra duvida contabil | Base de conhecimento | Resposta didatica |

---

## Base de Conhecimento

O system prompt inclui:

- **Regimes tributarios:** Simples Nacional (Anexo III e V com faixas completas), Lucro Presumido, Lucro Real, PF
- **Tabela comparativa** de regimes para clinicas
- **Glossario:** DAS, Fator R, Pro-labore, DRE, DEFIS, ECF, ISS, NFS-e, RPA, etc.
- **Prazos fiscais:** todos os vencimentos do ano
- **CNAE** principal para odontologia (8630-5/04)
- **NFS-e:** regras de emissao, codigo de servico, convenios
- **17 categorias** de despesas tipicas com exemplos
- **Despesas dedutiveis:** lista completa para clinicas
- **Pro-labore:** estrategias legais, relacao com Fator R
- **Livro-caixa:** regras para PF
- **10 erros contabeis comuns** em clinicas
- **Convenios:** como registrar, ISS retido, glosas

---

## Analise Proativa

O agente nao e passivo. Sempre que apresentar dados:

- **DAS/Fator R:** alerta se Anexo V, calcula economia potencial no Anexo III, sugere pro-labore minimo
- **Fechamento:** inclui diagnostico tributario automaticamente, compara com mes anterior
- **Classificacao:** alerta se confianca baixa ou transacao pessoal em conta PJ
- **Checklist:** destaca itens vencidos com risco de multa
- **Regra geral:** se detectar algo que custa dinheiro, avisa mesmo sem ser perguntado

---

## Quick Actions (6 Botoes)

| Botao | Prompt Enviado |
|---|---|
| Como pagar menos imposto? | Diagnostico tributario completo com simulacoes |
| Fechar mes | DRE + impostos + oportunidades de economia |
| O que falta organizar? | Transacoes pendentes (sem categoria, sem comprovante) |
| Onde estou gastando mais? | Ranking de despesas ultimos 3 meses |
| Proximos prazos fiscais | Vencimentos 30 dias + checklist pendente |
| Quanto recebi por forma de pagamento? | Receitas por PIX/cartao/dinheiro com taxas |

---

## Seguranca

- API key OpenAI fica no servidor (Edge Function secret)
- JWT extraido do header, validado com `getUser(token)`
- Service Role Key para bypass de RLS (necessario para ler clinic_users)
- Apenas admins podem acessar
- Historico limitado a 10 mensagens por request
- Timeout de 25s em cada chamada OpenAI
- Todas as conversas sao logadas no banco

---

## Custos

**OpenAI GPT-4o-mini:**
- ~$0.15 por 1M input tokens
- ~$0.60 por 1M output tokens
- Custo medio por mensagem: ~$0.002-0.005

**Por clinica ativa (mensal):**
- 100 mensagens: ~$0.30
- 500 mensagens: ~$1.50
- 1000 mensagens: ~$3.00

---

## Troubleshooting

### Erro: "OpenAI API error: 400"
Causa: Historico corrompido (tool_call_id mismatch).
Solucao: Iniciar nova conversa.

### Erro: "OpenAI API error: 429"
Causa: Creditos OpenAI esgotados.
Solucao: Adicionar creditos em platform.openai.com.

### Erro: "Only admins can use the accounting agent"
Causa: Usuario nao e admin da clinica.
Solucao: Verificar `clinic_users` no banco.

### Erro: "Unauthorized"
Causa: Token JWT expirado.
Solucao: Logout + login.

### Agente nao responde (loading infinito)
Causa: Timeout na Edge Function.
Solucao: Verificar logs no Dashboard > Edge Functions > accounting-agent > Logs.

### Agente usa ano 2024
Causa: Versao antiga do prompt sem data atual.
Solucao: Redeploy da Edge Function.

---

## Roadmap — Proximas Fases

### Fase 2 — Integracao de Dados
- [ ] RAG com legislacao fiscal (busca semantica em documentos)
- [ ] Conciliacao bancaria (parser OFX/PDF de extratos)
- [ ] Graficos interativos nas respostas
- [ ] Streaming de respostas (palavra por palavra)

### Fase 3 — Acoes
- [ ] Multimodal: foto de nota fiscal → lancamento automatico
- [ ] Gerar NFS-e automaticamente
- [ ] Emitir guia DAS
- [ ] Alertas automaticos por WhatsApp (prazo vencendo)

### Fase 4 — Inteligencia
- [ ] Previsao de faturamento (ML)
- [ ] Deteccao de anomalias em despesas
- [ ] Sugestao automatica de regime tributario com simulacao completa
- [ ] Benchmark: comparar metricas com media de clinicas do mesmo porte

---

**Ultima Atualizacao:** 2026-02-10
