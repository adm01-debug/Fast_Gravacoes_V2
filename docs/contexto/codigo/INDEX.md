# Contexto do projeto para agentes de IA

GERADO AUTOMATICAMENTE por scripts/ai-context/gerar.mjs — não editar à mão; será sobrescrito.
Publicado em `docs/contexto/codigo/` na branch `contexto` (gerada, nunca abra PR dela) a cada push em `main` e a cada 10 minutos pelo workflow `contexto.yml`; índice único das três fontes em `docs/contexto/00-INDEX.md`. Gere local com `node scripts/ai-context/gerar.mjs`. Commit-base: `dd1b4671aa8dbc85beee14823b6ab21900d00d90` (2026-11-12T10:21:56-03:00).

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
- linguagens: TypeScript (1051), SQL (253), Markdown (70), JavaScript (40), JSON (23), Python (13), YAML (12), CSS (2)
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
| arquivos_total | 1498 |
| arquivos_codigo | 1101 |
| linhas_codigo | 179013 |
| rotas | 58 |
| rotas_http_backend | 0 |
| vistas_por_id | 0 |
| itens_menu | 69 |
| modulos | 74 |
| componentes | 621 |
| hooks | 196 |
| edge_functions | 34 |
| tabelas | 133 |
| migrations | 245 |
| cron_jobs | 4 |
| testes | 114 |
| workflows | 10 |
| scripts | 28 |
| docs_md | 70 |

## Onde ficam as coisas
- telas: src/pages (56)
- componentes: src/components (402), src/features (144), src/pages (56)
- hooks: src/features (113), src/hooks (53), src/components (15)
- servicos_logica: src/lib (41), scripts/graphify (5), src/integrations (3)
- testes: co-localizado (*.test) (82), tests/ (18), outro (14)
- edge_functions: supabase/functions
- migrations: supabase/migrations
- scripts: scripts/ci (6), scripts/graphify (5), scripts/inventario (5)
- docs: (raiz) (10), docs (7), .github (1)
- nomenclatura: {"componentes":"PascalCase (90%)","hooks":"use + PascalCase","servicos":"camelCase (98%)","edge_functions":"kebab-case (100%)","tabelas":"snake_case (95%)"}
- instruções para agentes no repo: AGENTS.md, CLAUDE.md

