# Contexto do projeto para agentes de IA

GERADO AUTOMATICAMENTE por scripts/ai-context/gerar.mjs — não editar à mão; será sobrescrito.
Publicado em `docs/contexto/codigo/` na branch `contexto` (gerada, nunca abra PR dela) a cada push em `main` e a cada 10 minutos pelo workflow `contexto.yml`; índice único das três fontes em `docs/contexto/00-INDEX.md`. Gere local com `node scripts/ai-context/gerar.mjs`. Commit-base: `3aaa14fe14b34cad5933bdc062d98140dc96ac6c` (2026-11-25T13:20:48-03:00).

## Como usar (leia antes de planejar ou executar qualquer tarefa)
1. **Tela/rota/menu** → `rotas.json` (url/vista/menu → arquivo → hooks → tabelas → edges, transitivo por import estático; `diretos` = só a tela e seus imports de 1º nível; `rotas_http_backend` para APIs) e `modulos.json` (módulo inteiro + dependências entre módulos).
2. **Hook/serviço/lógica** → `hooks.json`, `logica.json` (quem usa, o que toca, se tem teste).
3. **Edge function / serverless** → `edge-functions.json` (verify_jwt, tabelas, env, quem chama, órfãs).
4. **Banco** → `banco.json` (colunas, RLS, policies, índices, FKs, triggers, cron jobs, buckets, drift migration×types, uso no código) — visão do código; para o banco vivo use o MCP.
5. **Antes de criar arquivo** → `convencoes.json` (onde ficam as coisas, nomenclatura, alias), `componentes.json` (nomes duplicados, órfãos), `grafo.json` (hubs, ciclos de import) e `grafo-graphify.json` (grafo por AST: comunidades, símbolos mais chamados, comunidade de cada arquivo).
6. **CI/scripts/deploy/env/integrações/permissões/flags** → `ferramentas.json` e `scripts.json`.
7. **Antes de abrir PR** → `testes.json` (o que tem e não tem teste, onde os testes ficam), `baseline.json` (alertas, TODOs, hotspots, últimos commits).
Os JSONs são grandes: filtre com `grep`/`jq` pelo caminho/arquivo/tabela da sua tarefa; não carregue tudo.

## Stack
- linguagens: TypeScript (1081), SQL (273), Markdown (108), JavaScript (54), JSON (33), YAML (15), Python (13), Shell (6)
- linguagem_principal: TypeScript
- framework: React
- backend_http: n/d
- bundler: Vite
- roteador: react-router
- banco: Supabase
- testes: vitest, playwright
- ui: tailwind, radix/shadcn
- estado: react-query, zustand
- gerenciador_pacotes: npm
- node: n/d
- python: n/d
- deploy: vercel
- monorepo: n/d
- pastas_fonte: src

## Números
| item | qtd |
|---|---|
| arquivos_total | 1619 |
| arquivos_codigo | 1145 |
| linhas_codigo | 193920 |
| rotas | 58 |
| rotas_http_backend | 0 |
| vistas_por_id | 0 |
| itens_menu | 69 |
| modulos | 74 |
| componentes | 622 |
| hooks | 197 |
| edge_functions | 33 |
| tabelas | 133 |
| migrations | 265 |
| cron_jobs | 5 |
| testes | 146 |
| workflows | 12 |
| scripts | 41 |
| docs_md | 108 |

## Onde ficam as coisas
- telas: src/pages (56)
- componentes: src/components (403), src/features (144), src/pages (56)
- hooks: src/features (113), src/hooks (54), src/components (15)
- servicos_logica: src/lib (42), scripts/graphify (5), src/integrations (3)
- testes: co-localizado (*.test) (109), tests/ (19), outro (18)
- edge_functions: supabase/functions
- migrations: supabase/migrations
- scripts: scripts/ci (6), scripts/graphify (5), scripts/inventario (5)
- docs: docs (11), (raiz) (10), .github (1)
- nomenclatura: {"componentes":"PascalCase (90%)","hooks":"use + PascalCase","servicos":"camelCase (98%)","edge_functions":"kebab-case (100%)","tabelas":"snake_case (95%)"}
- instruções para agentes no repo: AGENTS.md, CLAUDE.md

