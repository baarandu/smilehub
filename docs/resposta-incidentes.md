# Procedimento de Resposta a Incidentes de Segurança

**Sistema:** Organiza Odonto
**Data:** 11/02/2026
**Versão:** 1.0
**Base Legal:** LGPD Art. 48 (comunicação de incidentes)

---

## 1. Objetivo

Estabelecer procedimentos operacionais para identificação, contenção, resolução e comunicação de incidentes de segurança envolvendo dados pessoais, conforme exigido pela LGPD Art. 48.

---

## 2. Definição de Incidente

Um incidente de segurança é qualquer evento que comprometa a **confidencialidade, integridade ou disponibilidade** de dados pessoais processados pelo Organiza Odonto. Inclui:

- Acesso não autorizado a dados de pacientes
- Vazamento ou exposição de dados pessoais
- Perda ou destruição não intencional de dados
- Alteração indevida de registros
- Comprometimento de credenciais de acesso
- Exploração de vulnerabilidades no sistema

---

## 3. Classificação de Severidade

### Nível Crítico

**Impacto:** Dados sensíveis de saúde expostos externamente. Requer ação imediata.

| Exemplo | Indicador |
|---------|-----------|
| Vazamento de dados de pacientes (CPF, prontuário) | Dados encontrados em fontes externas ou relatados por terceiros |
| Comprometimento da chave de criptografia (`_encryption_config`) | Acesso não autorizado detectado na tabela de configuração |
| Acesso não autorizado à service role key do Supabase | Requisições com service role key de origem desconhecida |
| Exfiltração de banco de dados | Volume anormal de queries ou export detectado |
| Ransomware ou comprometimento de infraestrutura | Sistema indisponível com sinais de acesso malicioso |

### Nível Alto

**Impacto:** Falha de segurança com potencial de exposição de dados. Ação em até 4 horas.

| Exemplo | Indicador |
|---------|-----------|
| Falha de autenticação explorada (bypass de JWT) | `AUTH_FAILURE` em massa nos audit_logs sem padrão de usuário legítimo |
| Escalação de privilégios (usuário com role indevido) | Ações de `admin` por usuários com role `receptionist` |
| Falha no RLS permitindo acesso cross-clinic | Dados de outra clínica retornados em queries |
| Prompt injection bem-sucedida extraindo dados | Padrão `checkForInjection` detectado com resposta contendo PII |
| Rate limiting bypassado em larga escala | Requisições acima do limite sem `RATE_LIMIT_EXCEEDED` nos logs |

### Nível Médio

**Impacto:** Vulnerabilidade identificada sem evidência de exploração. Ação em até 24 horas.

| Exemplo | Indicador |
|---------|-----------|
| Edge Function retornando `error.message` ao cliente | Mensagem de erro detalhada visível na resposta HTTP |
| CORS configurado incorretamente em nova função | `Access-Control-Allow-Origin: *` detectado |
| Dados de paciente enviados à OpenAI sem consentimento | `CONSENT_DENIED` não registrado antes de `AI_REQUEST` |
| Logs contendo dados sensíveis (CPF, tokens) | Dados sensíveis encontrados em logs do Supabase |
| Backup não criptografado exposto | Arquivo de backup acessível sem autenticação |

### Nível Baixo

**Impacto:** Problema de segurança menor, sem exposição de dados. Ação em até 72 horas.

| Exemplo | Indicador |
|---------|-----------|
| Tentativas de login com força bruta (bloqueadas) | Múltiplos `AUTH_FAILURE` do mesmo IP |
| Prompt injection detectada e bloqueada | `checkForInjection` reportou padrão suspeito, sem vazamento |
| Rate limit atingido por uso legítimo | `RATE_LIMIT_EXCEEDED` de usuário real com uso intenso |
| Certificado TLS próximo do vencimento | Alerta de renovação |

---

## 4. Fases de Resposta

### Fase 1 — Identificação (0-30 min)

**Objetivo:** Confirmar o incidente e classificar a severidade.

**Ações:**