## Módulos (menu → domínio)
| módulo | itens de menu | telas/rotas | arquivos | hooks locais | edges | tabelas |
|---|---|---|---|---|---|---|
| components/abc | 0 | 0 | 6 | 8 | 0 | 7 |
| components/accessibility | 0 | 0 | 5 | 4 | 0 | 0 |
| components/alerts | 0 | 0 | 6 | 10 | 1 | 3 |
| components/auth | 0 | 0 | 6 | 7 | 0 | 1 |
| components/calendar | 0 | 0 | 17 | 20 | 1 | 5 |
| components/dashboard | 0 | 0 | 32 | 79 | 5 | 63 |
| components/design-system | 0 | 0 | 71 | 26 | 2 | 9 |
| components/jobs | 0 | 0 | 8 | 41 | 1 | 30 |
| components/kanban | 0 | 0 | 6 | 21 | 2 | 11 |
| components/knowledge | 0 | 0 | 15 | 11 | 1 | 11 |
| components/layout | 0 | 0 | 12 | 43 | 1 | 15 |
| components/machines | 0 | 0 | 10 | 22 | 3 | 19 |
| components/navigation | 0 | 0 | 15 | 37 | 2 | 12 |
| components/offline | 0 | 0 | 5 | 3 | 0 | 5 |
| components/operator | 0 | 0 | 8 | 4 | 1 | 3 |
| components/operators | 0 | 0 | 27 | 22 | 3 | 13 |
| components/planning | 0 | 0 | 7 | 22 | 1 | 8 |
| components/qrcode | 0 | 0 | 10 | 6 | 0 | 6 |
| components/settings | 0 | 0 | 12 | 19 | 3 | 12 |
| components/shift | 0 | 0 | 10 | 19 | 1 | 12 |
| components/technical-assistant | 0 | 0 | 8 | 4 | 0 | 3 |
| components/traceability | 0 | 0 | 13 | 17 | 1 | 7 |
| components/ui | 0 | 0 | 61 | 12 | 0 | 1 |
| contexts | 0 | 0 | 14 | 23 | 0 | 7 |
| features/admin | 0 | 0 | 52 | 62 | 2 | 36 |
| features/analytics | 0 | 0 | 74 | 53 | 3 | 39 |
| features/auth | 0 | 0 | 11 | 8 | 2 | 4 |
| features/inventory | 0 | 0 | 9 | 14 | 1 | 9 |
| features/jobs | 0 | 0 | 26 | 31 | 3 | 12 |
| features/maintenance | 0 | 0 | 41 | 18 | 2 | 29 |
| features/notifications | 0 | 0 | 26 | 43 | 4 | 19 |
| features/packaging | 0 | 0 | 35 | 23 | 1 | 14 |
| features/production | 0 | 0 | 27 | 30 | 1 | 21 |
| hooks | 0 | 0 | 44 | 62 | 3 | 36 |
| hooks/abc | 0 | 0 | 5 | 6 | 0 | 7 |
| lib | 0 | 0 | 37 | 15 | 2 | 15 |
| pages | 66 | 56 | 56 | 204 | 13 | 109 |

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
- `/design-system` [tela] → src/pages/DesignSystemPage.tsx
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
- `check-login-lockout` — tabelas: login_lockouts, security_events; chamada por 1 arquivo(s) do front
- `cleanup-security-logs` — tabelas: blocked_ips, login_audit, rate_limit_logs, security_events; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `create-operator` — tabelas: profiles; chamada por 1 arquivo(s) do front
- `cron-alert-email` — tabelas: cron_health_history, push_notifications, user_notification_settings, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `cron-cleanup` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `csp-report` (verify_jwt=false) — tabelas: -; chamada por 0 arquivo(s) do front
- `daily-maintenance-summary` — tabelas: daily_summaries, machine_predictions, maintenance_schedules; chamada por 1 arquivo(s) do front
- `erp-api` — tabelas: erp_api_keys, jobs, machines, production_lots, profiles, spc_alerts, user_roles; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `excel-export` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `external-db-bridge` — tabelas: query_telemetry; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `health-check` — tabelas: profiles, tpm_notification_queue; chamada por 0 arquivo(s) do front
- `health-monitor` — tabelas: edge_health_history, security_events; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `image-optimizer` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `metrics-collector` — tabelas: jobs, machines, profiles, system_metrics; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `ml-predictions` — tabelas: jobs, machine_predictions, machines, maintenance_records, maintenance_schedules; chamada por 2 arquivo(s) do front
- `new-device-alert` — tabelas: new_device_alerts, user_devices; chamada por 1 arquivo(s) do front
- `pdf-generator` — tabelas: -; chamada por 1 arquivo(s) do front
- `rate-limit-check` — tabelas: blocked_ips, rate_limit_logs, rate_limit_settings, security_events; chamada por 0 arquivo(s) do front — **ÓRFÃ**
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
- `auto-promote-jobs-fallback` */5 * * * * → edge auto-promote-jobs (20260512110942_cb61b4fe-9a86-40b9-9d12-24764f730f0e.sql)
- `auto-reassign-packaging-30min` */5 * * * * (20261108000001_business_rules_ddl.sql)
- `purge-old-logs-daily` 15 3 * * * (20261002130000_csp_reports_retention.sql)
- `rollup-cron-p95-daily` 20 * * * * (20260726161334_0dc2a73a-2f32-4855-acb2-6ce7fc124ee7.sql)

## Integrações externas
- SDKs: Resend, Sentry, Supabase, i18next, react-query, zod
- hosts mais citados: api.resend.com, ai.gateway.lovable.dev, fastgravacoes.com.br, api.fastgravacoes.com, api.ipify.org, api.pwnedpasswords.com, api.supabase.com, exemplo.com, xxroejpvloldkmqdydar.lovableproject.com
- webhooks recebidos: bitrix24-sync, csp-report
- env de integração (só nomes): BACKUP_API_KEY, BITRIX24_ACCESS_TOKEN, BITRIX24_CLIENT_ID, BITRIX24_CLIENT_SECRET, BITRIX24_REFRESH_TOKEN, BITRIX24_WEBHOOK_SECRET, BITRIX24_WEBHOOK_TOKEN, BITRIX24_WEBHOOK_URL, CRON_API_KEY, CRON_SECRET, LOVABLE_API_KEY, RESEND_API_KEY, SECRET, SENTRY_DSN, VITE_ALERT_WEBHOOK_URL, VITE_GOOGLE_ANALYTICS_ID, VITE_GOOGLE_MAPS_API_KEY, VITE_SENTRY_DSN, WEBHOOK_API_KEY