## Módulos (menu → domínio)
| módulo | itens de menu | telas/rotas | arquivos | hooks locais | edges | tabelas |
|---|---|---|---|---|---|---|
| components/abc | 0 | 0 | 6 | 8 | 0 | 7 |
| components/accessibility | 0 | 0 | 5 | 4 | 0 | 0 |
| components/alerts | 0 | 0 | 6 | 11 | 1 | 3 |
| components/auth | 0 | 0 | 6 | 8 | 0 | 2 |
| components/calendar | 0 | 0 | 17 | 21 | 1 | 5 |
| components/dashboard | 0 | 0 | 32 | 80 | 5 | 63 |
| components/design-system | 0 | 0 | 71 | 26 | 2 | 9 |
| components/jobs | 0 | 0 | 8 | 42 | 1 | 30 |
| components/kanban | 0 | 0 | 6 | 22 | 2 | 11 |
| components/knowledge | 0 | 0 | 15 | 11 | 1 | 11 |
| components/layout | 0 | 0 | 12 | 43 | 1 | 15 |
| components/machines | 0 | 0 | 10 | 22 | 3 | 19 |
| components/navigation | 0 | 0 | 15 | 37 | 2 | 12 |
| components/offline | 0 | 0 | 5 | 3 | 0 | 5 |
| components/operator | 0 | 0 | 8 | 4 | 1 | 3 |
| components/operators | 0 | 0 | 27 | 22 | 3 | 13 |
| components/planning | 0 | 0 | 7 | 23 | 1 | 8 |
| components/qrcode | 0 | 0 | 10 | 6 | 0 | 6 |
| components/settings | 0 | 0 | 12 | 20 | 3 | 12 |
| components/shift | 0 | 0 | 10 | 19 | 1 | 12 |
| components/technical-assistant | 0 | 0 | 8 | 4 | 0 | 3 |
| components/traceability | 0 | 0 | 13 | 18 | 1 | 8 |
| components/ui | 0 | 0 | 61 | 12 | 0 | 1 |
| contexts | 0 | 0 | 14 | 22 | 0 | 7 |
| features/admin | 0 | 0 | 52 | 62 | 2 | 36 |
| features/analytics | 0 | 0 | 74 | 55 | 3 | 39 |
| features/auth | 0 | 0 | 12 | 8 | 2 | 4 |
| features/inventory | 0 | 0 | 9 | 13 | 1 | 9 |
| features/jobs | 0 | 0 | 26 | 32 | 3 | 12 |
| features/maintenance | 0 | 0 | 41 | 18 | 2 | 29 |
| features/notifications | 0 | 0 | 26 | 44 | 4 | 19 |
| features/packaging | 0 | 0 | 35 | 23 | 1 | 15 |
| features/production | 0 | 0 | 27 | 30 | 1 | 21 |
| hooks | 0 | 0 | 45 | 62 | 3 | 36 |
| hooks/abc | 0 | 0 | 5 | 6 | 0 | 7 |
| lib | 0 | 0 | 38 | 15 | 2 | 15 |
| pages | 66 | 56 | 56 | 206 | 13 | 109 |

