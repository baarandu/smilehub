# Roadmap de Compliance Jurídica — Organiza Odonto

> Referência operacional para implementação dos gaps identificados na auditoria de 23/02/2026.
> Checklist de 73 itens auditados: **51 implementados, 11 parciais, 11 pendentes.**
> Nota global: **A-** — objetivo: **A (healthtech auditável).**

---

## Prioridades

| Prioridade | Significado | Prazo sugerido |
|------------|-------------|----------------|
| P0 | Bloqueio jurídico — risco real de nulidade ou sanção | Imediato |
| P1 | Gap regulatório — exigência legal não atendida | 1-2 semanas |
| P2 | Melhoria de conformidade — fortalece postura jurídica | 2-4 semanas |
| P3 | Diferencial competitivo — não obrigatório | Backlog |

---

## P0 — Bloqueios Jurídicos

### 1. ~~Impedir exclusão permanente de prontuários~~ CONCLUÍDO

**Status:** Implementado em 23/02/2026 (`20260223_clinical_record_immutability.sql`)
**Risco:** ~~Violação do CFO (retenção 20 anos) e Lei 13.787/2018~~ Mitigado
**Referência legal:** Art. 6º Lei 13.787/2018, Resolução CFO 118/2012

**Implementado:**
- [x] `deleted_at`, `deleted_by` em `patients`, `anamneses`, `child_anamneses`, `exams`, `procedures`, `consultations`
- [x] `ON DELETE CASCADE` → `ON DELETE RESTRICT` em 5 FKs clínicas
- [x] Trigger `_prevent_clinical_hard_delete()` bloqueia DELETE nas 5 tabelas clínicas
- [x] Trigger `_prevent_patient_hard_delete()` bloqueia DELETE em patients com registros clínicos
- [x] Soft-delete via RPC `soft_delete_patient(p_patient_id, p_user_id)` (SECURITY DEFINER)
- [x] `retention_locked_until DEFAULT (NOW() + '20 years')` em `patients`
- [x] View `patients_secure` recriada com `WHERE deleted_at IS NULL`
- [x] `src/services/patients.ts` → `deletePatient()` chama RPC em vez de `.delete()`
- [x] UI: "Excluir" → "Arquivar" com texto explicando retenção de 20 anos

**Arquivos criados/modificados:**
- `supabase/migrations/20260223_clinical_record_immutability.sql`
- `src/services/patients.ts`
- `src/components/patients/PatientHeader.tsx`

**Validação:**
- [x] `npx vite build` passa
- [ ] Tentar DELETE em `anamneses` → deve falhar com mensagem clara
- [ ] Tentar DELETE em `patients` com prontuário → deve falhar (RESTRICT)
- [ ] Soft-delete funciona e dados somem da UI mas persistem no banco

---

### 2. ~~Criar tabela de aceite de Termos de Uso~~ CONCLUÍDO

**Status:** Implementado em 23/02/2026 (`20260223_terms_acceptances.sql`)
**Risco:** ~~Sem prova de consentimento, base legal frágil (Art. 7º, 8º LGPD)~~ Mitigado
**Referência legal:** Art. 7º I, Art. 8º LGPD, Art. 54 CDC

**Implementado:**
- [x] Tabela `terms_acceptances` com `user_id, policy_type, policy_version, accepted_at, ip_address, user_agent`
- [x] `UNIQUE(user_id, policy_type, policy_version)` — idempotente
- [x] RLS: usuário vê/insere apenas seus próprios aceites
- [x] RPC `accept_terms()` com `ON CONFLICT DO NOTHING`
- [x] RPC `check_terms_accepted()` verifica ambos ToS + Privacy aceitos
- [x] Checkbox obrigatório no Signup com links para /termos e /privacidade
- [x] Validação: signup bloqueado sem aceite
- [x] Modal de re-aceite (`TermsAcceptanceModal`) — não-dismissível
- [x] `PrivateRoute` verifica `check_terms_accepted()` após login
- [x] `CURRENT_TERMS_VERSION = '1.0'` em `src/lib/termsVersion.ts` — alterar para forçar re-aceite

**Arquivos criados/modificados:**
- `supabase/migrations/20260223_terms_acceptances.sql`
- `src/lib/termsVersion.ts`
- `src/services/terms.ts`
- `src/components/auth/TermsAcceptanceModal.tsx`
- `src/pages/Signup.tsx`
- `src/components/auth/PrivateRoute.tsx`

