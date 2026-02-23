# Plano de Recuperação de Desastres (Disaster Recovery)

**Sistema:** Organiza Odonto
**Data:** 23/02/2026
**Versão:** 1.0
**Base Legal:** LGPD Art. 46 (medidas de segurança), Art. 50 (boas práticas)

---

## 1. Objetivo

Definir procedimentos para restauração dos serviços e dados do Organiza Odonto em cenários de falha crítica, garantindo continuidade operacional e integridade dos dados de pacientes conforme exigido pela LGPD.

---

## 2. Escopo

Este plano cobre os seguintes componentes:

| Componente | Provedor | RPO* | RTO** |
|---|---|---|---|
| Banco de dados (PostgreSQL) | Supabase | 24h | 4h |
| Autenticação | Supabase Auth | 0 (stateless) | 2h |
| Edge Functions | Supabase (Deno) | 0 (código em repo) | 1h |
| Storage (arquivos/exames) | Supabase Storage | 24h | 4h |
| Frontend (SPA) | Vercel/Hosting | 0 (código em repo) | 30min |
| Integrações IA | OpenAI API | N/A (sem dados persistentes) | 1h |
| Pagamentos | Stripe | N/A (gerenciado pelo Stripe) | 1h |

*RPO (Recovery Point Objective): Perda máxima de dados aceitável
**RTO (Recovery Time Objective): Tempo máximo para restauração

---

## 3. Backups

### 3.1 Banco de Dados

- **Automático**: Supabase realiza backups diários automáticos (retenção de 7 dias no plano Pro)
- **Point-in-Time Recovery (PITR)**: Disponível no plano Pro — permite restaurar para qualquer segundo nas últimas 24h
- **Manual**: Exportar via `pg_dump` quando necessário antes de migrations de risco

```bash
# Backup manual via CLI
npx supabase db dump --linked -f backup_$(date +%Y%m%d).sql
```

### 3.2 Storage (Arquivos)

- Arquivos de exames e documentos estão no Supabase Storage
- Backup automático incluído no backup do projeto Supabase
- Recomendação: exportar bucket `exams` periodicamente para armazenamento externo

### 3.3 Código-fonte

- Repositório Git com histórico completo
- Edge Functions versionadas no repositório (`supabase/functions/`)
- Migrations versionadas (`supabase/migrations/`)

---

## 4. Cenários de Desastre e Procedimentos

### 4.1 Indisponibilidade do Supabase

**Sintomas:** API retorna 5xx, dashboard inacessível

**Procedimento:**
1. Verificar status em [status.supabase.com](https://status.supabase.com)
2. Notificar usuários via canal de comunicação (e-mail/WhatsApp)
3. Aguardar restauração pelo Supabase (SLA do plano)
4. Após restauração, verificar integridade dos dados:
   ```sql
   SELECT COUNT(*) FROM patients WHERE clinic_id = '<id>';
   SELECT MAX(created_at) FROM audit_logs;
   ```
5. Testar fluxos críticos: login, listagem de pacientes, agendamento

### 4.2 Corrupção de Dados

**Sintomas:** Dados inconsistentes, registros faltando, valores inválidos

**Procedimento:**
1. Identificar escopo da corrupção (quais tabelas/registros)
2. Pausar Edge Functions se necessário (evitar mais escritas):
   ```bash
   # Desabilitar temporariamente funções específicas
   npx supabase functions delete <function-name> --linked
   ```
3. Restaurar backup via dashboard do Supabase:
   - Projeto > Settings > Database > Backups > Restore
4. Se PITR disponível, restaurar para ponto antes da corrupção
5. Reaplicar migrations se necessário:
   ```bash
   npx supabase db push --linked
   ```
6. Redesployar Edge Functions:
   ```bash
   npx supabase functions deploy --linked
   ```
7. Validar dados restaurados
8. Registrar incidente em `audit_logs`

### 4.3 Comprometimento de Credenciais

**Sintomas:** Acesso não autorizado detectado, atividade suspeita

**Procedimento:**
1. Seguir o plano de resposta a incidentes (`docs/resposta-incidentes.md`)
2. Revogar credenciais comprometidas:
   - **Supabase**: Regenerar `service_role` key no dashboard
   - **OpenAI**: Revogar API key em platform.openai.com
   - **Stripe**: Revogar key em dashboard.stripe.com
3. Atualizar secrets nas Edge Functions:
   ```bash
   npx supabase secrets set OPENAI_API_KEY=<nova_key> --linked
   npx supabase secrets set STRIPE_SECRET_KEY=<nova_key> --linked
   ```
4. Forçar logout de todas as sessões:
   ```sql
   DELETE FROM auth.sessions;
   ```
5. Notificar usuários afetados para redefinir senha
6. Auditar `audit_logs` para identificar ações do invasor
7. Comunicar ANPD se dados pessoais foram comprometidos (prazo: 2 dias úteis — Art. 48)

### 4.4 Perda do Frontend (Hosting)

**Sintomas:** Site retorna 404 ou não carrega

**Procedimento:**
1. Verificar status do provedor de hosting
2. Rebuild e redeploy:
   ```bash
   npm run build
   # Deploy conforme provedor (Vercel, Netlify, etc.)
   ```
3. Verificar se variáveis de ambiente estão configuradas
4. Testar após deploy

### 4.5 Falha em Migration

**Sintomas:** Erro ao aplicar migration, tabelas em estado inconsistente

**Procedimento:**
1. **NÃO** aplicar mais migrations
2. Identificar o estado atual:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;
   ```
3. Se possível, criar migration reversa (rollback manual)
4. Se não, restaurar backup e reaplicar migrations até a versão anterior
5. Corrigir a migration com problema antes de reaplicar

---

## 5. Comunicação

### Responsáveis

| Papel | Responsabilidade |
|---|---|
| Administrador do Sistema | Executar procedimentos técnicos |
| DPO / Encarregado | Avaliar impacto em dados pessoais, notificar ANPD se necessário |
| Equipe Clínica | Notificar pacientes, usar procedimentos manuais durante indisponibilidade |

### Canais de Comunicação

- **Interno**: E-mail da equipe, grupo WhatsApp
- **Pacientes**: Comunicado via e-mail cadastrado
- **ANPD**: Via formulário oficial (em caso de incidente com dados pessoais)
- **Suporte**: suporte@organizaodonto.app

---

## 6. Testes do Plano

Este plano deve ser testado **semestralmente**:

- [ ] Restaurar backup em ambiente de staging
- [ ] Verificar integridade dos dados restaurados
- [ ] Simular redeploy de Edge Functions
- [ ] Simular redeploy do frontend
- [ ] Verificar se credenciais de backup estão atualizadas
- [ ] Atualizar este documento com lições aprendidas

---

## 7. Procedimentos de Contingência Manual

Caso o sistema fique indisponível por mais de **4 horas**:

1. Utilizar prontuários em papel como contingência temporária
2. Registrar atendimentos em planilha offline
3. Após restauração, inserir dados manualmente no sistema
4. Verificar se não houve duplicidade de registros

---

## 8. Documentos Relacionados

- [Resposta a Incidentes](./resposta-incidentes.md)
- [Política de Segurança da Informação](/configuracoes/politica-seguranca)
- [RIPD — Relatório de Impacto](/configuracoes/ripd)
- [Matriz de Riscos LGPD](/configuracoes/lgpd-risk-matrix)
