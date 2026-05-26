# Resposta ao Incidente Vercel — Checklist de Rotação

**Data:** 2026-04-22
**Contexto:** Vercel comunicou acesso não autorizado a sistemas internos. Segundo o comunicado, as credenciais desta conta **não** foram identificadas como comprometidas, mas a investigação está em andamento. Este plano é **preventivo**.

**Veredicto da auditoria local do código (2026-04-22):** limpo.
- 100% dos commits dos últimos 60 dias são do e-mail oficial.
- Sem hooks `postinstall`/`preinstall`/`prepare` maliciosos em package.json.
- Sem `eval()`, `new Function()`, `child_process`, endpoints suspeitos (ngrok/webhook.site/pastebin/etc.).
- `HEAD` local é idêntico a `origin/main`.
- Varredura profunda (9 categorias) sem achados.

---

## FASE 0 — Preparação

- [ ] Ativar **2FA via app autenticador ou hardware key** (NÃO SMS) em:
  - [ ] Vercel
  - [ ] GitHub (pessoal + org `baarandu`)
  - [ ] Supabase
  - [ ] Stripe
  - [ ] OpenAI
  - [ ] Resend
  - [ ] SuperSign
  - [ ] Google Workspace
  - [ ] Sentry
  - [ ] npmjs.com
- [ ] Em cada serviço: **listar sessões/dispositivos ativos** e desconectar tudo que não reconhece.

---

## FASE 1 — Rotação de credenciais (ordem importa)

### 1. Supabase (rotacione primeiro — é a fonte da verdade)

Dashboard Supabase → Settings → API:

- [ ] Regenerar **`service_role` key**
- [ ] Regenerar **`anon` key**
- [ ] Avaliar rotacionar **JWT secret** (invalida todas as sessões — faça em horário de baixa)

