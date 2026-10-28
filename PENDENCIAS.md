# PENDENCIAS — itens que dependem de ação manual do Joaquim

## 0. Conta E2E — RESOLVIDO ✅

Papéis `operator` + `coordinator` ativos (DB Admin `apply`, run
40581585129), fator TOTP `verified` (run 40595010266) e baseline do
snapshot da sidebar atualizado no PR #110 (mergeado). CI da main verde
incluindo E2E (run 40669038502) e Deploy verde (run 40669038548).
Nenhuma ação pendente.

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
