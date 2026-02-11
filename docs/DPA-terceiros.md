# Acordo de Processamento de Dados com Terceiros (DPA)

**Sistema:** Smile Care Hub
**Data:** 11/02/2026
**Versão:** 1.0
**Base Legal:** LGPD Art. 26 (compartilhamento), Art. 39 (responsabilidade do operador)

---

## 1. Introdução

Este documento descreve os fluxos de dados pessoais compartilhados entre o Smile Care Hub (controlador) e os operadores terceirizados que processam dados em nome do sistema. O objetivo é assegurar conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018) e estabelecer obrigações contratuais claras.

**Escopo:** Aplica-se a todos os dados pessoais e dados sensíveis de saúde processados pelo sistema, incluindo dados de pacientes, profissionais e administrativos.

**Definições:**
- **Controlador:** Clínica odontológica que utiliza o Smile Care Hub
- **Operador:** Terceiro que processa dados em nome do controlador
- **Titular:** Paciente ou usuário cujos dados são processados
- **DPO:** Encarregado de Proteção de Dados da clínica

---

## 2. OpenAI

### 2.1 Visão Geral

| Item | Detalhe |
|------|---------|
| **Serviço** | API de modelos de linguagem e transcrição de áudio |
| **Modelos utilizados** | GPT-4o (Dentista IA), GPT-4o-mini (extração de consulta, secretária IA, contabilidade), Whisper-1 (transcrição de áudio) |
| **Protocolo** | HTTPS (TLS 1.2+) |
| **Região** | Servidores nos EUA (infraestrutura da OpenAI) |
| **Contrato** | OpenAI Business Terms / API Terms of Use |

### 2.2 Dados Enviados

| Contexto | Dados enviados | Edge Function |
|----------|---------------|---------------|
| Dentista IA (chat) | Mensagens do dentista, contexto clínico do paciente (nome, idade, histórico odontológico, procedimentos) | `dentist-agent` |
| Dentista IA (imagens) | URLs de imagens clínicas (radiografias, fotos) | `dentist-agent` |
| Transcrição de consulta | Áudio gravado da consulta (formato webm/ogg) | `voice-consultation-transcribe` |
| Extração de dados | Texto transcrito da consulta | `voice-consultation-extract` |
| Secretária IA | Mensagens do paciente via WhatsApp | `ai-secretary` |
| Agente contábil | Dados financeiros agregados (sem PII de pacientes) | `accounting-agent` |

### 2.3 Dados NÃO Enviados à OpenAI

Os seguintes dados **nunca** são incluídos nas chamadas à API:

- **CPF** — criptografado no banco via `encrypt_pii()`, nunca exposto a funções de IA
- **RG** — criptografado no banco via `encrypt_pii()`, nunca exposto a funções de IA
- **Endereço completo** — não incluído no contexto enviado
- **Telefone** — removido do contexto do Dentista IA (Fase 3.5)
- **Email do paciente** — removido do contexto do Dentista IA (Fase 3.5)
- **Dados de pagamento** — processados exclusivamente pelo Stripe

### 2.4 Medidas de Proteção Implementadas

1. **Consentimento granular:** `checkAiConsent()` verifica consentimento do paciente antes de processar dados com IA (LGPD Art. 6-7), implementado em `_shared/consent.ts`
2. **Anonimização:** Dados de contato (telefone, email) removidos antes do envio
3. **Anti prompt injection:** `checkForInjection()` detecta tentativas de manipulação de prompts (`_shared/aiSanitizer.ts`)
4. **Audit logging:** Todas as chamadas à OpenAI registradas em `audit_logs` com ação `AI_REQUEST`
5. **Rate limiting:** Limites por função (ex: 10/hora para transcrição Whisper)

### 2.5 Política de Retenção da OpenAI

- **API data retention:** Zero-day retention (dados não retidos após processamento, conforme API data usage policy)
- **Treinamento:** Dados enviados via API **não são usados** para treinar modelos (opt-out padrão para API)

---

## 3. Supabase

### 3.1 Visão Geral

| Item | Detalhe |
|------|---------|
| **Serviço** | Banco de dados PostgreSQL, autenticação, Edge Functions (Deno), Storage |
| **Infraestrutura** | AWS (região configurada no projeto) |
| **Protocolo** | HTTPS (TLS 1.2+) para todas as conexões |
| **Contrato** | Supabase Terms of Service / DPA |

### 3.2 Dados Armazenados

| Categoria | Dados | Tabela/Local |
|-----------|-------|-------------|
| Pacientes | Nome, data de nascimento, telefone, email, endereço, CPF (criptografado), RG (criptografado) | `patients` |
| Prontuário | Anamnese, consultas, procedimentos, exames, orçamentos | `anamneses`, `consultations`, `procedures`, `exams`, `budgets` |
| Agendamento | Datas, horários, status, profissional responsável | `appointments` |
| Financeiro | Transações, recibos, categorias | `financial_transactions` |
| Consultas por voz | Transcrições, dados extraídos | `voice_consultation_sessions` |
| Conversas IA | Histórico de chat com Dentista IA | `dentist_agent_conversations`, `dentist_agent_messages` |
| Usuários | Email, nome, papel (role), clínica | `auth.users`, `clinic_users` |
| Auditoria | Logs de todas as operações sensíveis | `audit_logs` |

