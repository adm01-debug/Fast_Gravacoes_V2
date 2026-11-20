# Fast Gravacoes V2 - Prontidao para Producao

**Data:** 2026-11-17  |  **main HEAD:** 32c02f03 (pós-merge #190/#188)
**Metodo:** auditoria por evidencia real - testes/typecheck/lint locais, execucao e logs do GitHub Actions, chamadas HTTP reais as edge functions do projeto `uoujzvpecohinketylud`, leitura do codigo em clone de `main`. Inventario de linha de base commitado em `inventario/estado/` (`rotas.json`, `edges.json`).

## Resumo dos 9 criterios

| # | Criterio | Status |
|---|---|---|
| 1 | Inventario | OK - rotas.json (58) e edges.json (34) commitados; banco via types.ts + migrations |
| 2 | Cobertura | OK - itens OK com prova; BLOQUEADO marcado com erro exato |
| 3 | Qualidade local | OK - 922 testes exit 0; lint 0 erros exit 0 |
| 4 | GitHub Actions | BLOQUEADO parcial - so inventario-semanal vermelho (fix PR #180 aguardando dono); db-admin 43510093330 success |
| 5 | Sem pela metade | BLOQUEADO - image-optimizer e stub 501 (sem chamador no repo) |
| 6 | Banco / RLS | PARCIAL - RLS Regression CI verde + anon 401; advisors/migrations x banco BLOQUEADO (sem access token) |
| 7 | Producao | OK - app 200 com URL/key embutidas (envs corrigidas) + health-check 200 ao vivo; logs BLOQUEADO (sem telemetria/access token) |
| 8 | Entrega | #185, #186, #190 e #188 mergeadas; #184 e #189 abertas (workflow, regra 8 aguardando dono) |
| 9 | Relatorio | este documento |

## 1. Inventario de funcionalidades (baseline)

### Rotas - frontend (58 total; 50 protegidas, 6 publicas, 2 redirecionamentos, 0 problemas)
_Fonte: `inventario/estado/rotas.json` (gerado por `scripts/inventario/gerar-rotas.mjs` a partir de `src/routes/AppRoutes.tsx`)._

| Rota | Componente | Acesso |
|---|---|---|
| * | NotFound | publica |
| / | Index | protegida |
| /abc |  | publica |
| /abc-costing | ABCCostingDashboard | protegida |
| /admin/monitoring | SystemMonitoringPage | protegida |
| /admin/telemetria | AdminTelemetriaPage | protegida |
| /alerts | AlertsDashboard | protegida |
| /assistant | TechnicalAssistantPage | protegida |
| /audit | AuditTrailPage | protegida |
| /auth | AuthPage | publica |
| /bi | BIDashboard | protegida |
| /calendar/daily | DailyCalendar | protegida |
| /calendar/monthly | MonthlyCalendar | protegida |
| /calendar/weekly | WeeklyCalendar | protegida |
| /code-quality | CodeQualityDashboard | protegida |
| /design-system | DesignSystemPage | publica |
| /digital-twin | DigitalTwin | protegida |
| /documents | DocumentsPage | protegida |
| /efficiency | EfficiencyDashboard | protegida |
| /energy | EnergyDashboard | protegida |
| /executive | ExecutiveDashboard | protegida |
| /gamification | GamificationPage | protegida |
| /install | InstallAppPage | publica |
| /integrations/bitrix24 | Bitrix24ConfigPage | protegida |
| /inventory | InventoryPage | protegida |
| /kanban | KanbanBoard | protegida |
| /kiosk | KioskPage | protegida |
| /knowledge | TechnicalKnowledgeBase | protegida |
| /kpis | KPIDashboard | protegida |
| /logistics | LogisticsPage | protegida |
| /machines | MachinesPage | protegida |
| /machines/compare | MachineComparisonPage | protegida |
| /master-api | MasterAPIPage | protegida |
| /mfa-enrollment | MfaEnrollmentPage | protegida |
| /ml-predictions | MLPredictionsDashboard | protegida |
| /new-job | NewJobPage | protegida |
| /notifications | NotificationsPage | protegida |
| /oee | OEEDashboard | protegida |
| /operator | OperatorView | protegida |
| /operator-history | OperatorHistoryPage | protegida |
| /operator-productivity | OperatorProductivityPage | protegida |
| /operators | OperatorsPage | protegida |
| /operators/productivity |  | publica |
| /packaging | PackagingDashboard | protegida |
| /packaging/kiosk | PackagingKioskPage | protegida |
| /pending | PendingQueue | protegida |
| /report-builder | ReportBuilderPage | protegida |
| /reset-password | ResetPasswordPage | publica |
| /scanner | QRScannerPage | protegida |
| /security | SecurityDashboard | protegida |
| /settings | SettingsPage | protegida |
| /shift-handover | ShiftHandoverPage | protegida |
| /simulation | SimulationDashboard | protegida |
| /spc | SPCDashboard | protegida |
| /status | SystemStatusPage | protegida |
| /tpm | TPMDashboard | protegida |
| /traceability | TraceabilityPage | protegida |
| /track | PublicTrackingPage | publica |

### Edge functions (34)
_Fonte: `inventario/estado/edges.json`._

- approve-password-reset
- auto-promote-jobs
- backup-scheduler
- bitrix24-sync
- calculate-inventory-intelligence
- calculate-rankings
- check-login-lockout
- cleanup-security-logs
- create-operator
- cron-alert-email
- cron-cleanup
- csp-report
- daily-maintenance-summary
- erp-api
- excel-export
- external-db-bridge
- health-check
- health-monitor
- image-optimizer
- metrics-collector
- ml-predictions
- new-device-alert
- pdf-generator
- rate-limit-check
- security-alert
- send-email-report
- send-loss-risk-alert
- send-push-notification
- send-tpm-email
- technical-assistant
- tpm-notifications
- update-operator
- validate-login-ip
- webhook-handler

Sem chamador no repositorio (chamadas de cron/API externa/interna): backup-scheduler, cleanup-security-logs, cron-alert-email, cron-cleanup, erp-api, excel-export, external-db-bridge, image-optimizer, metrics-collector, rate-limit-check, security-alert, send-email-report, tpm-notifications, validate-login-ip

### Banco
- Tabelas modeladas no schema publico no front: 133 modeladas no front (src/integrations/supabase/types.ts)  (contagem de baseline)
- Migrations SQL no repo: **245**
- Extensoes habilitadas (query read-only anterior): pg_cron, pg_net, pg_stat_statements, pgcrypto, plpgsql, supabase_vault, uuid-ossp

### Workflows ativos (na main)
automation-local, branch-hygiene-audit, ci, contexto, db-admin, deploy, graphify, inventario-estado-semanal, migration-repair, settings-guard, visual-baselines

## 3. Qualidade local (main HEAD)
- `npm run build` -> **exit 0** (vite build, 37.62s) - confirmado com LASTEXITCODE=0
- `npm run test` -> **922 testes, 65 arquivos, exit 0**
- `npm run lint` -> **0 erros / 22 warnings, exit 0** (warnings pre-existentes)
- `inventario:test` -> exit 0
- CI Quality Gate do ultimo merge -> verde (run 43467436090, sha 274678475; 9/10 checks + Quality Gate success; so Bundle Diff skippado)

## 4. GitHub Actions (estado real)
- **ci.yml**: ultima execucao em main verde.
- **db-admin.yml**: run historico (11-10) vermelho diagnosticado = `supabase secrets set` sem `--yes`; **fix #163 ja integrado na main** (`--yes` em db-admin.yml:403/524/526/534). Run de verificacao 43510093330: **success** (concluido, head 2f4326c, main) - migrations aplicadas em dia.
- **inventario-estado-semanal.yml**: run 43510111468 vermelho, causa raiz = `gerar-repo.mjs:24` emite `ripgrep (rg) nao encontrado` porque o step `Testar os geradores` roda ANTES do `Instalar ripgrep`. **Fix = PR #180** (reverte ordem; actionlint OK). Workflow => regra 8 => aguardando dono.

## 5. Sem "pela metade"
- `image-optimizer` = stub explicito 501 ("is not implemented"), sem chamador no src -> **BLOQUEADO** (funcionalidade nao entregue, documentado em `supabase/functions/REGISTRY.md`).
- `pdf-generator` = funcional (usado via jsPDF em `ExecutionDetailsModal.tsx:159`).
- `MasterAPIPage.tsx:204` `sk_live_fast_XXXX` = placeholder em exemplo educativo de HTTP (bloco `<pre>` de documentacao), nao valor em runtime.
- Placeholders `LOT-XXXX`/`LOT-20251220-XXXX` = UX normal de input.
- Scan de producao em `src` (excl. `*.test.*`): **0 TODO/FIXME/HACK/@ts-ignore/NotImplemented**.

## 6. Banco / RLS
- RLS Regression e check do CI (`ci.yml:469-514`) e passa.
- Chave anonima no PostgREST contra `operators` -> **HTTP 404** (rota nao exposta ao schema publico; acesso negado a nao-autenticado). Contra `profiles` -> **HTTP 401 `permission denied`** (RLS ativa). Evidencia coletada ao vivo em 2026-11-14 (3x estavel).
- Migrations de controle presentes: `20261107010000_verify_no_using_true_write_policies.sql`, R3.3 `20261109000001_fix_r3_3_revoke_public.sql` (PR #146 integrada).
- **BLOQUEADO**: security advisors e comparacao migrations x banco exigem Management API (`SUPABASE_ACCESS_TOKEN`) - token indisponivel no ambiente; nao afirmo sem evidencia.

## 7. Producao (ao vivo)
- **12:40Z - producao restaurada**: bundle antigo (`index-BDsnRvH6.js`, deploy `dpl_J11s`) quebrava com `Uncaught Error: Configuração ausente: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY` (`src/lib/envGuard.ts:11-16`). Causa raiz: as envs `VITE_*` na Vercel estavam `type=sensitive` e chegavam **vazias** ao build do Vite (`VITE_SUPABASE_URL:""` no bundle). Fix: removidas e recriadas como `type=plain` (target production/preview) com os valores públicos reais via API Vercel, seguido de redeploy de producao.
- **Evidencia (atual):** bundle `index-D-4TLgjB.js` (deploy `dpl_Fo57g2ZCW6T71G52cDsG9tCNJyqB`, sha `49911214`, pós-#185) contem `VITE_SUPABASE_URL:"https://uoujzvpecohinketylud.supabase.co"` e `VITE_SUPABASE_PUBLISHABLE_KEY:"sb_publishable_..."`; `auth/v1/settings` responde **200** com a publishable key; login invalido responde **400** (fluxo auth ativo). `profile` de anon responde **401 42501** (RLS).
- health-check ao vivo: **HTTP 200**. Checks: database:read=pass, storage:list=pass, auth:session=pass, config:secrets=pass; queue:tpm_notifications sera confirmado pos-merge da #182.
- **BLOQUEADO**: logs de edge functions/banco/deploy pos-ultimo-deploy - exige telemetria/access token indisponivel.

## 8. Entrega
- PR **#184** aberta (chore/dependabot `.github/dependabot.yml`, regra 8 aguardando dono). **Suplantada pela #189**, que traz o mesmo arquivo em versao superior (agrupamento production/development, timezone, commit-message) — so uma das duas pode entrar.
- PR **#189** aberta (infra/dependency-review + dependabot, regra 8 aguardando dono).
- Mergeadas em 2026-11-14: **#185** (lint: 22 warnings -> 0; sha `49911214`) e **#186** (inventario; sha `9ed883f2`). Mergeadas em 2026-11-17: **#190** (redacao de chave `sk_live` em documento versionado; sha `64c3b0c0`) e **#188** (restaura guardas `using` e `let`/`var` no autofix; sha `32c02f03`). Fixes ja integrados na main: #163 (db-admin `--yes`), #156 (concurrency E2E), #170 (ubuntu-24.04), #146 (R3.3 revoke public), #180 (inventario rg order), #182 (health-check fila TPM).

### Incidente de CI — 2026-11-17 (resolvido)
- **Sintoma:** 100% dos workflows em `startup_failure` com 0s, em todas as branches e tambem nos agendados de `main`. Ultimo run saudavel: 2026-11-14 (`43609384963`). Efeito pratico: o check obrigatorio `Quality Gate ✅` nunca reportava, entao **nenhuma PR podia ser mergeada**, e a branch gerada `contexto` parou de ser atualizada.
- **Causa raiz:** `GET /repos/adm01-debug/Fast_Gravacoes_V2/actions/permissions` retornava `allowed_actions="local_only"`, politica que bloqueia qualquer action de terceiros (`actions/checkout`, `actions/setup-node`, ...) no arranque do job. O baseline versionado em `scripts/ci/github-settings-baseline.json` (medido 2026-11-08) declara `allowed_actions="all"`; `git grep local_only` em todas as 39 refs do repositorio nao retorna nada — ou seja, a mudanca foi feita fora do versionamento, nunca foi decisao documentada.
- **Correcao:** `PUT /actions/permissions` com `allowed_actions=all`, restaurando o baseline. CI voltou a executar no mesmo minuto.
- **Achado colateral:** o `dependency-graph` do repositorio estava desligado (o job Dependency Review falhava com *"Dependency review is not supported on this repository"*). Habilitado via `PUT /vulnerability-alerts` + `PUT /automated-security-fixes`.
- **Licao:** o `github-settings-guard.mjs` existe justamente para detectar esse desvio, mas roda **dentro** do Actions — quando a politica de Actions e quebrada, o proprio guarda morre junto. Monitorar `allowed_actions` por fora do Actions fecharia o ponto cego.

## BLOQUEADO / aguardando o dono
1. **PR #184** - dependabot mensal (`.github/dependabot.yml`). Aguarda merge do dono (regra 8).
2. ~~**PR #180** - inventario rg order~~ -> mergeada (144be3e3).
3. ~~**PR #182** - health-check fila TPM~~ -> mergeada (c65ff2e0); confirmar `queue:tpm_notifications=pass` ao vivo.
4. ~~**Chave `sk_live_***` exposta**~~ -> FECHADO 2026-11-20: verificacao exaustiva provou que **nao existe chave Stripe real**. A unica ocorrencia no historico (`analise-prs/auditorias-anteriores.md`, commit `c3f02277`, 4x) e `sk_live_fast_9283749123847` — valor **ficticio**: chaves reais do Stripe sao `sk_live_` + 24 hex, sem segmento literal como `fast_`. Nenhuma var `STRIPE_` em `.env*`, workflows, `supabase/config.toml` ou secrets do GitHub; o codigo (`MasterAPIPage.tsx:27`) le `VITE_MASTER_API_DISPLAY_KEY` (env placeholder, `.env.example:28`); o repo nao tem integracao Stripe (`docs/estado/_lote-14-varredura-features-lib.md`). Nada a rotacionar/tombar no provedor.
5. **image-optimizer** - stub 501; decisao de negocio (implementar ou remover).
6. **Security advisors + comparacao migrations x banco** - precisa `SUPABASE_ACCESS_TOKEN`.
7. **Logs de producao pos-deploy** - precisa telemetria/access token.
8. **Env `VITE_SUPABASE_PUBLISHABLE_KEY` fora do repo** - as envs `VITE_*` vivem so no dashboard Vercel (recriadas como `plain`); `.env.production` versionado tem placeholders. Quem gera o bundle de producao e a Vercel, nao a CI do GitHub (`docs/agentes/vercel-deploy.md`), entao a configuracao precisa continuar no projeto Vercel. Recomendado: documentar o conjunto obrigatorio (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) e versionar a conferencia, para que uma recriacao manual futura nao derrube a producao de novo.
9. ~~**Workflows orfaos ativos sem arquivo na main**~~ -> resolvido em 2026-11-17. Eram 10 (`_tmp-fix-deno-lock`, `-r2`, `-r3`, `_tmp-probe` a `_tmp-probe6`, `_tmp-regenerate-deno-lock`), todos sem arquivo em `main` e com 0 runs. Desativados via `PUT /actions/workflows/{id}/disable`; estado atual `disabled_manually`. Reversivel pelo endpoint `/enable`.
10. **branch-hygiene-audit.yml e graphify.yml (main)** - sem run no branch main no periodo recente (branch-hygiene-audit: 0 runs; graphify: so PR-trigger, runs verdes). Nao configuram falha, mas nao ha execucao de agendado em main a certificar.
_fim_