Dashboard Supabase → Edge Functions → Secrets — atualizar:

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_JWT_SECRET` (se rotacionou)

### 2. Serviços de AI / email / pagamento

- [ ] **OpenAI** — platform.openai.com → API Keys → revogar antiga, criar nova → atualizar `OPENAI_API_KEY` em Supabase Functions Secrets
- [ ] **Stripe** — dashboard.stripe.com → Developers → API Keys → rotacionar **secret key** → Webhooks → rotacionar **signing secret** → atualizar `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`
- [ ] **Resend** — resend.com → API Keys → rotacionar → `RESEND_API_KEY`
- [ ] **SuperSign** — rotacionar token + webhook secret → `SUPERSIGN_API_TOKEN`, `SUPERSIGN_WEBHOOK_SECRET`
- [ ] **Evolution API** — rotacionar chave + webhook secret → `EVOLUTION_API_KEY`, `EVOLUTION_WEBHOOK_SECRET`
- [ ] **WhatsApp Cloud API (Meta)** — rotacionar access token → `WHATSAPP_ACCESS_TOKEN`
- [ ] **Sentry** — rotacionar `SENTRY_AUTH_TOKEN` (usado só em CI para sourcemaps)

### 3. Vercel (aplicação frontend)

Dashboard Vercel → Projeto → Settings → Environment Variables:

- [ ] Atualizar `VITE_SUPABASE_URL`
- [ ] Atualizar `VITE_SUPABASE_ANON_KEY`
- [ ] Atualizar `VITE_SENTRY_DSN` (se rotacionou DSN)
- [ ] Revisar `VITE_AI_SECRETARY_BETA_EMAILS`
- [ ] **Marcar todas como "Sensitive"** (impede leitura após salvar)
- [ ] **Redeploy** manual após atualizar

### 4. GitHub

Pessoal (github.com/settings):

- [ ] Developer settings → **Personal access tokens** → revogar TODOS os que não reconhece ou não usa ativamente
- [ ] Criar novos PATs com **escopo mínimo** e **expiração ≤ 90 dias**
- [ ] **SSH and GPG keys** → remover chaves antigas/não reconhecidas, criar nova par SSH local se necessário
- [ ] **Sessions** → revogar outros dispositivos
- [ ] **Applications → Authorized OAuth Apps** → remover Vercel e re-autorizar (força token novo)

Organização `baarandu`:

- [ ] Settings → **Third-party access** (OAuth apps) → revisar e remover desconhecidos
- [ ] Settings → **Personal access tokens** (fine-grained) → revogar os da org
- [ ] Settings → **People** → conferir se há membro que você não reconhece
- [ ] Settings → **Deploy keys** (por repo) → conferir

### 5. npm

- [ ] npmjs.com → Access Tokens → revogar tokens antigos
- [ ] Gerar novo token com escopo mínimo (publish apenas se precisar)
- [ ] Habilitar 2FA para publish (se publica pacotes)

### 6. Google Workspace

- [ ] myaccount.google.com → Security → **Atividade recente** (revisar 30 dias)
- [ ] **Your devices** → remover aparelhos que não reconhece
- [ ] **App passwords** → revogar tudo que não usa
- [ ] **Third-party apps with account access** → revogar desconhecidos
- [ ] Se é admin do Workspace: Admin Console → Reports → **Audit → Login** (30 dias)
- [ ] Considerar redefinir senha principal se Google é SSO para outros serviços
- [ ] Admin Console → Security → **Alert Center** → revisar alertas pendentes

---

## FASE 2 — Auditorias (detecção de dano já ocorrido)

- [ ] **Vercel Activity Log** (dashboard → Activity): deploys/env var changes/logins de 30 dias. Sinais de alerta: deploy em horário estranho, env var mudada por não-você, novo team member.
- [ ] **GitHub Security log** (pessoal): Settings → **Security log**. Eventos críticos: `oauth_authorization.create`, `public_key.create`, `personal_access_token.access_granted`, push para branch principal por autor estranho.
- [ ] **GitHub Org Audit log** (`baarandu`): mesmos eventos + `repo.add_member`, `team.add_member`.
- [ ] **Branches no remote**: para cada branch ativa, rodar `git log origin/<branch> --not origin/main --format="%h %ae %s"` e verificar se reconhece todos os commits.
- [ ] **Supabase Logs**: filtrar por `service_role` usado fora do esperado; queries em `patients`, `financial_transactions` vindas de IP/origem desconhecida.
- [ ] **Stripe** → Developers → Logs (2 semanas): qualquer requisição fora de seu webhook ou dashboard = suspeita.
- [ ] **OpenAI** → platform.openai.com/usage: pico anômalo indica chave vazada.
- [ ] **Build em prod vs git**: baixar bundle da Vercel e comparar hash com `npm run build` local do mesmo commit.

---

## FASE 3 — Endurecimento

### Atualizações automáticas

- [ ] **Dependabot auto-merge**: desativar em `.github/dependabot.yml` ou exigir review manual em branch protection de `main`
- [ ] **Vercel auto-deploy**: Settings → Git → **Ignored Build Step** ou desabilitar deploy automático de branches não-`main`
- [ ] GitHub → Settings → General → **desmarcar "Allow auto-merge"**

### Branch protection em `main` (GitHub)

- [ ] Exigir **PR + pelo menos 1 review aprovado**
- [ ] Exigir **status checks verdes** (CI do `.github/workflows/ci.yml`)
- [ ] Exigir **signed commits** (impede commits com seu nome sem sua chave GPG/SSH)
- [ ] **Dismiss stale reviews** quando novos commits forem pushados
- [ ] **Restrict who can push** — só você

### Higiene local

- [x] Limpar refs quebradas do macOS em `.git/refs/remotes/origin/` (feito em 2026-04-22)
- [ ] Criar novo par SSH local, remover chave antiga do GitHub
- [ ] Verificar `~/.ssh/authorized_keys` se este Mac recebe SSH
- [ ] Conferir `~/.aws`, `~/.npmrc`, `~/.docker/config.json` por tokens antigos a rotacionar

### Vercel

- [ ] Marcar TODAS env vars como **Sensitive** (bloqueia leitura pós-save)
- [ ] Settings → **Team Members** / **Access** — remover quem não precisa
- [ ] Habilitar **Deployment Protection** em branches preview (requer login pra ver)

---

## FASE 4 — Verificação pós-rotação

- [ ] Rodar `npm audit fix` na raiz e em `mobile/` (há 1 critical + 17 highs, não ligadas ao incidente mas vale limpar)
- [ ] Substituir `xlsx` por `exceljs` (xlsx não tem fix para prototype pollution + ReDoS)
- [ ] Testar login/signup, pagamento (Stripe test mode), WhatsApp webhook, assinatura eletrônica, Edge Functions principais após rotação
- [ ] Monitorar Sentry por 7 dias por erros inesperados em produção (chave antiga ainda em algum lugar?)
- [ ] Agendar revisão trimestral de tokens e acessos (colocar no calendário)

---

## Quando suspeitar que houve dano

Se qualquer dos itens da **Fase 2** mostrar anomalia, **escale imediatamente**:
- Troque senha principal da conta afetada
- Revogue TODAS as credenciais relacionadas (não só a suspeita)
- Preserve logs (screenshot dashboard antes de mudar algo)
- Notifique usuários conforme exigido por LGPD se houver evidência de vazamento de dados pessoais

---

## Referências

- Vercel Security Bulletin: https://vercel.com/security
- GitHub audit log doc: https://docs.github.com/pt/organizations/keeping-your-organization-secure/reviewing-the-audit-log-for-your-organization
- Supabase key rotation: https://supabase.com/docs/guides/api/api-keys