## Rotas (url → arquivo)
- `/` [tela] → src/pages/Index.tsx (protegida)
- `/*` [tela] → src/pages/NotFound.tsx
- `/abc` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/abc-costing` [tela] → src/pages/ABCCostingDashboard.tsx (protegida)
- `/admin/monitoring` [tela] → src/pages/SystemMonitoringPage.tsx (protegida)
- `/admin/telemetria` [tela] → src/pages/AdminTelemetriaPage.tsx (protegida)
- `/alerts` [tela] → src/pages/AlertsDashboard.tsx (protegida)
- `/assistant` [tela] → src/pages/TechnicalAssistantPage.tsx (protegida)
- `/audit` [tela] → src/pages/AuditTrailPage.tsx (protegida)
- `/auth` [tela] → src/pages/AuthPage.tsx
- `/bi` [tela] → src/pages/BIDashboard.tsx (protegida)
- `/calendar/daily` [tela] → src/pages/DailyCalendar.tsx (protegida)
- `/calendar/monthly` [tela] → src/pages/MonthlyCalendar.tsx (protegida)
- `/calendar/weekly` [tela] → src/pages/WeeklyCalendar.tsx (protegida)
- `/code-quality` [tela] → src/pages/CodeQualityDashboard.tsx (protegida)
- `/design-system` [tela] → src/pages/DesignSystemPage.tsx (protegida)
- `/digital-twin` [tela] → src/pages/DigitalTwin.tsx (protegida)
- `/documents` [tela] → src/pages/DocumentsPage.tsx (protegida)
- `/efficiency` [tela] → src/pages/EfficiencyDashboard.tsx (protegida)
- `/energy` [tela] → src/pages/EnergyDashboard.tsx (protegida)
- `/executive` [tela] → src/pages/ExecutiveDashboard.tsx (protegida)
- `/gamification` [tela] → src/pages/GamificationPage.tsx (protegida)
- `/install` [tela] → src/pages/InstallAppPage.tsx
- `/integrations/bitrix24` [tela] → src/pages/Bitrix24ConfigPage.tsx (protegida)
- `/inventory` [tela] → src/pages/InventoryPage.tsx (protegida)
- `/kanban` [tela] → src/pages/KanbanBoard.tsx (protegida)
- `/kiosk` [tela] → src/pages/KioskPage.tsx (protegida)
- `/knowledge` [tela] → src/pages/TechnicalKnowledgeBase.tsx (protegida)
- `/kpis` [tela] → src/pages/KPIDashboard.tsx (protegida)
- `/logistics` [tela] → src/pages/LogisticsPage.tsx (protegida)
- `/machines` [tela] → src/pages/MachinesPage.tsx (protegida)
- `/machines/compare` [tela] → src/pages/MachineComparisonPage.tsx (protegida)
- `/master-api` [tela] → src/pages/MasterAPIPage.tsx (protegida)
- `/mfa-enrollment` [tela] → src/pages/MfaEnrollmentPage.tsx (protegida)
- `/ml-predictions` [tela] → src/pages/MLPredictionsDashboard.tsx (protegida)
- `/new-job` [tela] → src/pages/NewJobPage.tsx (protegida)
- `/notifications` [tela] → src/pages/NotificationsPage.tsx (protegida)
- `/oee` [tela] → src/pages/OEEDashboard.tsx (protegida)
- `/operator` [tela] → src/pages/OperatorView.tsx (protegida)
- `/operator-history` [tela] → src/pages/OperatorHistoryPage.tsx (protegida)
- `/operator-productivity` [tela] → src/pages/OperatorProductivityPage.tsx (protegida)
- `/operators` [tela] → src/pages/OperatorsPage.tsx (protegida)
- `/operators/productivity` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/packaging` [tela] → src/pages/PackagingDashboard.tsx (protegida)
- `/packaging/kiosk` [tela] → src/pages/PackagingKioskPage.tsx (protegida)
- `/pending` [tela] → src/pages/PendingQueue.tsx (protegida)
- `/report-builder` [tela] → src/pages/ReportBuilderPage.tsx (protegida)
- `/reset-password` [tela] → src/pages/ResetPasswordPage.tsx
- `/scanner` [tela] → src/pages/QRScannerPage.tsx (protegida)
- `/security` [tela] → src/pages/SecurityDashboard.tsx (protegida)
- `/settings` [tela] → src/pages/SettingsPage.tsx (protegida)
- `/shift-handover` [tela] → src/pages/ShiftHandoverPage.tsx (protegida)
- `/simulation` [tela] → src/pages/SimulationDashboard.tsx (protegida)
- `/spc` [tela] → src/pages/SPCDashboard.tsx (protegida)
- `/status` [tela] → src/pages/SystemStatusPage.tsx (protegida)
- `/tpm` [tela] → src/pages/TPMDashboard.tsx (protegida)
- `/traceability` [tela] → src/pages/TraceabilityPage.tsx (protegida)
- `/track` [tela] → src/pages/PublicTrackingPage.tsx

