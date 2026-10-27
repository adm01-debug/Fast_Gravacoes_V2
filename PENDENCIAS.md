# PENDENCIAS — itens que dependem de ação manual do Joaquim

## 0. Rodar o DB Admin em modo `apply` (reprovisionar papéis do usuário E2E)

Diagnóstico fechado pelo inspect do DB Admin: a conta E2E
(`aa2878da-ee51-4e89-88b0-96f18406bb22`, criada em 2026-10-16) está **sem
nenhuma linha em `user_roles`** — a conta foi recriada depois de 11/out e o
`ON DELETE CASCADE` de `user_roles.user_id` apagou os papéis. Sem papel, o app
resolve `role=null` e TODA rota protegida redireciona para `/` em silêncio:
é a causa exata dos 21 specs E2E vermelhos na main (páginas vazias, sem
conteúdo e sem "acesso negado").

A correção já está no workflow DB Admin (step "Apply — papéis do usuário E2E",
idempotente: `INSERT ... ON CONFLICT DO UPDATE` de `operator` + `coordinator`
para o e-mail do secret `E2E_EMAIL`).

**O que fazer:** em Actions → **DB Admin** → Run workflow → ref `main` →
`mode = apply`. Depois, re-rodar o job E2E do CI (ou esperar o próximo push)
— a suíte deve voltar a verde. RLS/functions/migrations já foram descartados
como causa via simulação autenticada (0 linhas visíveis, sem erro de policy).

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
