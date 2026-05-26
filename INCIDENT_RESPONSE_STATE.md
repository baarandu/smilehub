# Estado da Resposta ao Incidente Vercel — Snapshot

**Última atualização:** 2026-05-03

Este documento registra onde paramos na execução de `INCIDENT_RESPONSE_VERCEL.md` e quais bloqueios surgiram no caminho. Se uma nova sessão for iniciada, leia isto **primeiro** para não repetir trabalho.

---

## Status geral: **incidente fechado do nosso lado** (com pendências documentadas)

A resposta foi executada com critério de risco — providers em uso real foram rotacionados, providers fora de produção foram pulados deliberadamente, e o que estava bloqueado foi documentado em `INCIDENT_RESPONSE_TODO.md`.

---

## Progresso por fase

### Fase 0 — 2FA — ✅ COMPLETA (2026-04-22/23)
Ativado 2FA via app autenticador em: Google, GitHub (pessoal + org `baarandu`), Supabase, Vercel, Stripe, OpenAI, Resend, SuperSign, Sentry, Meta Business/WhatsApp.
npmjs.com pulado (sem conta no Mac).
2FA validado com logout/login em Supabase e GitHub.

### Fase 1 — Rotação de credenciais — ✅ PARCIAL (decisão informada por risco)

**Rotacionado:**
- **Resend** (`RESEND_API_KEY`) — rotacionado e atualizado em Supabase Secrets em 2026-05-03. Antiga revogada.
- **OpenAI** (`OPENAI_API_KEY`) — rotacionado em 2026-05-03. Atualizado em Supabase Secrets. Antigas revogadas (todas). Nota: usuário revogou todas antes de salvar a nova, mas tinha a string copiada — recuperou sem incidente.
- **Supabase Edge Functions** — `APP_SUPABASE_SECRET_KEY` (sb_secret_*) já existia. Legacy `SUPABASE_SERVICE_ROLE_KEY` mantida (rotacionar JWT secret deslogaria todos os usuários — não vale o trade-off pra incidente preventivo).

**Pulado deliberadamente (não-incidente, registrar em TODO):**
- **Stripe** — sem cobranças reais ainda. Rotacionar antes de ativar primeira cobrança real.
- **Evolution API** — secretária IA em desenvolvimento, não roda em produção. Hospedada em VPS Hostinger; SSH local falhou com "Network is unreachable" (provável firewall Hostinger). Rotacionar via Browser Terminal Hostinger antes de ligar pra cliente real.
- **Meta WhatsApp Cloud API** (`WHATSAPP_ACCESS_TOKEN`) — secret nem está no Supabase, `metaClient.ts` é código morto. Configurar do zero se um dia for usar Meta direto.
- **Sentry** — `SENTRY_AUTH_TOKEN` não estava nem no Supabase nem na Vercel; Sentry nunca foi deployado em produção. Sem ação necessária.

**Bloqueado (documentado em `INCIDENT_RESPONSE_TODO.md`):**
- **SuperSign** (`SUPERSIGN_API_TOKEN`) — usuário sem acesso ao email associado. Recuperação de senha não funciona. Risco residual existe (atacante poderia criar/cancelar envelopes). Plano de retomada documentado.

**Limpeza adicional executada em 2026-05-03:**
- 4 secrets órfãos deletados do Supabase Edge Functions Secrets: `GEMINI_API_KEY`, `ZAPI_*` (×2), `WHATSAPP_WEBHOOK_API_KEY` — não usados por nenhum código.

### Fase 2 — Auditoria — ✅ COMPLETA
- Branches remotas: limpo (só dependabot + features do usuário)
- Autores em 60d: só `vitoraraujocastelobranco@gmail.com`
- Configs locais (`~/.ssh`, `~/.npmrc`, `~/.aws`, `~/.docker`): limpo
- `.github/dependabot.yml`: não faz auto-merge
- HEAD local idêntico a `origin/main`
- Varredura profunda (9 categorias) sem achados
- 129 arquivos duplicados (`* 2.tsx` etc.) + 6 git refs broken removidos — eram artefato de iCloud Drive sync, não comprometimento
- Vercel Activity Log + GitHub Security log: revisão pelo usuário pendente (baixo prio)

### Fase 3 — Hardening — ✅ COMPLETA (essencial)

- **Vercel env vars marcadas Sensitive** — verificado em 2026-05-03. A integração Supabase-Vercel já marca automaticamente: `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_SECRET_KEY`. Vars públicas (`*_ANON_KEY`, `*_PUBLISHABLE_KEY`, `*_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`) corretamente não-sensitive.
- **Confirmado:** nenhuma secret de backend (OpenAI, Stripe, Resend, Sentry, SuperSign, Evolution) está vazada na Vercel — tudo fica só no Supabase Edge Functions Secrets.
- **Branch protection em `main`** — ruleset `Protect main` criado em 2026-05-03 (`github.com/baarandu/smilehub/settings/rules/15884295`):
  - Active ✅
  - Target: default branch (`main`)
  - Restrict deletions ✅
  - Block force pushes ✅
  - Outras regras (signed commits, PR required, etc.) deixadas off — friction excessiva pra dev solo, signed commits exige GPG/SSH config que o usuário não tem.