## Rotas HTTP de backend
- (nenhum)

## Vistas por id (menu/ViewRouter → arquivo)
- (nenhum)

## Edge functions
- `approve-password-reset` — tabelas: password_reset_requests, profiles; chamada por 1 arquivo(s) do front
- `auto-promote-jobs` — tabelas: jobs, techniques, user_roles; chamada por 1 arquivo(s) do front, por SQL/cron
- `backup-scheduler` — tabelas: backup_logs, backups; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `bitrix24-sync` (verify_jwt=false) — tabelas: bitrix24_field_mappings, bitrix24_oauth_states, bitrix24_oauth_tokens, bitrix24_sync_history, jobs, user_roles; chamada por 5 arquivo(s) do front
- `calculate-inventory-intelligence` — tabelas: inventory_items, inventory_movements, user_roles; chamada por 1 arquivo(s) do front
- `calculate-rankings` — tabelas: jobs, operator_achievements, operator_machines, operator_rankings, user_roles; chamada por 1 arquivo(s) do front
- `check-login-lockout` — tabelas: blocked_ips, geo_blocking_logs, geo_blocking_rules, geo_blocking_settings, ip_allowlist, login_lockouts, security_events; chamada por 1 arquivo(s) do front
- `cleanup-security-logs` — tabelas: blocked_ips, login_audit, rate_limit_logs, security_events; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `create-operator` — tabelas: profiles; chamada por 1 arquivo(s) do front
- `cron-alert-email` — tabelas: cron_health_history, push_notifications, user_notification_settings, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `cron-cleanup` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `csp-report` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front
- `daily-maintenance-summary` — tabelas: daily_summaries, machine_predictions, maintenance_schedules; chamada por 1 arquivo(s) do front
- `erp-api` — tabelas: archived_jobs, erp_api_keys, jobs, machines, production_lots, profiles, spc_alerts, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `excel-export` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `external-db-bridge` — tabelas: query_telemetry; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `health-check` — tabelas: profiles, tpm_notification_queue; chamada por 0 arquivo(s) do front
- `health-monitor` — tabelas: edge_health_history, security_events; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `image-optimizer` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `metrics-collector` — tabelas: jobs, machines, profiles, system_metrics; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `ml-predictions` — tabelas: jobs, machine_predictions, machines, maintenance_records, maintenance_schedules; chamada por 2 arquivo(s) do front
- `new-device-alert` — tabelas: new_device_alerts, user_devices; chamada por 1 arquivo(s) do front
- `pdf-generator` — tabelas: -; chamada por 1 arquivo(s) do front
- `security-alert` — tabelas: security_events; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `send-email-report` — tabelas: daily_summaries, jobs; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `send-loss-risk-alert` — tabelas: maintenance_records, tpm_executions, user_notification_settings; chamada por 0 arquivo(s) do front, por SQL/cron
- `send-push-notification` — tabelas: push_notifications, push_subscriptions, user_roles; chamada por 2 arquivo(s) do front
- `send-tpm-email` — tabelas: machines, user_notification_settings; chamada por 0 arquivo(s) do front, por SQL/cron
- `technical-assistant` — tabelas: -; chamada por 2 arquivo(s) do front
- `tpm-notifications` — tabelas: maintenance_records, maintenance_schedules, tpm_notification_logs, tpm_notification_queue; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `update-operator` — tabelas: profiles; chamada por 1 arquivo(s) do front
- `validate-login-ip` — tabelas: ip_allowlist, login_audit; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `webhook-handler` — tabelas: bitrix24_sync_history, webhook_logs; chamada por 1 arquivo(s) do front