1. **Verificar o alerta:** Confirmar se o evento é um incidente real (não falso positivo)
2. **Consultar o dashboard de segurança:** Acessar `/admin/seguranca` para verificar:
   - Picos anormais em eventos de segurança
   - `AUTH_FAILURE` em volume fora do padrão
   - `RATE_LIMIT_EXCEEDED` concentrados
   - Ações incomuns (ex: `EXPORT` em massa)
3. **Consultar audit_logs diretamente** (se necessário):
   ```sql
   -- Eventos das últimas 2 horas por ação
   SELECT action, function_name, user_id, created_at, new_data
   FROM audit_logs
   WHERE created_at > NOW() - INTERVAL '2 hours'
   ORDER BY created_at DESC
   LIMIT 100;

   -- Eventos de um usuário específico
   SELECT action, table_name, function_name, new_data, created_at
   FROM audit_logs
   WHERE user_id = '<user_id>'
   AND created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```
4. **Verificar logs do Supabase:** Dashboard do Supabase → Logs → Edge Functions
5. **Classificar a severidade** conforme seção 3
6. **Registrar o incidente:**
   - Data/hora de detecção
   - Quem detectou
   - Descrição inicial
   - Severidade atribuída
   - Sistemas/dados afetados

### Fase 2 — Contenção (30 min - 2h)

**Objetivo:** Limitar o impacto e prevenir propagação.

**Ações por severidade:**

#### Crítico/Alto
- **Revogar acessos comprometidos:** Desabilitar usuário no Supabase Auth
  ```
  Supabase Dashboard → Authentication → Users → Ban user
  ```
- **Rotacionar credenciais:** Se chaves foram expostas:
  - OpenAI: regenerar API key em platform.openai.com
  - Stripe: regenerar API keys em dashboard.stripe.com
  - Supabase: regenerar service role key (Supabase Dashboard → Settings → API)
  - Atualizar secrets nas Edge Functions:
    ```bash
    supabase secrets set OPENAI_API_KEY=nova-chave
    ```
- **Isolar função comprometida:** Desabilitar Edge Function temporariamente
  ```bash
  # Renomear para desabilitar deploy
  mv supabase/functions/<nome>/index.ts supabase/functions/<nome>/index.ts.disabled
  supabase functions deploy <nome>
  ```
- **Bloquear IP suspeito** (se aplicável): Configurar em Supabase Network Restrictions

#### Médio/Baixo
- **Corrigir a configuração** imediatamente (ex: CORS, error handler)
- **Deploy da correção:**
  ```bash
  supabase functions deploy <nome-da-funcao>
  ```
- **Monitorar** por 24h via dashboard `/admin/seguranca`

### Fase 3 — Erradicação (2h - 24h)

**Objetivo:** Remover a causa raiz do incidente.

**Ações:**

1. **Identificar o vetor de ataque:**
   - Analisar audit_logs para reconstruir a sequência de eventos
   - Verificar se o ataque explorou vulnerabilidade conhecida
   - Buscar por indicadores de comprometimento em outras funções
2. **Corrigir a vulnerabilidade:**
   - Aplicar patch no código (seguir `docs/checklist-seguranca-features.md`)
   - Testar localmente: `npx vite build` (verificação rápida de build)
   - Deploy: `supabase functions deploy <nome>`
3. **Verificar dados afetados:**
   ```sql
   -- Verificar se dados foram acessados/modificados
   SELECT * FROM audit_logs
   WHERE created_at BETWEEN '<inicio_incidente>' AND '<fim_incidente>'
   AND action IN ('READ', 'UPDATE', 'DELETE', 'EXPORT')
   ORDER BY created_at;
   ```
4. **Limpar artefatos:** Remover contas criadas pelo atacante, reverter alterações indevidas

### Fase 4 — Recuperação (24h - 72h)

**Objetivo:** Restaurar operação normal e validar a segurança.

**Ações:**

1. **Restaurar serviços desabilitados:**
   - Reabilitar Edge Functions desabilitadas
   - Reativar acessos legítimos