**Não feito (decisão consciente):**
- Vercel Deployment Protection em previews: não crítico, pode ser feito a qualquer momento.
- Integração Supabase-Vercel não tem granularidade — é binária (conectar/desconectar). Mantida conectada (necessária pra auth funcionar) com mitigação de Sensitive flags.

### Fase 4 — Vulnerabilidades npm — ✅ PARCIAL (não-incidente)
- Root: 16 vulns → 3 (1 crit jspdf, 2 mod dev-only)
- Mobile: 28 vulns → 18 (17 mod Expo deep deps, 1 high xlsx)
- `xlsx` removida do `package.json` raiz (era unused)
- **Pendente (backlog, não-incidente):** decisão sobre jspdf 3→4 (breaking), xlsx em mobile (migração ou remoção do feature `exportCSV`)

---

## Bugs laterais corrigidos durante a resposta

### Pré-existentes — não causados pela resposta ao incidente

1. **`patients_secure` retornando 404** — sintoma de bloqueio Supabase (Apr 23-24). Aparentemente resolveu sozinho quando o platform issue do Supabase passou.
2. **`taxes` 404** — tabela não existe no banco. **Corrigido em 2026-04-24:** trocado por `financial_transactions` em `OnboardingContext.tsx`.
3. **`budgets` 400** — coluna `total_amount` não existe (tabela usa `value`). **Corrigido em 2026-04-24** em `useDashboardAnalytics.ts:82`: `total_amount:value` (alias PostgREST). Bug afetava dashboard (valores zerados).

---

## Bloqueio Supabase 401 (Apr 23-24) — RESOLVIDO

### Sintoma original
Edge Functions deployadas em 2026-04-23/24 retornavam 401 generalizado, incluindo botão "Test" do Dashboard com JWT auto-injetado.

### Resolução
Quando o usuário voltou em 2026-05-03, `accounting-agent` e `dentist-agent` voltaram a responder normalmente. O 500 que aparecia no `dentist-agent` era HTTP 429 do OpenAI (cota esgotada), não relacionado ao platform issue. Provavelmente o estado interno do projeto Supabase foi corrigido pelo suporte sem aviso, ou o problema era transitório.

### Estado atual
- `accounting-agent-v2` (criada como workaround) ainda existe no Supabase. Pode ser deletada a qualquer momento — nenhum frontend aponta pra ela.
- `dentist-agent` e `accounting-agent` originais funcionando normalmente.

---

## Artefatos uncommitted

### Da resposta ao incidente:
- `INCIDENT_RESPONSE_VERCEL.md` (checklist principal)
- `INCIDENT_RESPONSE_STATE.md` (este arquivo)
- `INCIDENT_RESPONSE_TODO.md` (pendências)
- `src/hooks/useDashboardAnalytics.ts` (fix budgets column)
- `src/contexts/OnboardingContext.tsx` (taxes → financial_transactions)
- `package.json` + `package-lock.json` (npm audit fix + remoção xlsx)
- `mobile/package-lock.json` (mobile audit fix)
- `supabase/functions/accounting-agent-v2/` (workaround, pode deletar)

### Pré-existentes (não da resposta ao incidente):
- `supabase/functions/_shared/cors.ts` — adicionar 2 origins (organizaodonto.com.br)
- `supabase/functions/whatsapp-webhook/messageSplitter.ts` — refactor
- `supabase/functions/get-stripe-metrics/index.ts` (deletada)
- `supabase/functions/update-subscription/index.ts` (deletada)
- Outros arquivos diversos

---

## Pendências (ver `INCIDENT_RESPONSE_TODO.md` pra detalhes)

🔴 **Bloqueado:**
- SuperSign — recuperar acesso ao email pra rotacionar token

🟡 **Pulados deliberadamente — rotacionar quando entrar em uso:**
- Stripe (antes de ativar primeira cobrança real)
- Evolution API (antes de ligar a secretária pra cliente real)
- Meta WhatsApp (se um dia substituir Evolution)

🟢 **Operacional / longo prazo:**
- Recuperar email perdido (afeta vários serviços como SSO)
- Adotar password manager (1Password / Bitwarden)
- Configurar `SUPERSIGN_WEBHOOK_SECRET` (bug pré-existente, não-incidente)
- Mover projeto pra fora de Desktop ou desativar iCloud Drive Desktop sync (causa raiz dos arquivos duplicados)
- Decidir sobre vulnerabilidades npm restantes (jspdf, xlsx mobile)