## Cron jobs (pg_cron / vercel)
- `archive-finished-jobs-daily` 7 4 * * * (20261128130000_f038_arquivar_os_concluida.sql)
- `auto-promote-jobs-fallback` */5 * * * * → edge auto-promote-jobs (20260512110942_cb61b4fe-9a86-40b9-9d12-24764f730f0e.sql)
- `auto-reassign-packaging-30min` */5 * * * * (20261108000001_business_rules_ddl.sql)
- `purge-old-logs-daily` 15 3 * * * (20261002130000_csp_reports_retention.sql)
- `rollup-cron-p95-daily` 20 * * * * (20260726161334_0dc2a73a-2f32-4855-acb2-6ce7fc124ee7.sql)

## Integrações externas
- SDKs: Resend, Sentry, Supabase, i18next, react-query, zod
- hosts mais citados: api.resend.com, ai.gateway.lovable.dev, fastgravacoes.com.br, api.fastgravacoes.com, api.ipify.org, api.pwnedpasswords.com, api.supabase.com, exemplo.com, fast-gravacoes-v2.vercel.app, ipapi.co, ipwho.is, xxroejpvloldkmqdydar.lovableproject.com
- webhooks recebidos: bitrix24-sync, csp-report
- env de integração (só nomes): BACKUP_API_KEY, BITRIX24_ACCESS_TOKEN, BITRIX24_CLIENT_ID, BITRIX24_CLIENT_SECRET, BITRIX24_REFRESH_TOKEN, BITRIX24_WEBHOOK_SECRET, BITRIX24_WEBHOOK_TOKEN, BITRIX24_WEBHOOK_URL, CRON_API_KEY, CRON_SECRET, LOVABLE_API_KEY, RESEND_API_KEY, SECRET, SENTRY_DSN, VITE_ALERT_WEBHOOK_URL, VITE_GOOGLE_ANALYTICS_ID, VITE_GOOGLE_MAPS_API_KEY, VITE_SENTRY_DSN, WEBHOOK_API_KEY