### 3.3 Medidas de Proteção

1. **Criptografia em trânsito:** TLS 1.2+ para todas as conexões (API, Dashboard, Edge Functions)
2. **Criptografia em repouso:**
   - Discos criptografados pela AWS (AES-256)
   - CPF e RG adicionalmente criptografados via `pgcrypto` com chave armazenada em `_encryption_config`
   - Leitura de dados descriptografados via view `patients_secure`
3. **Row Level Security (RLS):** Ativado em todas as tabelas, políticas baseadas em `clinic_users`
4. **Autenticação:** JWT via `supabase.auth.getUser()` em todas as Edge Functions
5. **Service Role Key:** Usado apenas server-side em Edge Functions, nunca exposto ao cliente
6. **Retenção de dados:** Política configurada em `data_retention_config`, cleanup diário via `pg_cron`:
   - Sessões de voz: 90 dias
   - Conversas IA: 180 dias
   - Rate limits: 1 dia
   - Audit logs: 730 dias (2 anos)

---

## 4. Stripe

### 4.1 Visão Geral

| Item | Detalhe |
|------|---------|
| **Serviço** | Processamento de pagamentos e gestão de assinaturas |
| **Certificação** | PCI-DSS Level 1 (mais alto nível de conformidade) |
| **Protocolo** | HTTPS (TLS 1.2+) |
| **Região** | EUA (infraestrutura Stripe) |
| **Contrato** | Stripe Services Agreement / DPA |

### 4.2 Dados Processados pelo Stripe

| Dado | Finalidade |
|------|-----------|
| Email da clínica | Identificação do cliente Stripe |
| Nome da clínica | Exibição na fatura |
| Plano de assinatura | Gestão de cobrança |
| Dados de pagamento (cartão) | Processamento de cobrança (tokenizado, nunca armazenado localmente) |

### 4.3 Dados NÃO Enviados ao Stripe

- **Nenhum dado de paciente** é enviado ao Stripe
- Dados financeiros de pacientes (transações, recibos) são armazenados localmente no Supabase
- O Stripe processa apenas dados da clínica como entidade jurídica

### 4.4 Edge Functions Relacionadas

| Função | Dados trocados |
|--------|---------------|
| `create-subscription` | email, userId, planId |
| `update-subscription` | clinicId, newPlanId |
| `cancel-subscription` | clinicId |
| `get-stripe-metrics` | Métricas agregadas (somente leitura) |

---

## 5. Tabela Resumo

| Terceiro | Dados Processados | Base Legal (LGPD) | Retenção | Localização | Criptografia |
|----------|-------------------|-------------------|----------|-------------|-------------|
| **OpenAI** | Contexto clínico anonimizado, transcrições, mensagens | Art. 7 (consentimento) + Art. 11 (dados sensíveis de saúde) | Zero-day (API) | EUA | TLS em trânsito |
| **Supabase** | Todos os dados do sistema | Art. 7 (execução contratual) + Art. 11 (tutela da saúde) | Conforme `data_retention_config` | AWS (EUA) | TLS + AES-256 + pgcrypto (CPF/RG) |
| **Stripe** | Email, nome e plano da clínica, dados de pagamento | Art. 7 (execução contratual) | Conforme política Stripe | EUA | TLS + PCI-DSS |

---

## 6. Obrigações dos Operadores

Conforme LGPD Art. 39, os operadores devem:

1. **Processar dados apenas conforme instruções documentadas** do controlador
2. **Garantir confidencialidade** dos dados processados
3. **Implementar medidas de segurança** técnicas e organizacionais adequadas
4. **Notificar o controlador** em caso de incidente de segurança (ver `docs/resposta-incidentes.md`)
5. **Auxiliar o controlador** no atendimento a direitos dos titulares
6. **Excluir ou devolver dados** ao término da relação contratual
7. **Não subcontratar** sem autorização prévia do controlador

---

## 7. Direitos dos Titulares

Conforme LGPD Art. 18, os titulares (pacientes) podem:

| Direito | Implementação no Sistema |
|---------|------------------------|
| **Acesso aos dados** | Exportação JSON via `patient-data-export` (botão "Exportar Dados" na ficha do paciente) |
| **Correção** | Edição direta pelo profissional na ficha do paciente |
| **Exclusão** | Política de retenção automática + exclusão manual disponível |
| **Portabilidade** | Export JSON estruturado inclui todos os dados do paciente |
| **Revogação de consentimento IA** | Toggle na ficha do paciente (`PatientAiConsent`), revogação imediata |
| **Informação sobre compartilhamento** | Este documento (DPA) |

---

## 8. Revisão e Atualização

- Este documento deve ser revisado **semestralmente** ou quando houver alteração nos operadores/fluxos de dados
- Qualquer novo terceiro que processe dados pessoais deve ser adicionado antes da integração
- O DPO da clínica é responsável por manter este documento atualizado
- Histórico de versões deve ser mantido abaixo

### Histórico de Versões

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 11/02/2026 | Versão inicial — OpenAI, Supabase, Stripe |
