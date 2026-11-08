# Contexto do projeto para agentes de IA

GERADO AUTOMATICAMENTE por scripts/ai-context/gerar.mjs — não editar à mão; será sobrescrito.
Publicado em `docs/contexto/codigo/` na branch `contexto` (gerada, nunca abra PR dela) a cada push em `main` e a cada 10 minutos pelo workflow `contexto.yml`; índice único das três fontes em `docs/contexto/00-INDEX.md`. Gere local com `node scripts/ai-context/gerar.mjs`. Commit-base: `5db90ba232b63f7db45fb2691bcd18e612f46754` (2026-11-08T17:23:21-03:00).

## Como usar (leia antes de planejar ou executar qualquer tarefa)
1. **Tela/rota/menu** → `rotas.json` (url/vista/menu → arquivo → hooks → tabelas → edges; `rotas_http_backend` para APIs) e `modulos.json` (módulo inteiro + dependências entre módulos).
2. **Hook/serviço/lógica** → `hooks.json`, `logica.json` (quem usa, o que toca, se tem teste).
3. **Edge function / serverless** → `edge-functions.json` (verify_jwt, tabelas, env, quem chama, órfãs).
4. **Banco** → `banco.json` (colunas, RLS, policies, índices, FKs, triggers, cron jobs, buckets, drift migration×types, uso no código) — visão do código; para o banco vivo use o MCP.
5. **Antes de criar arquivo** → `convencoes.json` (onde ficam as coisas, nomenclatura, alias), `componentes.json` (nomes duplicados, órfãos), `grafo.json` (hubs, ciclos de import) e `grafo-graphify.json` (grafo por AST: comunidades, símbolos mais chamados, comunidade de cada arquivo).
6. **CI/scripts/deploy/env/integrações/permissões/flags** → `ferramentas.json` e `scripts.json`.
7. **Antes de abrir PR** → `testes.json` (o que tem e não tem teste, onde os testes ficam), `baseline.json` (alertas, TODOs, hotspots, últimos commits).
Os JSONs são grandes: filtre com `grep`/`jq` pelo caminho/arquivo/tabela da sua tarefa; não carregue tudo.

## Stack
- linguagens: TypeScript (1051), SQL (250), Markdown (63), JSON (19), JavaScript (15), Python (11), YAML (9), CSS (2)
- linguagem_principal: TypeScript
- framework: React
- backend_http: n/d
- bundler: Vite
- roteador: react-router
- banco: Supabase
- testes: vitest, playwright
- ui: tailwind, radix/shadcn
- estado: react-query, zustand
- gerenciador_pacotes: bun
- node: n/d
- python: n/d
- deploy: vercel
- monorepo: n/d
- pastas_fonte: src

## Números
| item | qtd |
|---|---|
| arquivos_total | 1453 |
| arquivos_codigo | 1074 |
| linhas_codigo | 170746 |
| rotas | 58 |
| rotas_http_backend | 12 |
| vistas_por_id | 0 |
| itens_menu | 83 |
| modulos | 74 |
| componentes | 621 |
| hooks | 197 |
| edge_functions | 34 |
| tabelas | 142 |
| migrations | 243 |
| cron_jobs | 3 |
| testes | 103 |
| workflows | 7 |
| scripts | 17 |
| docs_md | 63 |

## Onde ficam as coisas
- telas: src/pages (56)
- componentes: src/components (402), src/features (144), src/pages (56)
- hooks: src/features (113), src/hooks (53), src/components (15)
- servicos_logica: src/lib (41), scripts/graphify (5), src/integrations (3)
- testes: co-localizado (*.test) (75), tests/ (21), outro (7)
- edge_functions: supabase/functions
- migrations: supabase/migrations
- scripts: scripts/graphify (5), scripts/regras_negocio (3), scripts/ai-context (2)
- docs: (raiz) (10), docs (7), .github (1)
- nomenclatura: {"componentes":"PascalCase (90%)","hooks":"use + PascalCase","servicos":"camelCase (98%)","edge_functions":"kebab-case (100%)","tabelas":"snake_case (94%)"}
- instruções para agentes no repo: AGENTS.md, CLAUDE.md