**Validação:**
- [x] `npx vite build` passa
- [ ] Signup sem marcar checkbox → não prossegue
- [ ] Registro salvo com IP, user_agent, versão e timestamp
- [ ] Alterar versão → modal de re-aceite aparece no próximo login
- [ ] Admin pode consultar aceites via Supabase

---

### 3. ~~Preencher dados do DPO~~ CONCLUÍDO

**Status:** Implementado em 23/02/2026
**Risco:** ~~ANPD pode exigir DPO acessível (Art. 41 LGPD)~~ Mitigado
**Referência legal:** Art. 41 LGPD

**Implementado:**
- [x] `[Nome do Encarregado / DPO]` → "Equipe de Proteção de Dados"
- [x] `[dpo@organizaodonto.com.br]` → `suporte@organizaodonto.app`
- [x] Linha de telefone com placeholder removida
- [x] `DPA.tsx` verificado — sem placeholders de DPO

**Arquivos modificados:**
- `src/pages/PrivacyPolicy.tsx` — Seção 14

**Validação:**
- [x] Nenhum `[placeholder]` visível na Política de Privacidade
- [ ] Email `suporte@organizaodonto.app` recebe mensagens

---

## P1 — Gaps Regulatórios

### 4. Registrar consentimento de menores (Art. 14)

**Status:** Campos `patient_type`, `legal_guardian` existem. Sem log de consentimento parental.
**Risco:** Art. 14 LGPD exige consentimento verificável de responsável legal

**O que fazer:**
- [ ] Criar tabela `minor_consents`:
  ```
  id uuid PK
  patient_id uuid REFERENCES patients
  clinic_id uuid REFERENCES clinics
  guardian_name text NOT NULL
  guardian_cpf text  -- opcional, para identificação
  consent_type text  -- 'treatment' | 'data_processing' | 'ai_analysis'
  granted_at timestamptz DEFAULT now()
  granted_by uuid REFERENCES auth.users  -- quem registrou
  ip_address text
  notes text
  ```
- [ ] No PatientForm: se `patient_type = 'child'`, exibir checkbox de consentimento do responsável
- [ ] Registrar com IP e timestamp
- [ ] Audit trigger automático na tabela

**Arquivos a modificar:**
- Nova migration: `supabase/migrations/YYYYMMDD_minor_consents.sql`
- `src/components/patients/PatientForm.tsx` — fluxo condicional para menores

**Validação:**
- [ ] Criar paciente menor sem consentimento → aviso ou bloqueio
- [ ] Registro salvo com guardian_name, IP, timestamp

---

### 5. Implementar exportação CSV/PDF de dados do titular

**Status:** Export JSON funcional. CSV e PDF prometidos na Política de Privacidade mas não implementados.
**Risco:** Promessa documental não cumprida (Art. 18, V LGPD — portabilidade)

**O que fazer:**
- [ ] Adicionar formato CSV ao `patient-data-export` Edge Function (flatten JSON → CSV)
- [ ] Adicionar formato PDF usando a mesma lógica do `patientReportGenerator.ts`
- [ ] Parâmetro `?format=json|csv|pdf` na chamada
- [ ] Atualizar UI de export para oferecer seleção de formato

**Arquivos a modificar:**
- `supabase/functions/patient-data-export/index.ts` — adicionar formatters
- UI de export (botão no `PatientHeader.tsx` ou similar)

**Validação:**
- [ ] Export JSON continua funcionando
- [ ] Export CSV baixa arquivo válido com headers
- [ ] Export PDF gera documento legível
- [ ] Rate limit mantido (5/hora)

---

### 6. Elaborar RIPD (Relatório de Impacto à Proteção de Dados)

**Status:** Não existe. Matriz de Risco LGPD implementada mas RIPD formal não produzido.
**Risco:** Art. 38 LGPD — ANPD pode solicitar RIPD para tratamento de dados sensíveis de saúde.

**O que fazer:**
- [ ] Criar documento baseado na Matriz de Risco existente (`LGPDRiskMatrix.tsx`)
- [ ] Estrutura mínima do RIPD:
  1. Descrição das operações de tratamento
  2. Dados pessoais e sensíveis envolvidos
  3. Necessidade e proporcionalidade
  4. Riscos para os titulares
  5. Medidas de mitigação
  6. Parecer do DPO