## Permissões / papéis
- papéis no código: coordinator (8), operator (7), user (7), admin (6), assistant (4), manager (4), system (2)
- enums de papel: app_role: coordinator|operator|manager|admin
- guards: src/components/auth/ProtectedRoute.tsx, src/contexts/DirtyFormContext.tsx · rotas protegidas: 51 · públicas: /*, /auth, /install, /reset-password, /track
- feature flags: nenhuma

## Alertas (baseline.json → alertas)
- rotas_sem_arquivo: 0
- rotas_nao_interpretadas: 0
- componentes_ambiguos: 0
- menu_sem_destino: 1 — ex.: Voltar -> #
- edges_orfas: 14 — ex.: backup-scheduler, cleanup-security-logs, cron-alert-email
- edges_chamadas_sem_pasta: 0
- tabelas_sem_rls: 0
- tabelas_usadas_sem_definicao: 1 — ex.: backups
- tabelas_so_no_types: 0
- tabelas_com_drift_migration_vs_types: 9 — ex.: archived_jobs, business_config, jobs
- rpcs_sem_definicao: 0
- componentes_orfaos: 30 — ex.: src/components/accessibility/AccessibleIconButton.tsx, src/components/accessibility/FocusTrap.tsx, src/components/alerts/AlertCard.tsx
- componentes_com_nome_duplicado: 6 — ex.: AdjustmentParameters, DashboardSkeleton, JobQuickActions
- scripts_orfaos: 0
- env_usadas_nao_declaradas: 7 — ex.: DEV, NODE_ENV, PROD
- ciclos_de_import: 9
- possiveis_segredos_no_codigo: 0

## Grafo de código (graphify)
- 8549 nós · 32464 arestas · 403 comunidades · grafo do commit `3aaa14fe`
- comunidades maiores: client.ts (216), CardContent (216), Label (175), ResponsiveContainer (163), Card (162), Badge (142), Button (137), react (127), package.json (119), button.tsx (112), generate.py (110), notifications/index.ts (107)
- símbolos mais chamados: cn() (src/lib/utils.ts), Card (src/components/ui/card.tsx), CardContent (src/components/ui/card.tsx), Button (src/components/ui/button.tsx), Badge (src/components/ui/badge.tsx), CardHeader (src/components/ui/card.tsx), CardTitle (src/components/ui/card.tsx), CardDescription (src/components/ui/card.tsx), Input (src/components/ui/input.tsx), Label (src/components/ui/label.tsx), Skeleton() (src/components/ui/skeleton.tsx), SelectContent (src/components/ui/select.tsx)
- consulta local: `graphify query "<pergunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<X>"`

## Hotspots (arquivos mais alterados, 90 dias)
- .github/workflows/ci.yml (22)
- package-lock.json (21)
- package.json (21)
- deno.lock (17)
- docs/qa/05-PROGRESSO.md (11)
- .github/workflows/db-admin.yml (10)
- AGENTS.md (10)
- .github/workflows/deploy.yml (9)
- scripts/audit-gate.mjs (9)
- .github/workflows/contexto.yml (7)
- PENDENCIAS.md (7)
- index.html (7)
- src/pages/PublicTrackingPage.tsx (7)
- supabase/functions/check-login-lockout/index.ts (7)
- tests/e2e/offline.spec.ts (7)

## Workflows
- `automation-local.yml` — Automação local (pull_request, workflow_dispatch)
- `branch-hygiene-audit.yml` — Branch Hygiene Audit (schedule, workflow_dispatch; cron 56 7 * * 1)
- `ci.yml` — CI — Quality Gates (pull_request, push, workflow_dispatch)
- `contexto.yml` — Contexto para agentes de IA (30 min) (push, schedule, workflow_dispatch; cron 3,33 * * * *)
- `db-admin.yml` — DB Admin (workflow_dispatch)
- `dependency-review.yml` — Dependency Review (pull_request)
- `deploy.yml` — Deploy (push, workflow_dispatch)
- `graphify.yml` — Architecture graph (pull_request, workflow_dispatch)
- `inventario-estado-semanal.yml` — Inventário do estado real (semanal) (schedule, workflow_dispatch; cron 27 10 * * 1)
- `migration-repair.yml` — Migration repair (workflow_dispatch)
- `settings-guard.yml` — Settings Guard (schedule, workflow_dispatch; cron 15 7 * * *)
- `visual-baselines.yml` — Visual Baselines Generator (workflow_dispatch)

## Scripts npm
- `maintenance:doctor`: `sh scripts/maintenance/run.sh doctor --root .`
- `maintenance:check`: `sh scripts/maintenance/run.sh check --root . --ref origin/main`
- `maintenance:heal`: `sh scripts/maintenance/run.sh heal --root . --ref origin/main`
- `test:maintenance`: `node --test scripts/maintenance/maintenance.unit.mjs`
- `prepare`: `husky`
- `dev`: `vite`
- `build`: `vite build`
- `build:dev`: `vite build --mode development`
- `lint`: `eslint .`
- `preview`: `vite preview`
- `test`: `vitest run`
- `test:watch`: `vitest`
- `test:coverage`: `vitest run --coverage`
- `quality:any`: `node scripts/check-any-baseline.mjs`
- `quality:any:update`: `node scripts/check-any-baseline.mjs --update`
- `quality:gate`: `npm run lint && npm run quality:any && npm run test && npm run test:scripts`
- `test:scripts`: `node --test scripts/*.test.mjs scripts/ci/*.test.mjs`
- `audit:pdf`: `echo 'AUDITORIA_ENTERPRISE_2026.md not found' && exit 0`
- `test:e2e`: `playwright test`
- `bundle:report`: `node scripts/bundle-report.mjs`
- `bundle:diff`: `node scripts/bundle-diff.mjs`
- `graph:install`: `node scripts/graphify.mjs install`
- `graph:doctor`: `node scripts/graphify.mjs doctor`
- `graph:detect`: `node scripts/graphify.mjs detect`
- `graph:build`: `node scripts/graphify.mjs build`
- `graph:check`: `node scripts/graphify.mjs check`
- `graph:query`: `node scripts/graphify.mjs query`
- `graph:path`: `node scripts/graphify.mjs path`
- `graph:explain`: `node scripts/graphify.mjs explain`
- `graph:affected`: `node scripts/graphify.mjs affected`
- `graph:html`: `node scripts/graphify.mjs html`
- `graph:audit`: `node scripts/graphify.mjs audit`
- `graph:ratchet`: `node scripts/graphify.mjs ratchet`
- `graph:diff`: `node scripts/graphify.mjs diff`
- `graph:benchmark`: `node scripts/graphify.mjs benchmark`
- `graph:test`: `node scripts/graphify.mjs test`
- `ci`: `npm run quality:any && npm run build && npm run test:e2e`
- `inventario:rotas`: `node scripts/inventario/gerar-rotas.mjs`
- `inventario:edges`: `node scripts/inventario/gerar-repo.mjs`
- `inventario:banco`: `node scripts/inventario/gerar-banco.mjs`
- `inventario:test`: `node --test 'scripts/inventario/*.unit.mjs'`
- `settings:guard`: `node scripts/ci/github-settings-guard.mjs`
- `ci:docs`: `node scripts/ci/render-workflow-docs.mjs`
- `ci:docs:check`: `node scripts/ci/render-workflow-docs.mjs --check`
- `ci:test`: `node --test 'scripts/ci/*.unit.mjs'`
- `autofix`: `node scripts/autofix/run.mjs`
- `autofix:apply`: `node scripts/autofix/run.mjs --apply`
- `autofix:test`: `node --test scripts/autofix.test.mjs`
- `audit`: `node scripts/audit/run.mjs`
- `automation:doctor`: `node scripts/automation.mjs doctor`
- `automation:test`: `node scripts/automation.mjs test`
- `automation:check`: `node scripts/automation.mjs check --ref HEAD`
- `automation:heal`: `node scripts/automation.mjs heal --ref origin/main`
- `automation:nightly`: `node scripts/automation.mjs nightly --ref origin/main`
- `automation:graph`: `node scripts/automation.mjs graph`
- `automation:status`: `node scripts/automation.mjs graph status`
- `automation:install-hooks`: `node scripts/automation.mjs install-hooks`
- `automation:uninstall-hooks`: `node scripts/automation.mjs uninstall-hooks`

## Documentos (raiz e docs/)
- `.github/PULL_REQUEST_TEMPLATE.md` (18 linhas)
- `AGENTS.md` — AGENTS.md — Fast Gravações V2 (142 linhas)
- `ANALISE_TECNICA_SISTEMA.md` — Relatório de Análise Técnica — FAST GRAVAÇÕES ES v2 (837 linhas)
- `AUDITORIA_CORRECOES_2026-05-29.md` — Auditoria Técnica — Correções Aplicadas (159 linhas)
- `AUDITORIA_EXAUSTIVA_2026-07-18.md` — Auditoria Exaustiva & Remediação — FAST GRAVAÇÕES ES v2 (178 linhas)
- `CLAUDE.md` (2 linhas)
- `CODE_REVIEW_FINDINGS.md` — Code Review — fast-grava-es-v2 (53 linhas)
- `ESTADO_ATUAL.md` — ESTADO ATUAL — FAST GRAVAÇÕES ES v2 (455 linhas)
- `PENDENCIAS.md` — PENDENCIAS — itens que dependem de ação manual do Joaquim (64 linhas)
- `README.md` — FAST Gravações - Sistema de Gestão Industrial (53 linhas)
- `RELATORIO_CI.md` — RELATORIO_CI — Inventário e correção dos workflows (2026-10-28) (87 linhas)
- `docs/ARCHITECTURE.md` — Guia de Arquitetura e Documentação Técnica (249 linhas)
- `docs/AUTOMACAO_LOCAL.md` — Automação local — Fast_Gravacoes_V2 (107 linhas)
- `docs/QA_AUDIT_2026-06-14.md` — QA Audit — FAST GRAVAÇÕES ES v2 (142 linhas)
- `docs/QA_SIMULACAO_CENARIOS_2026-06-14.md` — Simulação de Cenários & Hardening — FAST GRAVAÇÕES ES v2 (134 linhas)
- `docs/plano-190-etapas-261122.md` — Plano de melhorias e correções em 190 etapas — Fast Gravações V2 (1314 linhas)
- `docs/plano-50-etapas-260924.md` — Plano de correções e melhorias em 50 etapas — FAST GRAVAÇÕES ES v2 (763 linhas)
- `docs/plano-50-etapas-consolidacao.md` — Plano de consolidação em 50 etapas — FAST GRAVAÇÕES ES v2 (819 linhas)
- `docs/plano-graphify-50-etapas.md` — Plano de implementação Graphify — 50 etapas (647 linhas)
- `docs/plano-mestre-10-10.md` — Plano mestre de auditoria e evolução — FAST GRAVAÇÕES V2 rumo ao 10/10 (831 linhas)
- `docs/plano-ux-navegacao-200-etapas-261122.md` — Plano de UX de Navegação e Transição entre Telas — 200 Etapas (1760 linhas)
- `docs/prod-readiness.md` — Fast Gravacoes V2 - Prontidao para Producao (189 linhas)
- subpastas de docs/: docs/estado (20), docs/pendencias (17), docs/agentes (7), docs/qa (6), docs/adr (5), docs/contexto (3), docs/operacoes (3), docs/graphify (2), docs/ci (1), docs/post-mortems (1)


## Últimos commits
- 2026-11-25 `3aaa14f` fix: tira perdas de producao e expedicao da cascata de exclusao da OS (etapa 039) (#304)
- 2026-11-25 `6e755f1` feat: arquivar OS concluida em vez de apagar (etapa 038) (#305)
- 2026-11-25 `e5435a5` feat: bloqueia no banco a exclusao de OS que ja teve producao (etapa 036) (#303)
- 2026-11-25 `0351511` infra: publica push_notifications no realtime (#308)
- 2026-11-25 `760ed63` fix: aviso de erro da fila cobre tecnicas e maquinas e teste prova a volta da fila (etapa 260) (#309)
- 2026-11-25 `970aef7` feat: avisa o que a exclusao em massa apaga e quais OS estao impedidas (etapa 037) (#306)
- 2026-11-25 `d139424` feat: centraliza quais status ocupam a maquina no agendamento (etapa 052) (#302)
- 2026-11-25 `d0e7a1d` feat: mostra erro com tentar novamente na fila de pendentes (etapa 260) (#301)
- 2026-11-25 `cd834ba` infra: remove push em main do automation-local (recupera PR #229) (#298)
- 2026-11-25 `d0cab10` feat: cancelar OS com motivo obrigatorio e tipos do banco regenerados (etapas 046/047) (#297)
- 2026-11-25 `5cc8d77` fix: fecha /design-system para visitante (SEG-01, etapa 011) (#296)
- 2026-11-25 `d592aac` fix: fecha a escalada de privilegio no external-db-bridge (etapa 056 / SEG-04) (#295)
- 2026-11-24 `fc44f91` fix: dar nome acessivel aos setores do grafico de status em /kpis (#299)
- 2026-11-24 `fa8cd71` chore: registra etapas 001-003 do plano de QA com a evidência de cada uma (#293)
- 2026-11-24 `1c4e616` fix: passa redirectTo explicito no pedido de recuperacao de senha (etapa 006) (#294)

## Arquivos deste diretório
- `docs/contexto/codigo/rotas.json`
- `docs/contexto/codigo/modulos.json`
- `docs/contexto/codigo/componentes.json`
- `docs/contexto/codigo/hooks.json`
- `docs/contexto/codigo/edge-functions.json`
- `docs/contexto/codigo/banco.json`
- `docs/contexto/codigo/ferramentas.json`
- `docs/contexto/codigo/scripts.json`
- `docs/contexto/codigo/testes.json`
- `docs/contexto/codigo/logica.json`
- `docs/contexto/codigo/grafo.json`
- `docs/contexto/codigo/grafo-arestas.json`
- `docs/contexto/codigo/convencoes.json`
- `docs/contexto/codigo/grafo-graphify.json`
- `docs/contexto/codigo/baseline.json`
- `docs/contexto/codigo/manifest.json` (commit, data, hashes, erros — único arquivo com data/hora)