## Módulos (menu → domínio)
| módulo | itens de menu | telas/rotas | arquivos | hooks locais | edges | tabelas |
|---|---|---|---|---|---|---|
| components/abc | 0 | 0 | 6 | 123 | 8 | 58 |
| components/accessibility | 0 | 0 | 5 | 4 | 0 | 0 |
| components/alerts | 0 | 0 | 6 | 142 | 9 | 72 |
| components/auth | 0 | 0 | 6 | 12 | 2 | 4 |
| components/calendar | 0 | 0 | 17 | 132 | 8 | 58 |
| components/dashboard | 0 | 0 | 32 | 155 | 10 | 89 |
| components/design-system | 0 | 0 | 71 | 137 | 8 | 58 |
| components/jobs | 0 | 0 | 8 | 131 | 8 | 70 |
| components/kanban | 0 | 0 | 6 | 142 | 9 | 72 |
| components/knowledge | 0 | 0 | 15 | 26 | 3 | 22 |
| components/layout | 0 | 0 | 12 | 200 | 11 | 106 |
| components/machines | 0 | 0 | 10 | 130 | 9 | 65 |
| components/navigation | 0 | 0 | 15 | 144 | 8 | 58 |
| components/offline | 0 | 0 | 5 | 3 | 0 | 5 |
| components/operator | 0 | 0 | 8 | 125 | 8 | 59 |
| components/operators | 0 | 0 | 27 | 128 | 10 | 58 |
| components/planning | 0 | 0 | 7 | 142 | 9 | 72 |
| components/qrcode | 0 | 0 | 10 | 13 | 2 | 8 |
| components/settings | 0 | 0 | 12 | 125 | 9 | 62 |
| components/shift | 0 | 0 | 10 | 131 | 8 | 63 |
| components/technical-assistant | 0 | 0 | 8 | 10 | 2 | 6 |
| components/traceability | 0 | 0 | 13 | 123 | 8 | 58 |
| components/ui | 0 | 0 | 61 | 12 | 0 | 1 |
| contexts | 0 | 0 | 14 | 27 | 2 | 9 |
| features/admin | 0 | 0 | 52 | 129 | 8 | 64 |
| features/analytics | 0 | 0 | 74 | 142 | 9 | 72 |
| features/auth | 0 | 0 | 11 | 8 | 2 | 4 |
| features/inventory | 0 | 0 | 9 | 19 | 3 | 13 |
| features/jobs | 0 | 0 | 26 | 124 | 8 | 58 |
| features/maintenance | 0 | 0 | 41 | 131 | 9 | 76 |
| features/notifications | 0 | 0 | 26 | 123 | 8 | 58 |
| features/packaging | 0 | 0 | 35 | 28 | 2 | 15 |
| features/production | 0 | 0 | 27 | 123 | 8 | 58 |
| hooks | 0 | 0 | 44 | 207 | 11 | 107 |
| hooks/abc | 0 | 0 | 5 | 123 | 8 | 58 |
| lib | 0 | 0 | 37 | 200 | 12 | 106 |
| pages | 50 | 56 | 56 | 220 | 14 | 115 |

## Rotas (url → arquivo)
- `/` [tela] → src/pages/Index.tsx (protegida)
- `/*` [tela] → src/pages/NotFound.tsx (protegida)
- `/abc` [redirect] → **ARQUIVO NÃO RESOLVIDO**
- `/abc-costing` [tela] → src/pages/ABCCostingDashboard.tsx (protegida)
- `/admin/monitoring` [tela] → src/pages/SystemMonitoringPage.tsx (protegida)
- `/admin/telemetria` [tela] → src/pages/AdminTelemetriaPage.tsx (protegida)
- `/alerts` [tela] → src/pages/AlertsDashboard.tsx (protegida)
- `/assistant` [tela] → src/pages/TechnicalAssistantPage.tsx (protegida)
- `/audit` [tela] → src/pages/AuditTrailPage.tsx (protegida)
- `/auth` [tela] → src/pages/AuthPage.tsx (protegida)
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
- `/reset-password` [tela] → src/pages/ResetPasswordPage.tsx (protegida)
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
- `GET /{t}` → scripts/ai-context/cenarios.mjs
- `GET /a` → scripts/ai-context/cenarios.mjs
- `GET /a` → scripts/ai-context/cenarios.mjs
- `POST /b` → scripts/ai-context/cenarios.mjs
- `POST /b` → scripts/ai-context/cenarios.mjs
- `DELETE /c` → scripts/ai-context/cenarios.mjs
- `PUT /d` → scripts/ai-context/cenarios.mjs
- `GET /items` → scripts/ai-context/gerar.unit.mjs
- `GET /u` → scripts/ai-context/cenarios.mjs
- `GET /users` → scripts/ai-context/cenarios.mjs
- `POST /users/:id` → scripts/ai-context/cenarios.mjs
- `GET /x` → scripts/ai-context/cenarios.mjs

## Vistas por id (menu/ViewRouter → arquivo)
- (nenhum)

