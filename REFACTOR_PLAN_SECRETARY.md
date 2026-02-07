# Plano de Refatoração: secretary.ts

## Visão Geral
- **Arquivo:** `src/services/secretary.ts`
- **Linhas atuais:** 1096
- **Meta:** ~100-200 linhas por arquivo
- **Risco:** BAIXO (service puro, sem UI)

---

## FASE 1: Preparação (Antes de Tocar no Código)

### 1.1 Backup
- [ ] Criar branch: `git checkout -b refactor/secretary-service`
- [ ] Commit inicial com estado atual

### 1.2 Identificar Dependências
Arquivos que importam de `secretary.ts`:
```
src/pages/AISecretary.tsx (import principal - 35 items)
src/components/secretary/MessageBehaviorSection.tsx (AISecretaryBehavior)
src/components/secretary/PaymentSettingsSection.tsx (AISecretaryBehavior)
src/components/secretary/AudioSettingsSection.tsx (AISecretaryBehavior, TTS_VOICES)
src/components/secretary/ReminderSettingsSection.tsx (AISecretaryBehavior)
```

**Nota:** Todos os imports vêm de 5 arquivos apenas. Baixo risco de quebra.

### 1.3 Checklist de Validação Manual
Funcionalidades que precisam ser testadas na página AISecretary:

**Settings:**
- [ ] Ligar/desligar secretária IA
- [ ] Alterar tom de voz (casual/formal)
- [ ] Salvar configurações

**Schedule:**
- [ ] Listar horários de atendimento
- [ ] Adicionar novo horário
- [ ] Editar horário existente
- [ ] Excluir horário
- [ ] Criar horário padrão

**Professionals:**
- [ ] Listar profissionais
- [ ] Adicionar profissional
- [ ] Editar profissional
- [ ] Excluir profissional

**Custom Messages:**
- [ ] Listar mensagens
- [ ] Adicionar mensagem
- [ ] Editar mensagem
- [ ] Excluir mensagem
- [ ] Toggle ativo/inativo

**Blocked Numbers:**
- [ ] Listar números bloqueados
- [ ] Adicionar número
- [ ] Remover número

**Behavior Settings:**
- [ ] Carregar configurações de comportamento
- [ ] Atualizar campo individual
- [ ] Atualizar múltiplos campos

---

## FASE 2: Estrutura de Arquivos Proposta

```
src/services/secretary/
├── index.ts              # Re-exports (backward compatible)
├── types.ts              # Interfaces e tipos
├── constants.ts          # Defaults, DAY_NAMES, etc
├── settings.ts           # CRUD AISecretarySettings
├── behavior.ts           # CRUD AISecretaryBehavior
├── schedule.ts           # CRUD ScheduleEntry
├── professionals.ts      # CRUD ClinicProfessional
├── messages.ts           # CRUD CustomMessage
└── blocked.ts            # CRUD BlockedNumber
```

---

## FASE 3: Ordem de Execução (Incrementos Pequenos)

### Etapa 1: Extrair Types (MENOR RISCO)
1. Criar `src/services/secretary/types.ts`
2. Mover todas as interfaces
3. Atualizar imports no arquivo original
4. **VALIDAR:** Build passa? App roda?

### Etapa 2: Extrair Constants
1. Criar `src/services/secretary/constants.ts`
2. Mover DAY_NAMES, DEFAULT_SETTINGS, etc
3. Atualizar imports
4. **VALIDAR:** Build passa? App roda?

### Etapa 3: Extrair Settings CRUD
1. Criar `src/services/secretary/settings.ts`
2. Mover funções: getSecretarySettings, saveSecretarySettings, updateSecretarySetting
3. Testar na UI: toggle on/off, change tone
4. **VALIDAR:** Funciona igual?

### Etapa 4: Extrair Behavior CRUD
1. Criar `src/services/secretary/behavior.ts`
2. Mover funções de behavior
3. Testar seções de comportamento
4. **VALIDAR:** Funciona igual?

### Etapa 5: Extrair Schedule CRUD
1. Criar `src/services/secretary/schedule.ts`
2. Mover funções de schedule
3. Testar: listar, add, edit, delete horários
4. **VALIDAR:** Funciona igual?

### Etapa 6: Extrair Professionals CRUD
1. Criar `src/services/secretary/professionals.ts`
2. Testar CRUD de profissionais
4. **VALIDAR:** Funciona igual?

### Etapa 7: Extrair Messages CRUD
1. Criar `src/services/secretary/messages.ts`
2. Testar CRUD de mensagens
4. **VALIDAR:** Funciona igual?

### Etapa 8: Extrair Blocked CRUD
1. Criar `src/services/secretary/blocked.ts`
2. Testar CRUD de bloqueados
4. **VALIDAR:** Funciona igual?

### Etapa 9: Criar Index (Backward Compatible)
1. Criar `src/services/secretary/index.ts` que re-exporta tudo
2. Remover arquivo antigo `secretary.ts`
3. Testar TUDO novamente
4. **VALIDAR:** Nenhuma funcionalidade quebrou?

---

## FASE 4: Rollback Plan

Se algo quebrar:
```bash
git checkout src/services/secretary.ts
git checkout -d refactor/secretary-service
```

---

## FASE 5: Merge

Apenas fazer merge se:
- [ ] Build passa sem erros
- [ ] App inicia corretamente
- [ ] Todas as funcionalidades do checklist funcionam
- [ ] Código foi revisado

---

## Status de Execução

| Etapa | Status | Data | Notas |
|-------|--------|------|-------|
| Backup | ✅ Concluído | 2026-02-04 | Branch: refactor/secretary-service |
| Etapa 1 (Types) | ✅ Concluído | 2026-02-04 | types.ts criado |
| Etapa 2 (Constants) | ✅ Concluído | 2026-02-04 | constants.ts criado |
| Etapa 3 (Settings) | ✅ Concluído | 2026-02-04 | settings.ts criado |
| Etapa 4 (Behavior) | ✅ Concluído | 2026-02-04 | behavior.ts criado |
| Etapa 5 (Schedule) | ✅ Concluído | 2026-02-04 | schedule.ts criado |
| Etapa 6 (Professionals) | ✅ Concluído | 2026-02-04 | professionals.ts criado |
| Etapa 7 (Messages) | ✅ Concluído | 2026-02-04 | messages.ts criado |
| Etapa 8 (Blocked) | ✅ Concluído | 2026-02-04 | blocked.ts criado |
| Etapa 9 (Index) | ✅ Concluído | 2026-02-04 | index.ts com re-exports |
| Build | ✅ Passou | 2026-02-04 | Sem erros |
| TypeScript | ✅ Passou | 2026-02-04 | tsc --noEmit ok |
| Validação Manual | ✅ Passou | 2026-02-04 | Testado pelo usuário |
| Merge | ✅ Concluído | 2026-02-04 | Merged para main |
