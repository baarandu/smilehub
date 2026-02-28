# Plano de Produção — Smile Care Hub
## Reavaliação Completa (28/02/2026)

Organizado por **risco de quebrar a aplicação** (do mais seguro ao mais arriscado).

---

## TIER 0 — RISCO ZERO (Aditivo, sem alterar código existente) ✅ COMPLETO

Apenas adiciona arquivos, configs ou migrations. Impossível quebrar nada.

### ✅ 0.1 Verificar RLS nas tabelas core do banco
- **O que**: Rodar no Supabase SQL Editor:
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  ```
- **Por quê**: Nenhuma migration habilita RLS em `financial_transactions`, `budgets`, `consultations`, `exams`, `anamneses`, `patient_documents`, `locations`, `clinic_settings`, etc. Se RLS está OFF, **qualquer usuário autenticado vê dados de todas as clínicas**.
- **Ação**: Se OFF → criar migration habilitando RLS + policies. Se ON (via dashboard) → criar migration documentando.
- **Implementado em**: `supabase/migrations/20260228_p0_security_critical_fixes.sql` — RLS habilitado em 16 tabelas com policies clinic-scoped

### ✅ 0.2 `exams` storage bucket — tornar privado
- **O que**: Migration: `UPDATE storage.buckets SET public = false WHERE id = 'exams';`
- **Por quê**: Criado com `public: true`. Imagens clínicas (raio-X, fotos) acessíveis sem autenticação via URL direta.
- **Implementado em**: `supabase/migrations/20260228_p0_security_critical_fixes.sql`

### ✅ 0.3 Missing indexes nas tabelas core
- **O que**: Migration com `CREATE INDEX IF NOT EXISTS` para colunas mais consultadas.
- **Implementado em**: `supabase/migrations/20260228_p1_security_high_fixes.sql` — 7 indexes criados

### ✅ 0.4 Sentry source maps — web
- **O que**: Instalar `@sentry/vite-plugin`, configurar no `vite.config.ts`, adicionar auth token no CI.
- **Implementado em**: `vite.config.ts`, `.github/workflows/ci.yml`, `package.json`

### ✅ 0.5 Sentry plugin no mobile
- **O que**: Adicionar `@sentry/react-native` à lista de `plugins` em `mobile/app.json`.
- **Implementado em**: `mobile/app.json`

### ✅ 0.6 CI: Adicionar job mobile + npm audit
- **O que**: No `.github/workflows/ci.yml`, adicionar job mobile + `npm audit --audit-level=high`.
- **Implementado em**: `.github/workflows/ci.yml`

### ✅ 0.7 `docker-compose.yml` — remover secrets
- **O que**: Mover `AUTHENTICATION_API_KEY` e credenciais DB para `.env.docker` (gitignored).
- **Implementado em**: `docker-compose.yml`, `.env.docker.example`, `.gitignore`

---

## TIER 1 — RISCO MUITO BAIXO (Mudanças isoladas em Edge Functions do backend) ✅ COMPLETO

Cada fix é independente. Se um quebrar, não afeta os outros nem o frontend.

### ✅ 1.1 REGRESSÃO CRÍTICA: `get_profiles_for_users` sem restrição de clinic
- **O que**: Nova migration SQL recriando a função COM shared-clinic check + campo CRO.
- **Implementado em**: `supabase/migrations/20260228_p0_security_critical_fixes.sql`

### ✅ 1.2 REGRESSÃO: `handle_new_user` não popula `roles` array
- **O que**: Nova migration recriando a função incluindo `roles = ARRAY[role_val]` no INSERT.
- **Implementado em**: `supabase/migrations/20260228_p0_security_critical_fixes.sql`

### ✅ 1.3 `soft_delete_patient` — adicionar check de clinic
- **O que**: Nova migration recriando a RPC com verificação de `clinic_users` membership.
- **Implementado em**: `supabase/migrations/20260228_p0_security_critical_fixes.sql`

### ✅ 1.4 `supersign-envelope` — autorização em status/signing-url
- **O que**: Adicionar lookup de `clinic_id` da assinatura + verificar membership.
- **Implementado em**: `supabase/functions/supersign-envelope/index.ts`

### ✅ 1.5 `supersign-webhook` — HMAC timing-safe
- **O que**: Trocar `!==` por comparação XOR timing-safe.
- **Implementado em**: `supabase/functions/supersign-webhook/index.ts`

### ✅ 1.6 `get-stripe-metrics` — restringir a super-admin
- **O que**: Restringido a `is_super_admin` check.
- **Implementado em**: `supabase/functions/get-stripe-metrics/index.ts`

### ✅ 1.7 `evolution-proxy` — rate limiting + audit logging
- **O que**: Adicionado `checkRateLimit` (30/hora) e `log.audit`.
- **Implementado em**: `supabase/functions/evolution-proxy/index.ts`

### ✅ 1.8 `parse-materials` — tornar clinic_id obrigatório
- **O que**: `clinic_id` agora é obrigatório com verificação de membership.
- **Implementado em**: `supabase/functions/parse-materials/index.ts`

### ✅ 1.9 Accounting SECURITY DEFINER — auth check
- **O que**: Check de `auth.uid()` em `clinic_users` para `p_clinic_id`.
- **Implementado em**: `supabase/migrations/20260228_p1_security_high_fixes.sql`

### ✅ 1.10 `send-invite` — HTML escape no email
- **O que**: Escape HTML de `record.role` no template.
- **Implementado em**: `supabase/functions/send-invite/index.ts`

### ✅ 1.11 `batch-signature-create` — pattern de roles
- **O que**: Trocado `clinicUser.role` por pattern `roles` array.
- **Implementado em**: `supabase/functions/batch-signature-create/index.ts`

---

## TIER 2 — RISCO BAIXO (Mudanças pontuais no frontend) ✅ COMPLETO

Fixes de 1-5 linhas em arquivos isolados. Testáveis individualmente.

### ✅ 2.1 React Query global mutation error — toast
- **O que**: Trocado `console.error` por `toast.error()` no `onError` global.
- **Implementado em**: `src/App.tsx`

### ✅ 2.2 `window.location.href` → `useNavigate`
- **O que**: Substituídas 3 ocorrências por `navigate()`.
- **Implementado em**: `src/pages/Financial.tsx`, `src/pages/Pricing.tsx`, `src/components/profile/ProfileMenu.tsx`

### ✅ 2.3 Login "Remember me" — remover checkbox decorativo
- **O que**: Removido checkbox + label que não fazia nada.
- **Implementado em**: `src/pages/Login.tsx`

### ✅ 2.4 OnboardingContext — memoizar value
- **O que**: Value wrapeado com `useMemo`.
- **Implementado em**: `src/contexts/OnboardingContext.tsx`

### ✅ 2.5 Dashboard `recentAlerts` — useMemo
- **O que**: Array wrapeado com `useMemo` + deps corretas.
- **Implementado em**: `src/pages/Dashboard.tsx`

### ✅ 2.6 Mobile: `ScrollView` → `FlatList` na lista de pacientes
- **O que**: Trocado para `FlatList` com `renderItem`, `keyExtractor`.
- **Implementado em**: `mobile/app/(tabs)/patients.tsx`

### ✅ 2.7 Mobile: ErrorBoundary com fallback visual
- **O que**: Criado ErrorBoundary pt-BR + envolvido RootLayout.
- **Implementado em**: `mobile/src/components/ErrorBoundary.tsx`, `mobile/app/_layout.tsx`

### ✅ 2.8 Inline DayContent em Agenda — extrair componente
- **O que**: Movido para constante estável fora do render.
- **Implementado em**: `src/pages/Agenda.tsx`

---

## TIER 3 — RISCO MÉDIO (Mudanças que afetam múltiplos arquivos ou padrões) ✅ COMPLETO

Testar com cuidado antes de mergear. Cada PR separado.

### ✅ 3.1 Consolidar `formatCurrency` / `formatPhone` / `formatCPF`
- **O que**: `src/utils/formatters.ts` como módulo canônico. 14 arquivos atualizados.
- **Implementado em**: 9 componentes importam de `@/utils/formatters`, 3 utils fazem re-export, 2 usam `formatDecimal` alias

### ✅ 3.2 `confirm()` nativo → AlertDialog (17 arquivos)
- **O que**: Hook `useConfirmDialog` aplicado em 14 componentes. 2 restantes em hooks (sem JSX).
- **Implementado em**: AnamneseTab, ChildAnamneseTab, DocumentUpload, LocationsModal, Materials, FinancialSettings, ProfileSettingsModal, Alerts, NewExpenseForm, CouponsTab, OrderDetailDialog, BudgetViewDialog, DocumentsModal, ExamsTab

### ✅ 3.3 Agenda.tsx — migrar para React Query
- **O que**: Substituídos 5 useEffects de data-fetching por useQuery hooks.
- **Implementado em**: `src/pages/Agenda.tsx`, `src/hooks/useAppointments.ts` (added `useMonthDates`, `useAppointmentSearch`)
- **Detalhes**: Optimistic update no status change, invalidateQueries no create/update/delete, search via React Query com `enabled`

### ✅ 3.4 PrivateRoute — paralelizar queries
- **O que**: `Promise.all` para as queries sequenciais do `checkAccess`.
- **Implementado em**: `src/components/auth/PrivateRoute.tsx`

### ✅ 3.5 AppLayout — setInterval → React Query refetchInterval
- **O que**: Migrado polling para `useQuery` com `refetchInterval: 60_000`.
- **Implementado em**: `src/components/layout/AppLayout.tsx`

### ✅ 3.6 `pdfjs-dist` e `jsPDF` — dynamic import
- **O que**: Import estático trocado por `await import()` nos handlers.
- **Implementado em**: `src/components/patients/DocumentsModal.tsx`
- **Nota**: jsPDF já estava em chunk separado (vendor-pdf), mantido como está

### ✅ 3.7 `usePatients()` — trocar por busca paginada nos selects
- **O que**: NewAppointmentDialog, CaseFormSheet, OrderFormSheet — trocados de `usePatients()` (carrega todos) para `usePatientSearch` (server-side, limit 20, debounced 300ms).
- **Implementado em**: `NewAppointmentDialog.tsx`, `CaseFormSheet.tsx`, `OrderFormSheet.tsx`, `Agenda.tsx`, `types.ts`

### ✅ 3.8 ErrorBoundary granular
- **O que**: `SectionErrorBoundary` criado e aplicado no AppLayout (wrapping `{children}`) + Dashboard charts.
- **Implementado em**: `src/components/SectionErrorBoundary.tsx`, `src/components/layout/AppLayout.tsx`, `src/pages/Dashboard.tsx`

---

## TIER 4 — RISCO ALTO (Mudanças estruturais, PR separado cada) — ⬜ PENDENTE

### ⬜ 4.1 TypeScript `strict: true` gradual
- Habilitar `strictFunctionTypes`, `strictBindCallApply`, `noImplicitAny` incrementalmente.
- Corrigir erros em batches (provavelmente centenas).
- **Risco**: Alto (pode revelar bugs ocultos, volume de mudanças)

### ⬜ 4.2 Reduzir `as any` (284 ocorrências em 66 arquivos)
- Criar tipos proper para Transaction, Patient, entidades financeiras.
- Substituir `as any` por tipos corretos nos services e componentes.
- **Risco**: Alto (mudanças em 66 arquivos)

### ⬜ 4.3 Componentes grandes — split
- `DocumentsModal.tsx` (1404 linhas), `NewChildAnamneseDialog.tsx` (1304 linhas), `FiscalDocumentsTab.tsx` (1045 linhas), `AISecretary.tsx` (1397 linhas).
- **Risco**: Alto (refactor massivo de componentes complexos)

### ⬜ 4.4 Acessibilidade completa (web + mobile)
- Web: `aria-label` em todos botões icon-only, `<div onClick>` → `<button>`, `tabIndex` + `onKeyDown`.
- Mobile: `accessibilityLabel` em todos os elementos interativos.
- **Risco**: Alto (toca em praticamente todos os arquivos)

### ⬜ 4.5 Testes abrangentes
- Services: `financial.test.ts`, `patients.test.ts`, `budgets.test.ts`
- Hooks: `usePatients.test.ts`, `useAppointments.test.ts`
- Components: pelo menos PatientForm, IncomeTab
- Meta: cobertura mínima nos fluxos críticos.
- **Risco**: Alto (muitos mocks de Supabase, setup complexo)

---

## TIER 5 — MOBILE FUTURO (Backlog) — ⬜ PENDENTE

### ⬜ 5.1 Push notifications
- `expo-notifications` + backend para registrar tokens + cron para disparos.

### ⬜ 5.2 Offline básico
- `@react-native-community/netinfo` + banner "Sem conexão" + cache AsyncStorage.

### ⬜ 5.3 Busca server-side no mobile
- Pacientes e agenda: trocar busca client-side (carrega todos) por server-side.

### ⬜ 5.4 Universal Links / App Links
- `associatedDomains` (iOS), `intentFilters` (Android) no `app.json`.

### ⬜ 5.5 Dark mode readiness
- Padronizar tokens CSS. 260 ocorrências de cores hardcoded vs 167 tokens.

---

## Resumo Executivo

| Tier | Itens | Status | Progresso |
|------|-------|--------|-----------|
| **T0** | 7 | ✅ Completo | 7/7 |
| **T1** | 11 | ✅ Completo | 11/11 |
| **T2** | 8 | ✅ Completo | 8/8 |
| **T3** | 8 | ✅ Completo | 8/8 |
| **T4** | 5 | ⬜ Pendente | 0/5 |
| **T5** | 5 | ⬜ Pendente | 0/5 |

**Total: 34/44 itens concluídos (77%).**

### Para ir a produção:
Todos os itens bloqueantes de segurança (T0 + T1) estão ✅ implementados. T2 e maior parte de T3 também concluídos. O app está pronto para deploy de produção com os itens pendentes de T3 sendo melhorias de qualidade não-bloqueantes.

---

## Verificação pós-implementação

Após cada tier:
1. `npm run build` — sem erros ✅
2. `npx tsc --noEmit` — sem erros ✅
3. `npm test -- --run` — todos passam
4. Para security: testar endpoints com token de outra clinic
5. Para P0.1: query `pg_tables.rowsecurity` no banco
6. Para mobile: `cd mobile && npx tsc --noEmit`
7. Teste manual: login → dashboard → pacientes → agenda → financeiro