## Edge functions
- `approve-password-reset` — tabelas: password_reset_requests, profiles; chamada por 1 arquivo(s) do front
- `auto-promote-jobs` — tabelas: jobs, techniques, user_roles; chamada por 1 arquivo(s) do front, por SQL/cron
- `backup-scheduler` — tabelas: backup_logs, backups; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `bitrix24-sync` (verify_jwt=false) — tabelas: bitrix24_field_mappings, bitrix24_oauth_states, bitrix24_oauth_tokens, bitrix24_sync_history, jobs, user_roles; chamada por 1 arquivo(s) do front
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
- `technical-assistant` — tabelas: -; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `tpm-notifications` — tabelas: maintenance_records, maintenance_schedules, tpm_notification_logs, tpm_notification_queue; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `update-operator` — tabelas: profiles; chamada por 1 arquivo(s) do front
- `validate-login-ip` — tabelas: ip_allowlist, login_audit; chamada por 0 arquivo(s) do front — **ÓRFÃ**
- `webhook-handler` — tabelas: bitrix24_sync_history, webhook_logs; chamada por 1 arquivo(s) do front

## Cron jobs (pg_cron / vercel)
- `auto-promote-jobs-fallback` */5 * * * * → edge auto-promote-jobs (20260512110942_cb61b4fe-9a86-40b9-9d12-24764f730f0e.sql)
- `purge-old-logs-daily` 15 3 * * * (20261002130000_csp_reports_retention.sql)
- `rollup-cron-p95-daily` 20 * * * * (20260726161334_0dc2a73a-2f32-4855-acb2-6ce7fc124ee7.sql)

## Integrações externas
- SDKs: Resend, Sentry, Supabase, i18next, react-query, zod
- hosts mais citados: api.resend.com, fastgravacoes.com.br, ai.gateway.lovable.dev, example.test, x.supabase.co, api.fastgravacoes.com, api.ipify.org, api.pwnedpasswords.com, api.supabase.com, api.x.com, app.fastgravacoes.com.br, app.test, evil.com, evil.example, exemplo.com
- webhooks recebidos: bitrix24-sync, csp-report
- env de integração (só nomes): BACKUP_API_KEY, BITRIX24_ACCESS_TOKEN, BITRIX24_CLIENT_ID, BITRIX24_CLIENT_SECRET, BITRIX24_REFRESH_TOKEN, BITRIX24_WEBHOOK_SECRET, BITRIX24_WEBHOOK_TOKEN, BITRIX24_WEBHOOK_URL, CRON_API_KEY, CRON_SECRET, LOVABLE_API_KEY, RESEND_API_KEY, SECRET, SENTRY_DSN, VITE_ALERT_WEBHOOK_URL, VITE_GOOGLE_ANALYTICS_ID, VITE_GOOGLE_MAPS_API_KEY, VITE_SENTRY_DSN, WEBHOOK_API_KEY

## Permissões / papéis
- papéis no código: button (21), admin (9), operator (9), coordinator (8), user (7), region (5), alert (4), assistant (4), manager (4), status (4), tab (4), combobox (3), dialog (3), navigation (3), presentation (3), alertdialog (2), superuser (2), system (2), toolbar (2), agent (1), group (1), link (1), list (1), main (1), none (1), option (1), progressbar (1), separator (1), sup (1), tablist (1), tabpanel (1)
- enums de papel: app_role: coordinator|operator|manager|admin
- guards: src/components/auth/ProtectedRoute.tsx, src/contexts/DirtyFormContext.tsx · rotas protegidas: 53 · públicas: /design-system, /install, /track
- feature flags: FEATURE_X, nova-tela, novo-inbox

## Alertas (baseline.json → alertas)
- rotas_sem_arquivo: 0
- componentes_ambiguos: 0
- menu_sem_destino: 31 — ex.: Abrir Filtros -> action-filter, Adicionar Coluna -> ctx-add-column, Adicionar Operador -> ctx-add-operator
- edges_orfas: 16 — ex.: backup-scheduler, cleanup-security-logs, cron-alert-email
- edges_chamadas_sem_pasta: 0
- tabelas_sem_rls: 0
- tabelas_usadas_sem_definicao: 1 — ex.: backups
- tabelas_com_drift_migration_vs_types: 8 — ex.: business_config, jobs, operator_rankings
- rpcs_sem_definicao: 0
- componentes_orfaos: 27 — ex.: src/components/accessibility/AccessibleIconButton.tsx, src/components/accessibility/FocusTrap.tsx, src/components/alerts/AlertCard.tsx
- componentes_com_nome_duplicado: 6 — ex.: AdjustmentParameters, DashboardSkeleton, JobQuickActions
- scripts_orfaos: 4 — ex.: scripts/graphify/corpus.py, scripts/graphify/enrich.py, scripts/graphify/pipeline.py
- env_usadas_nao_declaradas: 7 — ex.: DEV, NODE_ENV, PROD
- ciclos_de_import: 9
- possiveis_segredos_no_codigo: 1 — ex.: scripts/ai-context/cenarios.mjs:102

