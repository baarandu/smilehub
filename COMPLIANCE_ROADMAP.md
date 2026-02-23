# Roadmap de Compliance Jurídica — Organiza Odonto

> Referência operacional para implementação dos gaps identificados na auditoria de 23/02/2026.
> Checklist de 73 itens auditados: **55 implementados, 7 parciais, 11 pendentes.**
> Nota global: **A** — P0 e P1 concluídos.

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

### 4. ~~Registrar consentimento de menores (Art. 14)~~ CONCLUÍDO

**Status:** Implementado em 23/02/2026 (`20260224_minor_consent.sql`)
**Risco:** ~~Art. 14 LGPD exige consentimento verificável de responsável legal~~ Mitigado
**Referência legal:** Art. 14 LGPD

**Implementado:**
- [x] Colunas `guardian_name`, `ip_address` adicionadas em `patient_consents`
- [x] RPC `check_minor_consent(p_patient_id, p_clinic_id)` — fail-closed (sem registro = sem consentimento)
- [x] Componente `MinorConsentBadge` no header do paciente (apenas para `patient_type = 'child'`)
- [x] Toggle com input de nome do responsável (pré-preenchido com `legal_guardian || mother_name || father_name`)
- [x] Seção de consentimento destacada (bg-amber-50) na aba "Pais e Responsável" do PatientForm
- [x] `createPatientFromForm` faz upsert em `patient_consents` com `consent_type: 'minor_data_processing'`
- [x] Campo `minorConsent?: boolean` adicionado em `PatientFormData`

**Arquivos criados/modificados:**
- `supabase/migrations/20260224_minor_consent.sql`
- `src/components/patients/MinorConsentBadge.tsx`
- `src/components/patients/PatientForm.tsx`
- `src/components/patients/PatientHeader.tsx`
- `src/services/patients.ts`
- `src/types/database.ts`

**Validação:**
- [x] `npx vite build` passa
- [ ] Paciente child mostra badge de consentimento no header
- [ ] Toggle de consentimento grava com guardian_name
- [ ] PatientForm child mostra seção de consentimento

---

### 5. ~~Implementar exportação CSV/PDF de dados do titular~~ CONCLUÍDO

**Status:** Implementado em 23/02/2026
**Risco:** ~~Promessa documental não cumprida (Art. 18, V LGPD — portabilidade)~~ Mitigado
**Referência legal:** Art. 18, V LGPD

**Implementado:**
- [x] Edge Function `patient-data-export` aceita parâmetro `format` (`json` | `csv`)
- [x] CSV server-side com BOM UTF-8, seções separadas por `=== NOME ===`, headers + rows
- [x] PDF client-side via `jsPDF` com seções: Dados Pessoais, Anamneses, Consultas, Procedimentos, Exames, Orçamentos, Documentos, Transações, Sessões de Voz
- [x] Todos os labels do PDF em português (80+ campos mapeados)
- [x] Footer com document ID + hash SHA-256
- [x] Dropdown no header do paciente com 3 opções: JSON / CSV / PDF
- [x] Download via Blob + `URL.createObjectURL` (robusto em todos os browsers)
- [x] Edge Function deployada em produção

**Arquivos criados/modificados:**
- `supabase/functions/patient-data-export/index.ts` — CSV format + helpers
- `src/utils/patientDataPdfGenerator.ts`
- `src/components/patients/PatientHeader.tsx` — dropdown de export

**Validação:**
- [x] `npx vite build` passa
- [x] Edge Function deployada
- [ ] Export JSON baixa arquivo válido
- [ ] Export CSV baixa arquivo válido com headers
- [ ] Export PDF gera documento legível com labels em pt-BR
- [ ] Rate limit mantido (5/hora)

---

### 6. ~~Elaborar RIPD (Relatório de Impacto à Proteção de Dados)~~ CONCLUÍDO

**Status:** Implementado em 23/02/2026
**Risco:** ~~Art. 38 LGPD — ANPD pode solicitar RIPD para dados sensíveis de saúde~~ Mitigado
**Referência legal:** Art. 38 LGPD