- [ ] Pode ser página no app (`/configuracoes/ripd`) ou documento PDF externo
- [ ] Referenciar no DPA e na PSI

**Arquivos a criar:**
- `src/pages/RIPD.tsx` (se página no app) ou documento externo
- Atualizar `src/App.tsx` e `src/pages/Settings.tsx` se for página

**Validação:**
- [ ] Documento cobre todos os tratamentos listados no DPA Anexo I
- [ ] Referência cruzada com Matriz de Risco

---

### 7. Endpoint de exclusão de dados do titular

**Status:** Não existe endpoint de exclusão/anonimização
**Risco:** Art. 18, IV LGPD — direito à eliminação

**O que fazer:**
- [ ] Criar Edge Function `patient-data-deletion`
- [ ] Lógica: anonimizar dados pessoais (nome → "ANONIMIZADO", CPF → null, etc.)
- [ ] Preservar dados clínicos anonimizados (prontuário sem PII — CFO 20 anos)
- [ ] Registrar audit log com motivo da exclusão
- [ ] Exigir confirmação dupla (admin + motivo)
- [ ] Respeitar `retention_locked_until` — bloquear se dentro do prazo

**Arquivos a criar:**
- `supabase/functions/patient-data-deletion/index.ts`
- UI de solicitação de exclusão (modal com justificativa)

**Validação:**
- [ ] Dados pessoais anonimizados
- [ ] Dados clínicos preservados sem PII
- [ ] Audit log registra quem solicitou e quando
- [ ] Prontuário dentro de 20 anos → bloqueado

---

## P2 — Melhorias de Conformidade

### 8. Referências legais nos Termos de Uso

**Status:** Termos não referenciam MP 2.200-2/2001 nem Lei 14.063/2020
**Impacto:** Validade jurídica da assinatura eletrônica poderia ser questionada

**O que fazer:**
- [ ] Adicionar seção ou parágrafo nos Termos referenciando:
  - MP 2.200-2/2001 (validade de documentos eletrônicos)
  - Lei 14.063/2020 (tipos de assinatura eletrônica)
  - Nível de assinatura utilizado (avançada via SuperSign)
- [ ] Mencionar que assinatura qualificada (ICP-Brasil) é opcional e pode ser integrada futuramente

**Arquivos a modificar:**
- `src/pages/TermsOfService.tsx`

---

### 9. MFA (Autenticação Multifator)

**Status:** Não implementado. Supabase Auth suporta nativamente.
**Impacto:** PSI menciona MFA para acesso administrativo

**O que fazer:**
- [ ] Habilitar MFA no Supabase Dashboard → Authentication → MFA
- [ ] Criar componente de enrollment TOTP em Settings
- [ ] Exigir MFA para role `admin` (opcional para outros)
- [ ] Adicionar verificação MFA no login flow

**Arquivos a criar/modificar:**
- Novo componente: `src/components/auth/MFASetup.tsx`
- `src/pages/Settings.tsx` — card na seção Conta
- Login flow — verificação de fator adicional

---

### 10. Runbook de Disaster Recovery

**Status:** `docs/resposta-incidentes.md` cobre incidentes de segurança, mas não DR.
**Impacto:** Sem procedimento documentado para recuperação de desastres

**O que fazer:**
- [ ] Criar `docs/disaster-recovery.md` com:
  - Cenários cobertos (falha DB, falha provider, ransomware, corrupção)
  - Procedimento de restauração via Supabase Dashboard
  - Comandos PITR
  - Contatos de emergência Supabase
  - Checklist de validação pós-restauração
  - RTO: 4h, RPO: minutos (PITR) / 24h (catástrofe)

---

### 11. TCLE específicos por procedimento

**Status:** 4 templates genéricos. Sem TCLE para implante, clareamento, ortodontia, etc.
**Impacto:** CFO recomenda consentimento específico por tipo de procedimento

**O que fazer:**
- [ ] Criar templates adicionais no `DocumentsModal.tsx`:
  - TCLE para implantes dentários
  - TCLE para clareamento dental
  - TCLE para procedimentos cirúrgicos
  - TCLE para ortodontia
  - TCLE para prótese
- [ ] Cada template com riscos específicos do procedimento
- [ ] Variáveis: `{{nome}}`, `{{cpf}}`, `{{dente}}`, `{{procedimento}}`, `{{data}}`