## Grafo de código (graphify)
- 6518 nós · 20523 arestas · 618 comunidades · grafo do commit `5db90ba2`
- comunidades maiores: card.tsx (153), button.tsx (135), badge.tsx (112), TraceabilityPage.tsx (106), useAuth (101), analytics/index.ts (91), snapshot.py (90), cn (89), GraphifyIntegrationTests (86), gerar.mjs (82), .collect (78), scroll-area.tsx (78)
- símbolos mais chamados: cn() (src/lib/utils.ts), useAuth() (src/features/auth/hooks/useAuth.ts), showErrorToast() (src/lib/errorHandling.ts), useSchedulingData() (src/features/jobs/hooks/useSchedulingData.ts), parseDateOnly() (src/lib/dateUtils.ts), q() (scripts/supabase_snapshot/snapshot.py), createAppError() (src/lib/errorHandling.ts), useRealtimeChannel() (src/lib/realtimeChannel.ts), .collect() (scripts/supabase_snapshot/test_snapshot.py), excluded_sql() (scripts/supabase_snapshot/snapshot.py), useDevice() (src/hooks/use-device.tsx), useDirtyGuard() (src/contexts/DirtyFormContext.tsx)
- consulta local: `graphify query "<pergunta>"`, `graphify path "<A>" "<B>"`, `graphify explain "<X>"`

## Hotspots (arquivos mais alterados, 90 dias)
- .github/workflows/ci.yml (15)
- AGENTS.md (9)
- package-lock.json (9)
- deno.lock (8)
- .github/workflows/db-admin.yml (7)
- PENDENCIAS.md (7)
- CLAUDE.md (6)
- package.json (6)
- supabase/config.toml (6)
- .github/workflows/deploy.yml (5)
- index.html (5)
- scripts/audit-gate.mjs (5)
- tests/e2e/offline.spec.ts (5)
- tests/e2e/visual-regression.spec.ts (5)
- .github/workflows/graphify.yml (4)

## Workflows
- `ci.yml` — CI — Quality Gates (pull_request, push, workflow_dispatch)
- `contexto.yml` — Contexto para agentes de IA (10 min) (push, schedule, workflow_dispatch; cron 3-59/10 * * * *)
- `db-admin.yml` — DB Admin (workflow_dispatch)
- `deploy.yml` — Deploy (push, workflow_dispatch)
- `graphify.yml` — Architecture graph (pull_request, workflow_dispatch)
- `migration-repair.yml` — Migration repair (workflow_dispatch)
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
- `quality:gate`: `npm run lint && npm run quality:any && npm run test`
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

## Documentos (raiz e docs/)
- `.github/PULL_REQUEST_TEMPLATE.md` (18 linhas)
- `AGENTS.md` — AGENTS.md (79 linhas)
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
- subpastas de docs/: docs/estado (20), docs/adr (4), docs/agentes (3), docs/contexto (3), docs/operacoes (3), docs/graphify (2), docs/post-mortems (1)


## Últimos commits
- 2026-11-08 `5db90ba` feat: regras de negócio Nov 2026 (R1.1, R1.5, R2.4, R3.2, R4.2–R4.4)
- 2026-11-08 `3720de3` fix(contexto): grants por coluna pelo catálogo, sem estourar o timeout (#138)
- 2026-11-08 `c9814e8` fix(contexto): guard de segredos por ocorrência (#137)
- 2026-11-08 `bce2374` feat(contexto): contexto autônomo para agentes de IA (#136)
- 2026-11-07 `92a5fee` fix: reordena verify RLS reforcada para depois do drop da policy permissiva (#135)
- 2026-11-07 `d149e29` fix: renomeia migration fix_permissive_insert_policies para timestamp posterior ao remoto (#134)
- 2026-11-07 `c98b362` chore: instruções enxutas para agentes (#130)
- 2026-11-07 `5e0a121` chore: aprimora scripts de bundle, graphify e RLS regression (#132)
- 2026-11-07 `249d814` fix: remove policy INSERT permissiva e reforca verify RLS (#133)
- 2026-11-07 `87e85e6` fix: redige sufixo de chave Stripe dos docs de estado (#131)
- 2026-11-06 `28215b3` infra: migra imports esm.sh para npm nas edge functions (#129)
- 2026-11-05 `d6c9c11` fix: atualiza hash tslib@2.8.1 no deno.lock (esm.sh CDN update)
- 2026-11-05 `ef2da88` fix: adicionar --yes ao supabase db push (CI não-interativo)
- 2026-11-05 `6da824c` fix: verificação RLS USING(true) em políticas de escrita via migration
- 2026-11-05 `33983fd` fix: adiciona --yes no supabase functions deploy para CI não-interativo (#123)

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
