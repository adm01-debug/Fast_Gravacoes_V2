# Fast Gravacoes V2 - Prontidao para Producao

**Data:** 2026-11-13  |  **main HEAD:** 2f4326c
**Metodo:** auditoria por evidencia real - testes/typecheck/lint locais, execucao e logs do GitHub Actions, chamadas HTTP reais as edge functions do projeto `uoujzvpecohinketylud`, leitura do codigo em clone de `main`. Inventario de linha de base commitado em `inventario/estado/` (`rotas.json`, `edges.json`).

## Resumo dos 9 criterios

| # | Criterio | Status |
|---|---|---|
| 1 | Inventario | OK - rotas.json (58) e edges.json (34) commitados; banco via types.ts + migrations |
| 2 | Cobertura | OK - itens OK com prova; BLOQUEADO marcado com erro exato |
| 3 | Qualidade local | OK - 922 testes exit 0; lint 0 erros exit 0 |
| 4 | GitHub Actions | BLOQUEADO parcial - db-admin historico vermelho (fix #163 na main) e inventario-semanal vermelho (fix PR #180 aguardando dono) |
| 5 | Sem pela metade | BLOQUEADO - image-optimizer e stub 501 (sem chamador no repo) |
| 6 | Banco / RLS | PARCIAL - RLS Regression CI verde + anon 401; advisors/migrations x banco BLOQUEADO (sem access token) |
| 7 | Producao | OK parcial - health-check 200 ao vivo; logs BLOQUEADO (sem telemetria/access token) |
| 8 | Entrega | PR #180 aberta (workflow, regra 8 aguardando dono) |
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
- **db-admin.yml**: run historico (11-10) vermelho diagnosticado = `supabase secrets set` sem `--yes`; **fix #163 ja integrado na main** (`--yes` em db-admin.yml:403/524/526/534). Run de verificacao 43510093330 ficou `queued` (fila de runners degradada) -> BLOQUEADO ate runner.
- **inventario-estado-semanal.yml**: run 43510111468 vermelho, causa raiz = `gerar-repo.mjs:24` emite `ripgrep (rg) nao encontrado` porque o step `Testar os geradores` roda ANTES do `Instalar ripgrep`. **Fix = PR #180** (reverte ordem; actionlint OK). Workflow => regra 8 => aguardando dono.

## 5. Sem "pela metade"
- `image-optimizer` = stub explicito 501 ("is not implemented"), sem chamador no src -> **BLOQUEADO** (funcionalidade nao entregue, documentado em `supabase/functions/REGISTRY.md`).
- `pdf-generator` = funcional (usado via jsPDF em `ExecutionDetailsModal.tsx:159`).
- `MasterAPIPage.tsx:204` `sk_live_fast_XXXX` = placeholder em exemplo educativo de HTTP (bloco `<pre>` de documentacao), nao valor em runtime.
- Placeholders `LOT-XXXX`/`LOT-20251220-XXXX` = UX normal de input.
- Scan de producao em `src` (excl. `*.test.*`): **0 TODO/FIXME/HACK/@ts-ignore/NotImplemented**.

## 6. Banco / RLS
- RLS Regression e check do CI (`ci.yml:469-514`) e passa.
- Chave anonima no PostgREST contra `operators` -> **HTTP 401** (acesso negado a nao-autenticado) = RLS restringindo corretamente (prova de hardening).
- Migrations de controle presentes: `20261107010000_verify_no_using_true_write_policies.sql`, R3.3 `20261109000001_fix_r3_3_revoke_public.sql` (PR #146 integrada).
- **BLOQUEADO**: security advisors e comparacao migrations x banco exigem Management API (`SUPABASE_ACCESS_TOKEN`) - token indisponivel no ambiente; nao afirmo sem evidencia.

## 7. Producao (ao vivo)
- health-check ao vivo: **HTTP 200**. Checks: database:read=pass (448ms), storage:list=pass (162ms), auth:session=pass, config:secrets=pass (0 missing); queue:tpm_notifications=**warn** (0 itens) -> status agregado 'degraded' apenas por esse warn (sem itens pendentes, nao e erro de codigo).
- **BLOQUEADO**: logs de edge functions/banco/deploy pos-ultimo-deploy - exige telemetria/access token indisponivel.

## 8. Entrega
- PR **#180** aberta (claude/fix-inventario-rg-order-*) - fix do workflow de inventario (regra 8, aguardando dono).
- Fixes ja integrados na main: #163 (db-admin `--yes`), #156 (concurrency E2E), #170 (ubuntu-24.04), #146 (R3.3 revoke public).

## BLOQUEADO / aguardando o dono
1. **PR #180** - workflow de inventario (ordering ripgrep). Aguarda merge do dono (regra 8).
2. **db-admin** - confirmar novo run verde quando runner disponivel.
3. **image-optimizer** - stub 501; decisao de negocio (implementar ou remover).
4. **Security advisors + comparacao migrations x banco** - precisa `SUPABASE_ACCESS_TOKEN`.
5. **Logs de producao pos-deploy** - precisa telemetria/access token.

_fim_