**Arquivos a modificar:**
- `src/components/patients/DocumentsModal.tsx` — adicionar templates

---

### 12. Testes de restauração de backup documentados

**Status:** ComplianceChecklist inclui item trimestral, sem evidência de execução.
**Impacto:** Sem prova de que backups funcionam

**O que fazer:**
- [ ] Executar teste de restauração via Supabase Dashboard
- [ ] Documentar resultado (data, duração, integridade verificada)
- [ ] Considerar: tabela `backup_test_logs` para registrar testes
- [ ] Agendar no calendário: trimestral

---

## P3 — Diferenciais (Backlog)

### 13. Integração ICP-Brasil

**Contexto:** SuperSign é assinatura avançada, não qualificada. Para prontuários com valor legal máximo, ICP-Brasil seria ideal.
**Decisão necessária:** Avaliar com advogado se é necessário para o caso de uso.

- [ ] Pesquisar provedores ICP-Brasil com API (BRy, Certisign, AC Digitais)
- [ ] Avaliar custo-benefício vs SuperSign
- [ ] Se necessário, integrar como opção adicional

### 14. Certificação SBIS/CFO (NGS2)

- [ ] Avaliar requisitos do NGS2
- [ ] Gap analysis contra requisitos
- [ ] Decidir se vale o investimento

### 15. Penetration Testing

- [ ] Contratar empresa especializada (anual)
- [ ] Escopo: APIs, RLS, auth, XSS, injection
- [ ] Documentar resultados e correções

### 16. Glossário de termos técnicos

- [ ] Criar página `/glossario` com termos: RBAC, RLS, JWT, pseudonimização, pgcrypto, etc.
- [ ] Linguagem acessível para leigos
- [ ] Referenciar nos documentos legais

### 17. Material educativo para clínicas

- [ ] Criar seção em `/suporte` com orientações:
  - Boas práticas de senha
  - Gerenciamento de sessões
  - Não compartilhar credenciais
  - Como responder solicitações de titulares

### 18. Status page pública

- [ ] Implementar ou contratar (Statuspage.io, BetterUptime, etc.)
- [ ] Monitorar: API, banco, Edge Functions, Stripe webhook
- [ ] Link no rodapé do app

### 19. Notificação automatizada de novos suboperadores

- [ ] DPA define 15 dias de aviso
- [ ] Criar mecanismo (email ou in-app) para notificar admins de clínicas

---

## Checklist de Validação Final

Após implementar P0 + P1, rodar esta verificação:

```
[x] npx vite build — compila sem erros
[ ] Prontuários não podem ser deletados (hard delete bloqueado) — código pronto, testar em produção
[ ] Soft-delete funciona e audit log registra — código pronto, testar em produção
[ ] Signup exige aceite de termos com IP/timestamp — código pronto, testar em produção
[ ] Re-aceite funciona quando versão muda — código pronto, testar em produção
[x] DPO com dados reais na Política de Privacidade
[ ] Consentimento de menor registrado com IP/timestamp (P1)
[ ] Export funciona em JSON, CSV e PDF (P1)
[ ] Endpoint de exclusão/anonimização funcional (P1)
[ ] RIPD documento produzido e referenciado (P1)
```

---

## Referência: Legislação Aplicável

| Norma | Artigos-chave | Aplicação |
|-------|---------------|-----------|
| LGPD (13.709/2018) | 7, 8, 11, 14, 18, 33, 37, 38, 41, 42, 48 | Proteção de dados, consentimento, direitos, DPO, incidentes |
| MP 2.200-2/2001 | Art. 10, §2º | Validade de documentos eletrônicos |
| Lei 14.063/2020 | Arts. 4-5 | Tipos de assinatura eletrônica para saúde |
| Lei 13.787/2018 | Arts. 1-7 | Prontuário eletrônico, retenção 20 anos |
| CFO Resolução 118/2012 | — | Prontuário odontológico, guarda e sigilo |
| CDC (8.078/1990) | Arts. 49, 54 | Arrependimento 7 dias, contratos de adesão |
| Legislação Tributária | — | Retenção fiscal 5 anos |

---

*Criado em: 23 de fevereiro de 2026*
*Baseado na auditoria de 73 itens contra os checklists de GPT-4, Gemini e Claude.*