2. **Validar integridade dos dados:**
   ```sql
   -- Verificar se CPF/RG estão criptografados
   SELECT id, name, cpf FROM patients
   WHERE cpf IS NOT NULL AND cpf NOT LIKE 'enc:%'
   LIMIT 10;
   ```
3. **Monitoramento intensificado:** Acompanhar dashboard `/admin/seguranca` por 7 dias
4. **Comunicar restauração** às partes envolvidas

### Fase 5 — Lições Aprendidas (até 2 semanas após)

**Objetivo:** Documentar o incidente e melhorar processos.

**Ações:**

1. **Criar relatório post-mortem:**
   - Cronologia completa do incidente
   - Causa raiz identificada
   - Ações tomadas em cada fase
   - Tempo de resposta em cada fase
   - O que funcionou e o que pode melhorar
2. **Atualizar documentação:**
   - Este procedimento, se aplicável
   - `docs/checklist-seguranca-features.md`, se nova verificação necessária
   - `docs/DPA-terceiros.md`, se terceiro envolvido
3. **Implementar melhorias:**
   - Novas verificações de segurança, se identificadas
   - Ajustes em rate limiting, se necessário
   - Novas regras no AI sanitizer, se prompt injection envolvida

---

## 5. Notificação à ANPD (Art. 48)

### Quando Notificar

A ANPD (Autoridade Nacional de Proteção de Dados) deve ser notificada quando o incidente:
- Envolver dados sensíveis de saúde (prontuários, anamneses, diagnósticos)
- Afetar um número significativo de titulares
- Puder acarretar dano relevante aos titulares

**Prazo:** **72 horas** após a ciência do incidente (conforme recomendação da ANPD).

### Template de Comunicação à ANPD

```
COMUNICAÇÃO DE INCIDENTE DE SEGURANÇA
Conforme Art. 48, Lei 13.709/2018 (LGPD)

1. IDENTIFICAÇÃO DO CONTROLADOR
   Razão Social: [Nome da clínica]
   CNPJ: [CNPJ]
   Encarregado (DPO): [Nome e contato]
   Sistema: Organiza Odonto

2. DESCRIÇÃO DO INCIDENTE
   Data de ocorrência: [DD/MM/AAAA HH:MM]
   Data de ciência: [DD/MM/AAAA HH:MM]
   Natureza: [Acesso não autorizado / Vazamento / Perda / Alteração]
   Descrição: [Resumo do incidente]

3. DADOS PESSOAIS AFETADOS
   Tipos de dados: [CPF, prontuário, contato, etc.]
   Categorias de titulares: [Pacientes / Profissionais]
   Número de titulares afetados: [Quantidade estimada]
   Dados sensíveis envolvidos: [Sim/Não — dados de saúde]

4. CONSEQUÊNCIAS DO INCIDENTE
   Riscos identificados: [Descrição dos riscos para os titulares]
   Dano potencial: [Financeiro / Reputacional / Discriminação / etc.]

5. MEDIDAS ADOTADAS
   Contenção: [Ações tomadas para conter o incidente]
   Mitigação: [Ações para reduzir impacto aos titulares]
   Correção: [Medidas para eliminar a vulnerabilidade]

6. MEDIDAS PREVENTIVAS
   [Melhorias implementadas ou planejadas]

7. COMUNICAÇÃO AOS TITULARES
   Realizada: [Sim/Não]
   Forma: [Email / Sistema / Outro]
   Data: [DD/MM/AAAA]
```

### Envio

