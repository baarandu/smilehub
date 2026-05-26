# Pendências da Resposta ao Incidente Vercel

**Última atualização:** 2026-05-03

Itens que ficaram em aberto da rotação. Resolver em ordem decrescente de risco quando possível.

---

## 🔴 Bloqueado por perda de acesso

### SuperSign — `SUPERSIGN_API_TOKEN` não rotacionado
- **Bloqueio:** sem acesso ao email associado à conta SuperSign → recuperação de senha não funciona.
- **Risco residual:** se a chave vazou no incidente Vercel, atacante pode criar/cancelar envelopes em nome da clínica.
- **Plano de resolução:**
  1. Recuperar o email (telefone de recuperação, formulário do Google se Gmail).
  2. Se não recuperar: contatar suporte SuperSign com `SUPERSIGN_ACCOUNT_ID` + CNPJ/contrato pra transferir ownership.
  3. Após login: rotacionar `SUPERSIGN_API_TOKEN` (revogar antigo, criar novo, atualizar Supabase Secrets).
- **Mitigação enquanto pendente:** monitorar histórico de envelopes no painel via login alternativo (se houver) ou via API com o token atual.

---

## 🟡 Pulados deliberadamente — rotacionar quando entrar em uso

### Stripe — secret + webhook
- **Por quê pulou:** sem cobranças reais ainda.
- **Quando rotacionar:** **antes** de ativar primeira cobrança real.

### Evolution API — `EVOLUTION_API_KEY` + `EVOLUTION_WEBHOOK_SECRET`
- **Por quê pulou:** secretária IA ainda em desenvolvimento, WhatsApp da clínica não usa em produção.
- **Quando rotacionar:** antes de ligar a secretária pra cliente real.
- **Onde está hospedada:** VPS Hostinger `srv1495933.hstgr.cloud` (`187.77.241.59`).
- **Como acessar:** Painel Hostinger → VPS → Gerir → Terminal do navegador (SSH local da minha máquina não funciona — provável firewall Hostinger).

### Meta WhatsApp Cloud API — `WHATSAPP_ACCESS_TOKEN`
- **Por quê pulou:** secret nem está no Supabase, e `metaClient.ts` é código morto.
- **Quando resolver:** se um dia for usar Meta direto (em vez de Evolution), configurar do zero.

---

## 🟢 Operacional / longo prazo (não-incidente, mas importante)

### Recuperar acesso ao email perdido
- Risco operacional: vários serviços podem estar associados (Google, Meta Business, banco?).
- Auditoria: listar todos os serviços que usam esse email como login e mapear plano B em cada um.

### Adotar password manager (1Password, Bitwarden, iCloud Keychain)
- **Mínimo cadastrado:** senha + **email associado** + 2FA backup codes pra cada serviço crítico.
- Lista mínima de serviços críticos a entrar:
  - GitHub (pessoal + org `baarandu`)
  - Vercel
  - Supabase
  - Hostinger
  - Stripe
  - SuperSign
  - OpenAI
  - Resend
  - Google Workspace
  - Sentry
  - Apple ID

### Configurar webhook do SuperSign de verdade (bug pré-existente)
- A função `supabase/functions/supersign-webhook/index.ts` espera `SUPERSIGN_WEBHOOK_SECRET` (linha 42), mas o secret não existe no Supabase Secrets.
- Resultado: callbacks do SuperSign são silenciosamente rejeitados (HMAC fail).
- Não tem impacto se o fluxo atual é sem callback (dentista assina, frontend faz polling). Se quer notificação automática quando assinatura completa, precisa configurar.
