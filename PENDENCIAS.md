# PENDENCIAS — itens que dependem de ação manual do Joaquim

## 0. Reprovisionar conta E2E — papéis ✅ / fator MFA (depende do PR)

**Status dos papéis:** RESOLVIDO em produção — `operator` + `coordinator`
ativos (DB Admin `apply`, run 40581585129). Os specs de auth/navegação já
voltaram a passar.

**Restante — fator TOTP:** a conta E2E recriada também perdeu o fator MFA.
Como `coordinator` é papel elevado, o `ProtectedRoute` redireciona toda rota
protegida para `/mfa-enrollment` quando `listFactors()` não tem fator
`verified` — a causa dos ~29 specs que ainda falham (admin, production,
packaging, system-status, visual, accessibility).

A correção está no step "Apply — fator MFA TOTP do usuário E2E" do DB Admin
(idempotente: promove/realinha fatores `totp` existentes ao seed do secret
`E2E_TOTP_SECRET`, ou enrola um novo `verified`; a suíte gera o código do
desafio a partir de `E2E_TOTP_SECRET`).

**O que fazer:** mergear o PR que adiciona o step e rodar Actions →
**DB Admin** → Run workflow → ref `main` → `mode = apply`. Depois, re-rodar
o job E2E do CI — a suíte deve voltar a verde. RLS/functions/migrations já
foram descartados como causa via simulação autenticada.

## 1. Secrets E2E (GitHub Actions)

A suíte E2E autenticada depende destes secrets no repositório
(Settings → Secrets and variables → Actions). O workflow lê `E2E_EMAIL`,
`E2E_PASSWORD`, `E2E_TOTP_SECRET`, `VITE_SUPABASE_URL` e
`VITE_SUPABASE_PUBLISHABLE_KEY` (opcionalmente `E2E_OPERATOR_EMAIL`/
`E2E_OPERATOR_PASSWORD`) — conferir se os nomes cadastrados batem exatamente:

| Secret | Para que serve |
|---|---|
| `E2E_EMAIL` | e-mail do usuário de teste |
| `E2E_PASSWORD` | senha do usuário de teste |
| `E2E_TOTP_SECRET` | seed TOTP do 2FA do usuário de teste |
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave publishable do Supabase |
| `E2E_OPERATOR_EMAIL` / `E2E_OPERATOR_PASSWORD` | usuário operador (opcional) |

Obs.: os cartões anteriores usavam o prefixo `FAST_GRAVACOES_` — o nome final
é o do workflow acima.

## 2. Bitrix OAuth callback vs. gateway JWT

`supabase/config.toml` tem `verify_jwt = true` para `bitrix24-sync`. O
redirect do OAuth (`action=oauth-callback`) chega do navegador do Bitrix sem
Bearer JWT → o gateway responde 401 antes do handler. Para o fluxo OAuth
funcionar de ponta a ponta é preciso `verify_jwt = false` nessa function — mas
o config.toml exige validação contra o projeto canônico antes de mudar gateway.
O handler já se protege (cada action exige a própria credencial), então a
mudança é segura; falta a validação formal no projeto canônico.

## 3. Rate-limit do ghcr.io nos runners do GitHub

Pulls do registry `ghcr.io` (edge-runtime no deploy, postgres no
`migration-repair`) estouram `toomanyrequests` (~44k/min compartilhado entre
todos os IPs de runner do GitHub). Mitigado no `deploy.yml` com retry de 5×
60s (PR #107) — o deploy ficou verde. Se voltar a falhar com
`toomanyrequests`, re-rodar o job; o `migration-repair` segue suscetível no
dump via `supabase db dump` (usa imagem `supabase/postgres`).