## Permissões / papéis
- papéis no código: coordinator (8), operator (7), user (7), admin (4), assistant (4), manager (4), system (2)
- enums de papel: app_role: coordinator|operator|manager|admin
- guards: src/components/auth/ProtectedRoute.tsx, src/contexts/DirtyFormContext.tsx · rotas protegidas: 50 · públicas: /*, /auth, /design-system, /install, /reset-password, /track
- feature flags: nenhuma

## Alertas (baseline.json → alertas)
- rotas_sem_arquivo: 0
- rotas_nao_interpretadas: 0
- componentes_ambiguos: 0
- menu_sem_destino: 1 — ex.: Voltar -> #
- edges_orfas: 15 — ex.: backup-scheduler, cleanup-security-logs, cron-alert-email
- edges_chamadas_sem_pasta: 0
- tabelas_sem_rls: 0
- tabelas_usadas_sem_definicao: 1 — ex.: backups
- tabelas_so_no_types: 8 — ex.: email_verification_tokens, gamification_settings, packaging_equipment
- tabelas_com_drift_migration_vs_types: 9 — ex.: business_config, jobs, operator_rankings
- rpcs_sem_definicao: 0
- componentes_orfaos: 30 — ex.: src/components/accessibility/AccessibleIconButton.tsx, src/components/accessibility/FocusTrap.tsx, src/components/alerts/AlertCard.tsx
- componentes_com_nome_duplicado: 6 — ex.: AdjustmentParameters, DashboardSkeleton, JobQuickActions
- scripts_orfaos: 0
- env_usadas_nao_declaradas: 7 — ex.: DEV, NODE_ENV, PROD
- ciclos_de_import: 9
- possiveis_segredos_no_codigo: 0

## Grafo de código (graphify)
- 7146 nós · 21294 arestas · 670 comunidades · grafo do commit `dd1b4671`
- comunidades maiores: card.tsx (249), Button (199), snapshot.py (111), cn (102), generate.py (101), gerar.mjs (96), .write (96), useAuth (95), skeleton.tsx (87), select.tsx (86), KanbanBoard.tsx (85), OperatorProductivityPage.tsx (81)
- símbolos mais chamados: cn() (src/lib/utils.ts), useAuth() (src/features/auth/hooks/useAuth.ts), .write() (scripts/regras_negocio/test_generate.py), showErrorToast() (src/lib/errorHandling.ts), .schema() (scripts/regras_negocio/test_generate.py), useSchedulingData() (src/features/jobs/hooks/useSchedulingData.ts), .collect() (scripts/supabase_snapshot/test_snapshot.py), parseDateOnly() (src/lib/dateUtils.ts), q() (scripts/supabase_snapshot/snapshot.py), createAppError() (src/lib/errorHandling.ts), useRealtimeChannel() (src/lib/realtimeChannel.ts), .cli() (scripts/regras_negocio/test_generate.py)
- consulta local: `graphify query "<pergunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<X>"`

## Hotspots (arquivos mais alterados, 90 dias)
- .github/workflows/ci.yml (18)
- AGENTS.md (10)
- package-lock.json (9)
- deno.lock (8)
- package.json (8)
- .github/workflows/db-admin.yml (7)
- PENDENCIAS.md (7)
- .github/workflows/deploy.yml (6)
- CLAUDE.md (6)
- index.html (6)
- scripts/audit-gate.mjs (6)
- scripts/rls-regression.mjs (5)
- scripts/supabase_snapshot/snapshot.py (5)
- scripts/supabase_snapshot/test_snapshot.py (5)
- src/components/layout/AppSidebar.tsx (5)

## Workflows
- `branch-hygiene-audit.yml` — Branch Hygiene Audit (schedule, workflow_dispatch; cron 56 7 * * 1)
- `ci.yml` — CI — Quality Gates (pull_request, push, workflow_dispatch)
- `contexto.yml` — Contexto para agentes de IA (10 min) (push, schedule, workflow_dispatch; cron 3-59/10 * * * *)
- `db-admin.yml` — DB Admin (workflow_dispatch)
- `deploy.yml` — Deploy (push, workflow_dispatch)
- `graphify.yml` — Architecture graph (pull_request, workflow_dispatch)
- `inventario-estado-semanal.yml` — Inventário do estado real (semanal) (schedule, workflow_dispatch; cron 27 10 * * 1)
- `migration-repair.yml` — Migration repair (workflow_dispatch)
- `settings-guard.yml` — Settings Guard (schedule, workflow_dispatch; cron 15 7 * * *)
- `visual-baselines.yml` — Visual Baselines Generator (workflow_dispatch)

## Scripts npm
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

## Documentos (raiz e docs/)
- `.github/PULL_REQUEST_TEMPLATE.md` (18 linhas)
- `AGENTS.md` — AGENTS.md — Fast Gravações V2 (139 linhas)
- `ANALISE_TECNICA_SISTEMA.md` — Relatório de Análise Técnica — FAST GRAVAÇÕES ES v2 (837 linhas)
- `AUDITORIA_CORRECOES_2026-05-29.md` — Auditoria Técnica — Correções Aplicadas (159 linhas)
- `AUDITORIA_EXAUSTIVA_2026-07-18.md` — Auditoria Exaustiva & Remediação — FAST GRAVAÇÕES ES v2 (178 linhas)
- `CLAUDE.md` (2 linhas)
- `CODE_REVIEW_FINDINGS.md` — Code Review — fast-grava-es-v2 (53 linhas)
- `ESTADO_ATUAL.md` — ESTADO ATUAL — FAST GRAVAÇÕES ES v2 (455 linhas)
- `PENDENCIAS.md` — PENDENCIAS — itens que dependem de ação manual do Joaquim (64 linhas)
- `README.md` — FAST Gravações - Sistema de Gestão Industrial (53 linhas)
- `RELATORIO_CI.md` — RELATORIO_CI — Inventário e correção dos workflows (2026-10-28) (87 linhas)
- `docs/ARCHITECTURE.md` — Guia de Arquitetura e Documentação Técnica (244 linhas)
- `docs/QA_AUDIT_2026-06-14.md` — QA Audit — FAST GRAVAÇÕES ES v2 (142 linhas)
- `docs/QA_SIMULACAO_CENARIOS_2026-06-14.md` — Simulação de Cenários & Hardening — FAST GRAVAÇÕES ES v2 (134 linhas)
- `docs/plano-50-etapas-260924.md` — Plano de correções e melhorias em 50 etapas — FAST GRAVAÇÕES ES v2 (763 linhas)
- `docs/plano-50-etapas-consolidacao.md` — Plano de consolidação em 50 etapas — FAST GRAVAÇÕES ES v2 (819 linhas)
- `docs/plano-graphify-50-etapas.md` — Plano de implementação Graphify — 50 etapas (647 linhas)
- `docs/plano-mestre-10-10.md` — Plano mestre de auditoria e evolução — FAST GRAVAÇÕES V2 rumo ao 10/10 (831 linhas)
- subpastas de docs/: docs/estado (20), docs/agentes (7), docs/adr (5), docs/contexto (3), docs/operacoes (3), docs/graphify (2), docs/ci (1), docs/post-mortems (1)


## Últimos commits
- 2026-11-12 `dd1b467` style(manutencao): aplica correcoes locais verificadas (#169)
- 2026-11-12 `df3c54d` chore: porta automações de estado real do Zapp_Web_V2 + redige command do cron secret (#165)
- 2026-11-12 `047e75b` fix(ci): regras/ usa snapshot real de supabase/ e banco/ publica .gitattributes (#164)
- 2026-11-12 `3fae94c` fix(ci): pinar runner ubuntu-24.04 (ubuntu-latest virou 26.04 e quebra Playwright) (#170)
- 2026-11-11 `854fc23` fix(ci): autenticar ghcr.io para evitar rate-limit no deploy de 34 edge functions (#171)
- 2026-11-11 `2f1c7bf` fix(ci): bundle-diff.mjs mostra "undefined KB" com totals antigo (#168)
- 2026-11-11 `78b8006` fix(migrations): R3.3 — revogar EXECUTE de PUBLIC, não só de anon (#146)
- 2026-11-11 `a19a8bb` fix(ci): serializa o job E2E entre PRs (concurrency global) (#156)
- 2026-11-11 `c9c9f66` fix(snapshot): retry da API, erro 400 opcional, carry-over e redação mais fiel (#158)
- 2026-11-11 `f03fff8` fix(regras): fórmula de coluna gerada e snapshot degradado como erro (#160)
- 2026-11-11 `6907bc4` fix(ci): rls-regression.mjs reaplica login com retry e não dispara ao importar (#167)
- 2026-11-10 `86e59b4` fix(snapshot): teste de índice alinhado ao contrato documentado de 'não verificável' (#166)
- 2026-11-10 `a220f13` fix(ai-context): fecho de rota/módulo resolve barrel pelos nomes importados (#162)
- 2026-11-10 `346947d` fix(regras): parser SQL fiel a comentários, literais e DDL de migrations; publish.sh com HEAD destacado (#161)
- 2026-11-10 `dfdb331` fix(ai-context): proteção de rotas-objeto, package.json atípico e pastas env/build/out em src (#159)

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