- **Portal:** Peticionamento Eletrônico da ANPD (https://www.gov.br/anpd)
- **Email alternativo:** Conforme orientação vigente da ANPD

---

## 6. Notificação aos Titulares

### Quando Notificar

Os titulares (pacientes) devem ser notificados quando o incidente puder causar **risco ou dano relevante**, incluindo:
- Exposição de dados de saúde (prontuários, diagnósticos)
- Exposição de CPF/RG
- Comprometimento de credenciais de acesso

### Como Notificar

1. **Canal principal:** Email cadastrado do paciente
2. **Canal secundário:** Notificação no sistema (quando disponível)
3. **Conteúdo da notificação:**
   - Descrição clara do incidente (sem jargão técnico)
   - Quais dados foram afetados
   - Medidas tomadas pela clínica
   - Recomendações ao titular (ex: alterar senha, monitorar CPF)
   - Contato do DPO para dúvidas

---

## 7. Ferramentas de Investigação

### Dashboard de Segurança (`/admin/seguranca`)

Acesso: somente `super_admin`. Apresenta:
- **Visão geral:** Total de eventos, auth failures, rate limits, AI requests (últimos 7/30 dias)
- **Gráfico temporal:** Eventos por dia para identificar picos
- **Eventos por ação:** Distribuição de AUTH_FAILURE, RATE_LIMIT_EXCEEDED, EXPORT, etc.
- **Eventos por função:** Qual Edge Function está gerando mais eventos
- **Logs de auditoria:** Tabela paginada com filtros por ação, função e período

### Queries Úteis para Investigação

```sql
-- 1. Resumo de eventos das últimas 24h
SELECT action, COUNT(*) as total
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action
ORDER BY total DESC;

-- 2. Falhas de auth por usuário (possível brute force)
SELECT user_id, function_name, COUNT(*) as failures
FROM audit_logs
WHERE action = 'AUTH_FAILURE'
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id, function_name
ORDER BY failures DESC;

-- 3. Rate limits excedidos (possível abuso)
SELECT user_id, function_name, COUNT(*) as hits
FROM audit_logs
WHERE action = 'RATE_LIMIT_EXCEEDED'
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id, function_name
ORDER BY hits DESC;

-- 4. Exports de dados de paciente (LGPD)
SELECT user_id, record_id, created_at, new_data
FROM audit_logs
WHERE action = 'EXPORT'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Atividade de um usuário específico
SELECT action, table_name, function_name, record_id, created_at
FROM audit_logs
WHERE user_id = '<user_id_suspeito>'
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 6. Verificar consentimentos negados (possível bypass)
SELECT user_id, clinic_id, function_name, created_at
FROM audit_logs
WHERE action = 'CONSENT_DENIED'
AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

### Logs do Supabase

- **Edge Function logs:** Supabase Dashboard → Edge Functions → Logs
- **Database logs:** Supabase Dashboard → Database → Logs
- **Auth logs:** Supabase Dashboard → Authentication → Logs

---

## 8. Contatos e Responsabilidades

| Papel | Responsabilidade | Ação esperada |
|-------|------------------|---------------|
| **DPO (Encarregado)** | Coordenação geral, comunicação com ANPD e titulares | Notificar ANPD em 72h, aprovar comunicação a titulares |
| **Time Técnico** | Investigação, contenção, correção | Executar fases 1-4, deploy de correções |
| **Jurídico** | Apoio legal, revisão de comunicações | Revisar notificações à ANPD e titulares |
| **Administrador da Clínica** | Decisão sobre comunicação a pacientes | Aprovar envio de notificações a titulares |

---

## 9. Checklist Rápido de Resposta Imediata

Use este checklist nos primeiros 30 minutos após detecção de um incidente:

- [ ] **Confirmar** que o evento é um incidente real (não falso positivo)
- [ ] **Classificar** a severidade (Crítico / Alto / Médio / Baixo)
- [ ] **Registrar** data/hora de detecção e descrição inicial
- [ ] **Acessar** dashboard `/admin/seguranca` para visão geral
- [ ] **Consultar** `audit_logs` para eventos recentes
- [ ] **Conter** o incidente (revogar acessos, desabilitar funções, rotacionar chaves)
- [ ] **Notificar** DPO e time técnico
- [ ] **Preservar** evidências (screenshots, logs, queries)
- [ ] **Avaliar** necessidade de notificação à ANPD (72h)
- [ ] **Documentar** todas as ações tomadas com timestamps

---

## 10. Revisão

- Este procedimento deve ser **testado anualmente** com simulação de incidente (tabletop exercise)
- Revisão obrigatória após cada incidente real
- DPO responsável por manter atualizado

### Histórico de Versões

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 11/02/2026 | Versão inicial |