**Implementado:**
- [x] Página `/configuracoes/ripd` com 9 seções conforme diretrizes ANPD:
  1. Identificação dos Agentes (Controlador/Operador/DPO)
  2. Necessidade e Justificativa do RIPD
  3. Descrição do Tratamento de Dados (tabela com categorias, finalidades, bases legais)
  4. Necessidade e Proporcionalidade
  5. Riscos Identificados (resumo dos 18 riscos da Matriz)
  6. Medidas de Mitigação (5 categorias)
  7. Riscos Residuais
  8. Parecer do Encarregado (DPO) com campos de assinatura
  9. Conclusão e Aprovação com campos de assinatura
- [x] Botão "Imprimir / PDF" via `window.print()` com estilos de impressão
- [x] Print CSS: esconde sidebar/nav, `break-inside: avoid` nos cards, formato A4
- [x] Guard admin-only (`useClinic().isAdmin`)
- [x] Card RIPD na seção Legal de Settings

**Arquivos criados/modificados:**
- `src/pages/RIPD.tsx`
- `src/App.tsx` — lazy import + rota
- `src/pages/Settings.tsx` — card na seção Legal
- `src/index.css` — estilos `@media print`

**Validação:**
- [x] `npx vite build` passa
- [ ] Página acessível em `/configuracoes/ripd` (admin only)
- [ ] Impressão/PDF sem cortar cards na quebra de página
- [ ] Card RIPD aparece em Settings > Legal

---

### 7. ~~Endpoint de exclusão/anonimização de dados do titular~~ CONCLUÍDO

**Status:** Implementado em 23/02/2026 (`20260224_anonymize_patient.sql`)
**Risco:** ~~Art. 18, IV LGPD — direito à eliminação~~ Mitigado
**Referência legal:** Art. 18, IV LGPD

**Implementado:**
- [x] RPC `anonymize_patient_data` (SECURITY DEFINER, service_role only):
  - Snapshot pré-anonimização em `audit_logs`
  - Paciente: nome → "PACIENTE ANONIMIZADO", CPF/RG/email/phone/address → null
  - Voice sessions: transcription → "[ANONIMIZADO]", extracted_data → '{}'
  - Todos os consentimentos revogados
  - `deleted_at` setado se não existia
  - Verifica `retention_locked_until` — bloqueia sem override
  - Override requer reason ≥ 10 chars
- [x] Edge Function `patient-data-anonymize`:
  - Auth JWT + role check (admin only)
  - Rate limit: 2/hora
  - Confirmação dupla: `confirmationCode` = 4 primeiras letras do nome (uppercase)
  - Audit via structured logger
- [x] `AnonymizePatientDialog` com 2 etapas:
  1. Checkbox "Compreendo que é irreversível"
  2. Input código de confirmação
  3. Se retention locked: toggle override + textarea justificativa
- [x] Botão "Anonimizar" (admin-only, outline text-red-600, ícone UserX) no PatientHeader
- [x] Service `anonymizePatient()` em `patients.ts`
- [x] Safe messages adicionadas ao `errorHandler.ts`
- [x] Edge Function deployada em produção

**Arquivos criados/modificados:**
- `supabase/migrations/20260224_anonymize_patient.sql`
- `supabase/functions/patient-data-anonymize/index.ts`
- `supabase/functions/_shared/errorHandler.ts`
- `src/components/patients/AnonymizePatientDialog.tsx`
- `src/components/patients/PatientHeader.tsx`
- `src/services/patients.ts`

**Validação:**
- [x] `npx vite build` passa
- [x] Edge Function deployada
- [ ] Anonimização com código correto → dados anonimizados
- [ ] Anonimização com código errado → erro
- [ ] Anonimização dentro de retenção sem override → bloqueada
- [ ] Audit log registra snapshot pré-anonimização

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
[x] Consentimento de menor — badge, form e upsert implementados (P1)
[x] Export funciona em JSON, CSV e PDF — Edge Function deployada (P1)
[x] Endpoint de anonimização — Edge Function deployada com confirmação dupla (P1)
[x] RIPD — página com 9 seções ANPD + impressão/PDF (P1)
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
