# PENDENCIAS — itens que dependem de ação manual do Joaquim

## 0. Conta E2E — RESOLVIDO ✅

Papéis `operator` + `coordinator` ativos (DB Admin `apply`, run
40581585129), fator TOTP `verified` (run 40595010266) e baseline do
snapshot da sidebar atualizado no PR #110 (mergeado). CI da main verde
incluindo E2E (run 40669038502) e Deploy verde (run 40669038548).
Nenhuma ação pendente.

## 1. Secrets E2E (GitHub Actions) — RESOLVIDO ✅

Os secrets obrigatórios já estão configurados: a suíte E2E autenticada roda
verde na main (CI run 40669038502) e o workflow aborta antes do Playwright
se faltar `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_TOTP_SECRET`, `VITE_SUPABASE_URL`
ou `VITE_SUPABASE_PUBLISHABLE_KEY` — a conta também tem fator TOTP verified
(prova registrada no RELATORIO_CI).

Resta apenas, **opcional**: `E2E_OPERATOR_EMAIL`/`E2E_OPERATOR_PASSWORD`
(usuário operador para specs que exigem papel operator sem coordinator).

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

## 4. Balanço de planos × código (auditoria 28/10/2026)

7 agentes auditaram cada doc de plano contra a main — 547 itens: 202
implementados, 160 parciais, 171 pendentes, 14 N/A. Detalhe completo em
`docs/estado/BALANCO-DOCS-2026-10-28.md`. Resumo do que falta:

- **Só o Joaquim resolve**: rotação de credenciais antigas
  (service-role, DB password, Bitrix/Resend/Twilio), PITR/restore
  testado, monitor externo, reviewers de Environments, alertas Sentry,
  branch protection com required checks.
- **Bugs reais para o próximo sprint**: Web Push sem criptografia real
  (aes128gcm declarado, payload em texto), JobQRCode↔QRScanner
  incompatíveis, NotificationsList não marca m-/p-/s- como lidas,
  aprovação TPM sem guarda atômica, useMFA.unenroll sem challenge,
  botões inertes (Novo Item, Aplicar Sequenciamento, Mover OS, envio QR),
  KanbanBoard bypass do jobsService.
- **Dívida estrutural**: ~30 painéis com dados fabricados, ~50 itens de
  código morto, autociclos de barrels, ciclo logger↔client, ~21
  providers, state machine de jobs só no client, tabelas ausentes
  (shifts, suppliers, archived_jobs), Bitrix→jobs mapping, stubs
  (pdf-generator, image-optimizer, Twilio), E2E advisory, cobertura ~35%.
