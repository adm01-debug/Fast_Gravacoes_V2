# Lote 07 — Admin, Configurações e Integrações

> Auditoria de **estado do código** (não de runtime). Data: 2026-08-16.
> Todos os `.md` do repositório (CLAUDE.md, ANALISE_TECNICA_SISTEMA.md, AUDITORIA_*) foram
> tratados como **hipótese**, nunca como fonte de verdade. Cada linha abaixo aponta um
> `arquivo:linha` que foi efetivamente aberto/verificado nesta sessão.

## Cobertura

Escopo auditado:

- `src/features/admin/**` — 3 pastas de componentes (telemetry, monitoring, audit, security), 24 hooks, 2 services, 3 arquivos de types.
- `src/components/settings/**` (12 arquivos), `src/components/integrations/**` (4 arquivos).
- Páginas de admin/config/telemetria: `SettingsPage`, `SecurityDashboard`, `AuditTrailPage`, `AdminTelemetriaPage`, `SystemMonitoringPage`, `SystemStatusPage`, `MasterAPIPage`, `CodeQualityDashboard`, `Bitrix24ConfigPage`.
- **Todas as 33 Edge Functions** de `supabase/functions/` (35 entradas − `_shared/` − `import_map.json`), com grep individual do nome de cada uma em `src/`.
- `supabase/functions/_shared/**` (cors, cronAuth, rateLimit, logger, htmlEscape, validate/validation, contracts).
- `src/lib/edgeFunctionFetch.ts`, `src/lib/circuitBreaker.ts`, `src/lib/retryWithBackoff.ts`, `src/lib/rateLimiter.ts`, `src/lib/logger.ts`.
- `.env.example`, `.env.production`, `.env.staging` (não existem `.env` nem `.env.local` no repo).
- Migrations com `pg_cron` / `pg_net` / `net.http_post` (6 arquivos) + `supabase/config.toml`.

Fora de escopo (outros lotes): produção/jobs/kanban, inventário, manutenção/TPM, analytics/ML, auth/RBAC internos, notificações.

**Runtime: NAO_VERIFICADO.** Não houve acesso a banco, dashboard Supabase, logs ou produção.
Isso implica em particular que **não é possível afirmar** que:
- qualquer cron job esteja realmente agendado no Supabase Dashboard (só o que está em migration é verificável);
- qualquer secret (`RESEND_API_KEY`, `BITRIX24_*`, `VAPID_*`, `CRON_SECRET`, `LOVABLE_API_KEY`, `SENTRY_DSN`) esteja preenchido;
- qualquer Edge Function esteja de fato *deployada*.

---

## Inventário de funcionalidades (admin/config/telemetria)

| Funcionalidade | Classificação | Evidência (arquivo:linha) | O que falta / observação |
|---|---|---|---|
| Página de Configurações (9 abas) | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/SettingsPage.tsx:104-124`; abas em `src/components/settings/` | Fio completo até as abas; a persistência varia por aba (ver linhas seguintes) |
| Preferências gerais/notificações (switches "Geral"/"Notificações") | 🟨 IMPLEMENTADO_PARCIAL | `src/pages/SettingsPage.tsx:23-36` (`usePersistedSettings`), toast em `:71` | Persistência **só em `localStorage`** (`app-settings-<userId>`). Nada vai ao banco; o toast diz "Configuração salva automaticamente" mas a config não sai do navegador |
| Limiares de alerta (thresholds globais + por entidade) | 🟨 IMPLEMENTADO_PARCIAL | grava `src/pages/SettingsPage.tsx:39-63`; lido por `src/components/dashboard/AlertsWidget.tsx:37`, `src/components/kanban/DroppableColumn.tsx:82`, `src/components/kanban/KanbanMetricsBar.tsx:24` | Fio UI→consumo existe, mas **inteiramente client-side via `localStorage`**; não é compartilhado entre usuários/dispositivos nem usado por nenhuma Edge Function |
| Gestão de técnicas | ✅ IMPLEMENTADO_TOTAL | `src/components/settings/TechniqueManagement.tsx:129,133` (form) + persistência Supabase na mesma tela | — |
| Gestão de usuários / criar operador | ✅ IMPLEMENTADO_TOTAL | UI `src/components/operators/CreateOperatorModal.tsx:82` → `supabase/functions/create-operator/index.ts` (usa `checkRateLimit`, `:3`) | Fio UI → edge function → auth/DB |
| Editar operador | ✅ IMPLEMENTADO_TOTAL | `src/components/operators/EditOperatorModal.tsx:78` → `supabase/functions/update-operator/index.ts:2` | — |
| Aprovação de reset de senha | ✅ IMPLEMENTADO_TOTAL | `src/components/settings/PasswordResetRequests.tsx:72` e `:95` → `supabase/functions/approve-password-reset/index.ts:3-4` | — |
| MFA (setup + enroll) | ✅ IMPLEMENTADO_TOTAL | `src/pages/SecurityDashboard.tsx:229` → `src/features/admin/components/security/MFASettings.tsx:19,125` → `MFAEnroll.tsx:10` (usa `supabase.auth.mfa`) | — |
| IP Allowlist (CRUD) | 🟨 IMPLEMENTADO_PARCIAL | CRUD real em `src/components/settings/IPAllowlist.tsx:44,72,99,116` (tabela `ip_allowlist`) | **Fio quebrado na aplicação**: o único código que *lê* `ip_allowlist` para bloquear é `supabase/functions/validate-login-ip/index.ts:80`, e essa function tem **zero chamadores** em `src/` |
| Rate limit — painel de configuração | 🟨 IMPLEMENTADO_PARCIAL | UI+CRUD `src/features/admin/hooks/useRateLimitLogs.ts:110,211,238,265` (tabela `rate_limit_settings`) | O único consumidor de `rate_limit_settings` é `supabase/functions/rate-limit-check/index.ts:130` — function **órfã**. Rate limiting real das outras functions usa `_shared/rateLimit.ts` com limites próprios, ignorando essa tabela |
| Bloqueio de IPs (blocked_ips) | ✅ IMPLEMENTADO_TOTAL | UI `src/features/admin/components/security/BlockedIPsPanel.tsx:51-52` → `src/features/admin/hooks/useRateLimitLogs.ts:78,94,152,183` | — |
| Geo-blocking (settings/rules/logs) | 🟨 IMPLEMENTADO_PARCIAL | `src/features/admin/hooks/useGeoBlocking.ts:73,82,107,122,139,146` + UI `GeoBlockingSettings.tsx:213` | Persistência completa, mas **nenhuma Edge Function lê `geo_blocking_*`** (grep em `supabase/functions/*/index.ts` = 0). Enforcement é client-side apenas |
| Log de eventos de segurança | ✅ IMPLEMENTADO_TOTAL | `src/features/admin/hooks/useRateLimitLogs.ts:125` (`security_events`) → `SecurityEventsLog.tsx` montado em `src/pages/SecurityDashboard.tsx:26` | — |
| Trilha de auditoria + verificação de cadeia | ✅ IMPLEMENTADO_TOTAL | `src/features/admin/hooks/useAuditTrail.ts:20` (`audit_log`) e `:95` (`rpc('verify_audit_chain')`) → `src/pages/AuditTrailPage.tsx` | — |
| Telemetria de queries (`/admin/telemetria`) | 🟨 IMPLEMENTADO_PARCIAL | leitura `src/pages/AdminTelemetriaPage.tsx:130,197` + realtime `:94`; leitura `src/features/admin/hooks/useMonitoringData.ts:50,64` | **Sem produtor no app.** O único código que insere em `query_telemetry` é `supabase/functions/external-db-bridge/index.ts:65` (function órfã). O `global.fetch` instrumentado do client (`src/integrations/supabase/client.ts:19-62`) só encaminha ao `logger` → `error_logs`, nunca a `query_telemetry` |
| Log de erros (`error_logs`) | ✅ IMPLEMENTADO_TOTAL | escrita `src/lib/logger.ts:61`, `src/components/ui/error-boundary.tsx:39` → leitura `src/features/admin/hooks/useMonitoringData.ts:44` → UI `src/pages/AdminTelemetriaPage.tsx` | — |
| Traces de performance (`telemetry_traces`) | ✅ IMPLEMENTADO_TOTAL | escrita `src/features/production/hooks/usePerformanceMetrics.ts:40,77` → leitura `src/pages/AdminTelemetriaPage.tsx:63` | — |
| Saúde dos cron jobs (`get_cron_health`) | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/SystemMonitoringPage.tsx:218` → hook `src/features/admin/hooks/useCronHealth.ts:39` → SQL `supabase/migrations/20260726150724_...sql:1,26` (lê `cron.job` / `cron.job_run_details`) | — |
| Histórico/P95 de cron (`cron_p95_daily`) | ✅ IMPLEMENTADO_TOTAL | UI `src/pages/SystemMonitoringPage.tsx:220-221` → `useCronP95Daily.ts:51` → rollup agendado em `supabase/migrations/20260726161334_...sql:77` (`cron.schedule('rollup-cron-p95-daily','20 * * * *')`) | Único `cron.schedule` **incondicional** de todo o repositório |
| Opt-out de e-mail de alerta de cron | 🟨 IMPLEMENTADO_PARCIAL | UI `src/features/admin/components/monitoring/CronEmailPreferenceCard.tsx:9,23-33` ↔ leitura em `supabase/functions/cron-alert-email/index.ts:137,146,156` | Contrato UI↔function está correto e completo; mas `cron-alert-email` **não tem agendamento em nenhuma migration** e nenhum chamador no front |
| Status consolidado do sistema (`/status`) | 🟨 IMPLEMENTADO_PARCIAL | UI `src/pages/SystemStatusPage.tsx:1-60` → `useSystemStatusSummary.ts:3` → SQL `supabase/migrations/20260726165835_...sql:53-67` | O campo `edge_status` lê `edge_health_history`, cuja **única escrita** é `supabase/functions/health-monitor/index.ts:89` — function órfã e sem cron em migration ⇒ tende a "unknown" |
| Monitoramento do sistema (`/admin/monitoring`) | ✅ IMPLEMENTADO_TOTAL | `src/pages/SystemMonitoringPage.tsx:82` → `useMonitoringData.ts:37,44,50,57` (security_events, error_logs, query_telemetry, login_audit) | Uma das 4 fontes (`query_telemetry`) está sem produtor — ver linha de telemetria |
| Exportação de dados (CSV/audit) | ✅ IMPLEMENTADO_TOTAL | `src/features/admin/hooks/useDataExport.ts:102,157` | — |
| Backup manual (JSON no browser) | ✅ IMPLEMENTADO_TOTAL | `src/components/settings/SettingsBackupTab.tsx:20` → `src/pages/SettingsPage.tsx:80-92` | Baixa jobs/profiles/machines como JSON local; não é backup gerenciado |
| Backup agendado | 🟦 SUGERIDO_OU_INICIADO | `supabase/functions/backup-scheduler/index.ts:35` (implementação completa, exporta 5 tabelas p/ Storage) | Sem chamador em `src/` (grep = 0) e **sem `cron.schedule` em nenhuma migration**. É fail-closed sem `CRON_SECRET` (`:36`) |
| Feature flags (versão DB) | ⬛ MORTO_OU_ABANDONADO | `src/features/admin/hooks/useFeatureFlags.ts:22` lê tabela `feature_flags` (criada em `supabase/migrations/20260513191712_...sql:1`) | `grep -rn "useFeatureFlags" src/` só retorna a definição, o barrel `src/features/admin/index.ts:15` e a versão *homônima* do contexto. Zero consumidores |
| Feature flags (versão contexto, em memória) | 🟦 SUGERIDO_OU_INICIADO | `src/contexts/FeatureFlagsContext.tsx:12-22` (8 flags default), provider montado em `src/providers/AppProviders.tsx:26,62` | Provider montado mas **nenhum componente chama seu `isEnabled(flag)`**; sem persistência. Colide por nome com o hook DB acima |
| Configuração de negócio (`business_config`) | ✅ IMPLEMENTADO_TOTAL | `src/features/admin/hooks/useBusinessConfig.ts:27,45` → consumido em `src/features/production/hooks/useOEE.ts:181`, `useOEEAlerts.ts:15`, `src/features/analytics/hooks/useLoadBalancing.ts:44`, `src/features/jobs/hooks/useAutoBufferPromotion.ts:17` | — |
| Presets de dashboard | ✅ IMPLEMENTADO_TOTAL | `src/features/admin/hooks/useDashboardPresets.ts` → `src/pages/OEEDashboard.tsx:132` | — |
| Detecção de dados órfãos | ✅ IMPLEMENTADO_TOTAL | `src/features/admin/hooks/useOrphanedDataDetection.ts:23` → `src/pages/AlertsDashboard.tsx:64` | Cálculo em memória sobre jobs/técnicas/máquinas |
| Exportação BI (PDF/CSV) | ✅ IMPLEMENTADO_TOTAL | `src/features/admin/hooks/useBIExport.ts:28` → `src/features/analytics/components/bi/FuturisticBI.tsx:45`, `src/pages/KPIDashboard.tsx:12` | — |
| Log de atividade (in-memory) | 🟨 IMPLEMENTADO_PARCIAL | `src/features/admin/hooks/useActivityLog.ts:33` → `src/pages/Index.tsx:192` | Estado React puro; **sem persistência** — some no refresh |
| Histórico de versões de entidade | ⬛ MORTO_OU_ABANDONADO | `src/features/admin/hooks/useVersionHistory.ts:20` (localStorage, `STORAGE_PREFIX` `:17`) | `grep -rn "useVersionHistory" src/` só encontra a definição e o barrel `src/features/admin/index.ts:16`. Zero consumidores |
| Importação de dados | ⬛ MORTO_OU_ABANDONADO | `src/features/admin/hooks/useDataImport.ts:106` (insert genérico) | Zero consumidores (grep = só a definição + barrel `index.ts:10`) |
| Filtros salvos | ⬛ MORTO_OU_ABANDONADO | `src/features/admin/hooks/useSavedFilters.ts` (exportado em `src/features/admin/index.ts:17`) | Zero consumidores |
| `ReportsService` | ⬛ MORTO_OU_ABANDONADO | `src/features/admin/services/reportsService.ts:3` (`getOEEMetrics`, `getABCCosts`, `getDailySummaries`) | Exportado em `src/features/admin/index.ts:20`; `grep -rn "ReportsService\|reportsService" src/` fora do próprio arquivo/barrel = 0 |
| `IntegrationsService` | ⬛ MORTO_OU_ABANDONADO | `src/features/admin/services/integrationsService.ts:4,14,24` | Exportado em `src/features/admin/index.ts:19`; zero consumidores — os componentes Bitrix24 usam `useBitrix24Sync`/`edgeFunctionFetch` direto |
| Dashboard de qualidade de código | 🟦 SUGERIDO_OU_INICIADO | `src/pages/CodeQualityDashboard.tsx:19` → `src/features/admin/hooks/useCodeQualityMetrics.ts:68` (`const TEST_FILES: TestFile[] = [...]` hardcoded) e `:84` (`const HOOKS = [...]` lista manual de ~75 nomes) | **Métricas 100% estáticas escritas à mão**, não medidas. O comentário `// No test files currently exist in the project` (`:67`) contradiz a própria lista logo abaixo |
| "AI Cyber Advisor" | 🟦 SUGERIDO_OU_INICIADO | `src/features/admin/components/security/AICyberAdvisor.tsx:7-31` (`const insights = [...]` fixo) montado em `src/pages/SecurityDashboard.tsx:217` | Texto fictício e não-determinístico ("bloqueou 43 tentativas de brute-force na última hora"). Nenhuma chamada a LLM/dados |
| "Audit AI Advisor" | 🟦 SUGERIDO_OU_INICIADO | `src/features/admin/components/audit/AuditAIAdvisor.tsx:7-25` (array literal) | Idem — sem `fetch`/`invoke` no arquivo |
| "Cyber-Resilience Index" | 🟦 SUGERIDO_OU_INICIADO | `src/features/admin/components/security/CyberResilienceScore.tsx:6-30` | Gauge SVG com valor fixo; nenhuma fonte de dados |
| "Master API Hub" (`/master-api`) | 🟦 SUGERIDO_OU_INICIADO | `src/pages/MasterAPIPage.tsx:29` (`useState('sk_live_fast_9283749123847')`), endpoints hardcoded `:37-41`, exemplo `:205` | Página **puramente ilustrativa**: chave falsa, e os endpoints documentados (`/api/v1/jobs`, `/api/v1/inventory`, `PATCH /api/v1/machines/:id`) **não batem** com os reais da `erp-api` (`jobs\|machines\|operators\|lots\|production\|kpis`, `supabase/functions/erp-api/index.ts:122-136`). Não há UI para gerar chaves em `erp_api_keys` |
| Circuit breaker / retry com backoff / rate limiter (client) | ⬛ MORTO_OU_ABANDONADO | `src/lib/index.ts:13,14,15` exportam `CircuitBreaker`, `retryWithBackoff`, `RateLimiter` | `grep -rn` por todos esses símbolos em `src/`+`supabase/` retorna **apenas** os testes (`src/test/circuitBreaker.test.ts:2`, `src/test/retryWithBackoff.test.ts:2`) e o próprio barrel. Zero uso em produção |

---

## Inventário COMPLETO de integrações externas

| Integração | Classificação | Evidência (arquivo:linha) | Variável/segredo | Tem chamador? |
|---|---|---|---|---|
| **Bitrix24 (CRM)** | ✅ IMPLEMENTADO_TOTAL | Function `supabase/functions/bitrix24-sync/index.ts` (1217 linhas): webhook `:443-448`, OAuth `:109-116,192-200`, verificação de assinatura fail-closed `:811-816`. UI: `src/pages/Bitrix24ConfigPage.tsx:58`, `src/components/integrations/Bitrix24SyncPanel.tsx:25`, `Bitrix24FieldMapping.tsx:52,61,71`, `Bitrix24SyncHistory.tsx:43`, `src/features/admin/hooks/useBitrix24Sync.ts:43`, push de job `src/features/jobs/services/jobsService.ts:101` | Secrets **do lado servidor** (Deno.env): `BITRIX24_DOMAIN`, `BITRIX24_WEBHOOK_URL`, `BITRIX24_WEBHOOK_SECRET`, `BITRIX24_CLIENT_ID/SECRET`, `BITRIX24_ACCESS_TOKEN`, `BITRIX24_REFRESH_TOKEN` (`bitrix24-sync/index.ts:7-20`). O `VITE_BITRIX_WEBHOOK_URL` documentado em `.env.example:15` **não é lido por nenhum código** | **Sim** — 8 call sites no front |
| **ERP externo (API pública própria)** | 🟨 IMPLEMENTADO_PARCIAL | `supabase/functions/erp-api/index.ts:84` (serve), auth por `x-api-key` `:23` contra `erp_api_keys` `:47`, rotas `:122-136`. Tabela criada em `supabase/migrations/20260520000001_security_rls_indexes_fixes.sql:213` | Chaves ficam na tabela `erp_api_keys` (não em env) | **Não há chamador interno** (é API *de entrada*), mas **também não há UI** para emitir/rotacionar chaves — `grep -rn "erp_api_keys" src/` (fora de `types.ts`) = 0. `MasterAPIPage` mostra chave fake |
| **Resend (e-mail transacional)** | 🟨 IMPLEMENTADO_PARCIAL | `supabase/functions/new-device-alert/index.ts:25`, `cron-alert-email/index.ts:108,190`, `send-email-report/index.ts:23,339`, `send-loss-risk-alert/index.ts:32,138`, `send-tpm-email/index.ts:21,108` | `RESEND_API_KEY` via `Deno.env` (5 functions). `VITE_RESEND_API_KEY` em `.env.example:19` é **template vazio nunca lido** | **Parcial**: só `new-device-alert` tem chamador (`src/hooks/useDeviceDetection.ts:104`). As outras 4 são órfãs. `send-email-report` degrada para "preview" sem a chave (`:392-398`) |
| **Twilio (SMS/WhatsApp)** | 🟦 SUGERIDO_OU_INICIADO | Apenas `.env.example:22-25`, `.env.production:23-26`, `.env.staging:20-23` | `VITE_TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER/WHATSAPP_NUMBER` — **todos template vazio** | **Não.** `grep -rni "twilio" src/ supabase/ index.html public/` = **0 ocorrências**. Não existe uma linha de código de Twilio no repo |
| **Sentry (erros + Web Vitals)** | ✅ IMPLEMENTADO_TOTAL | Init `src/main.tsx:19-30` (só quando `VITE_SENTRY_DSN` e `PROD`), Web Vitals `:34-46`. Server-side: `supabase/functions/health-monitor/index.ts:16-30` monta evento p/ Store API | `VITE_SENTRY_DSN` (front, `.env.*` vazio) e `SENTRY_DSN` (Deno.env, health-monitor) | **Sim** no front. No servidor, apenas via `health-monitor`, que é órfã |
| **Google Maps** | 🟦 SUGERIDO_OU_INICIADO | Somente `.env.example:31`, `.env.production:30`, `.env.staging:27` | `VITE_GOOGLE_MAPS_API_KEY` — vazio | **Não.** `grep -rni "maps.googleapis"` em `src/`+`index.html` = 0 |
| **Google Analytics** | 🟦 SUGERIDO_OU_INICIADO | Somente `.env.example:32`, `.env.production:31`, `.env.staging:28` | `VITE_GOOGLE_ANALYTICS_ID` — vazio | **Não.** `grep -rni "gtag\|googletagmanager\|google-analytics"` em `src/`+`index.html`+`public/` = 0 |
| **Web Push (VAPID)** | ✅ IMPLEMENTADO_TOTAL | Front: `src/features/notifications/hooks/usePushSubscription.ts:41,178,204`, `useWebPushNotifications.ts:192`; SW registrado em `src/main.tsx:50-58`. Servidor: `supabase/functions/send-push-notification/index.ts:154-156` (JWT VAPID `:69`) | Front `VITE_VAPID_PUBLIC_KEY` **com fallback hardcoded** `DEFAULT_VAPID_PUBLIC_KEY` (`usePushSubscription.ts:41`) e **não documentado** em nenhum `.env.*`. Servidor: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | **Sim** — 3 call sites |
| **Lovable AI Gateway (LLM)** | ✅ IMPLEMENTADO_TOTAL | `supabase/functions/ml-predictions/index.ts:139` (`https://ai.gateway.lovable.dev/v1/chat/completions`) e `technical-assistant/index.ts:498` | `LOVABLE_API_KEY` (Deno.env, `ml-predictions:15`, `technical-assistant:470`). Lança erro se ausente (`:19`, `:473`) | **Sim** — `src/features/analytics/hooks/useMLPredictions.ts:112`, `src/features/maintenance/hooks/useTPMMutations.ts:502`, `src/components/assistant/TechnicalAssistant.tsx:58`, `src/pages/TechnicalAssistantPage.tsx:86` |
| **Lovable Cloud Auth (OAuth Google/Apple)** | ✅ IMPLEMENTADO_TOTAL | `src/integrations/lovable/index.ts:3,5,14` (arquivo auto-gerado) → consumido em `src/pages/AuthPage.tsx:19` | Sem env própria (SDK `@lovable.dev/cloud-auth-js`, `package.json:30`) | **Sim** — 1 call site |
| **Lovable Tagger (build)** | ✅ IMPLEMENTADO_TOTAL | `vite.config.ts:4` (`componentTagger`), `package.json:137` | — | Plugin de build; ativo apenas em dev |
| **Webhook de alertas críticos (genérico)** | 🟨 IMPLEMENTADO_PARCIAL | `src/lib/logger.ts:227-241` — `POST` do payload `CRITICAL_ERROR` para a URL configurada | `VITE_ALERT_WEBHOOK_URL` — **template vazio** em `.env.example:35`, `.env.production:34`, `.env.staging:31` | Código presente e chamado por `logger.critical(...)`, mas **guardado por `if (!isDev && WEBHOOK_URL)`** (`:228`) ⇒ inerte enquanto a var estiver vazia |
| **Webhook de entrada (`webhook-handler`)** | 🟨 IMPLEMENTADO_PARCIAL | `supabase/functions/webhook-handler/index.ts:7` (usa `checkRateLimit`) | — | Único chamador em `src/` é o **simulador**: `src/lib/simulation.ts:114` (headers `X-Simulation-Mode`, `:120`). Chamadas reais viriam de fora ⇒ NAO_VERIFICADO |
| **Banco externo / bridge (`external-db-bridge`)** | ⬛ MORTO_OU_ABANDONADO | `supabase/functions/external-db-bridge/index.ts:175` (serve), allowlist de tabelas `:94-111`, allowlist de RPCs `:114-122`, escrita de telemetria `:65` | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | **Não.** `grep -rn "external-db-bridge" src/` = **0**. Apesar de bem construída (validação de colunas `:83-89`, allowlist), é inalcançável pelo app — e é o **único produtor** de `query_telemetry` |
| **Supabase (PostgREST/Auth/Storage/Realtime)** | ✅ IMPLEMENTADO_TOTAL | `src/integrations/supabase/client.ts:5-12` + instrumentação `global.fetch` `:19-62` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (nomes conferem com `.env.example:8,11`) | **Sim** — base de todo o app |

### Resumo das variáveis de ambiente

| Variável | Onde é documentada | Onde é lida | Situação |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env.example:7` | `src/integrations/supabase/client.ts:5`, `src/lib/edgeFunctionFetch.ts:13` | OK |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.example:11` | `src/integrations/supabase/client.ts:6`, `src/lib/edgeFunctionFetch.ts:19` | OK — **a nota do CLAUDE.md:90 sobre `VITE_SUPABASE_ANON_KEY` está desatualizada**: o `.env.example` já documenta o nome correto |
| `VITE_SUPABASE_PROJECT_ID` | `.env.example:8` | **nenhum lugar** | Documentada e não usada |
| `VITE_APP_ENV` | `.env.example:27` | `src/main.tsx:25` | OK |
| `VITE_APP_DEBUG` | `.env.example:28` | **nenhum lugar** | Documentada e não usada |
| `VITE_SENTRY_DSN` | `.env.example:35` | `src/main.tsx:19` | OK (vazia nos templates) |
| `VITE_ALERT_WEBHOOK_URL` | `.env.example:38` | `src/lib/logger.ts:227` | OK (vazia nos templates ⇒ inerte) |
| `VITE_VAPID_PUBLIC_KEY` | **nenhum `.env.*`** | `src/features/notifications/hooks/usePushSubscription.ts:41` | **Lacuna de documentação** — tem fallback hardcoded |
| `VITE_BITRIX_WEBHOOK_URL` | `.env.example:15` | **nenhum lugar** | Morta no front (o real é `BITRIX24_WEBHOOK_URL` server-side) |
| `VITE_RESEND_API_KEY` | `.env.example:19` | **nenhum lugar** | Morta (e seria um vazamento de secret se usada no front) |
| `VITE_TWILIO_*` (4) | `.env.example:22-25` | **nenhum lugar** | Mortas |
| `VITE_GOOGLE_MAPS_API_KEY` | `.env.example:31` | **nenhum lugar** | Morta |
| `VITE_GOOGLE_ANALYTICS_ID` | `.env.example:32` | **nenhum lugar** | Morta |

Secrets server-side efetivamente lidos por Edge Functions (`Deno.env.get`, contagem de ocorrências):
`SUPABASE_URL` (34), `SUPABASE_SERVICE_ROLE_KEY` (32), `SUPABASE_ANON_KEY` (18), `RESEND_API_KEY` (5), `PUBLIC_URL` (2), `LOVABLE_API_KEY` (2), `CRON_SECRET` (2), `APP_URL` (2), `VAPID_*` (3), `SENTRY_DSN` (1), `EXTRA_ALLOWED_ORIGINS` (1), `BITRIX24_*` (7), `APP_VERSION` (1).

---

## Mapa das 34 Edge Functions

> São **33** diretórios de function (`ls supabase/functions/` = 35 entradas, menos `_shared/` e `import_map.json`).
> "Cron?" = **agendamento verificável em migration**. Ausência aqui **não prova** ausência de cron — o
> agendamento pode existir só no Dashboard Supabase (NAO_VERIFICADO).

| Function | Chamador no frontend (arquivo:linha) ou "nenhum" | Cron? | Classificação |
|---|---|---|---|
| `approve-password-reset` | `src/components/settings/PasswordResetRequests.tsx:72`, `:95` | não | ✅ IMPLEMENTADO_TOTAL |
| `auto-promote-jobs` | `src/features/jobs/hooks/useAutoBufferPromotion.ts:26` | **sim (condicional)** — `supabase/migrations/20260512110942_...sql:43-56` (`*/5 * * * *`, dentro de `IF EXISTS pg_cron`) + trigger `on_job_finished_promote` `:86-91` | ✅ IMPLEMENTADO_TOTAL |
| `backup-scheduler` | **nenhum** (`grep -rn "backup-scheduler" src/` = 0) | não | 🟦 SUGERIDO_OU_INICIADO — `supabase/functions/backup-scheduler/index.ts:35`; fail-closed sem `CRON_SECRET` (`:36`) |
| `bitrix24-sync` | 8 sites: `Bitrix24SyncHistory.tsx:43`, `Bitrix24FieldMapping.tsx:52,61,71`, `useBitrix24Sync.ts:43`, `integrationsService.ts:24`, `jobsService.ts:101`, `Bitrix24ConfigPage.tsx:58` | não | ✅ IMPLEMENTADO_TOTAL |
| `calculate-inventory-intelligence` | `src/features/inventory/hooks/useInventory.ts:68` | não | ✅ IMPLEMENTADO_TOTAL |
| `calculate-rankings` | `src/hooks/useGamification.ts:132` | não | ✅ IMPLEMENTADO_TOTAL |
| `check-login-lockout` | `src/features/auth/services/authService.ts:48`, `:64` | não | ✅ IMPLEMENTADO_TOTAL |
| `cleanup-security-logs` | **nenhum** | não | 🟦 SUGERIDO_OU_INICIADO — `supabase/functions/cleanup-security-logs/index.ts:6`; limpa `rate_limit_logs` `:29` |
| `create-operator` | `src/components/operators/CreateOperatorModal.tsx:82` | não | ✅ IMPLEMENTADO_TOTAL |
| `cron-alert-email` | **nenhum** (a única menção, `CronEmailPreferenceCard.tsx:8`, é um comentário) | não | 🟨 IMPLEMENTADO_PARCIAL — `supabase/functions/cron-alert-email/index.ts:90`; contrato de opt-out casado com a UI (`:137,146,156`), mas nunca agendado nem chamado |
| `cron-cleanup` | **nenhum** | não | 🟦 SUGERIDO_OU_INICIADO — `supabase/functions/cron-cleanup/index.ts:9` |
| `daily-maintenance-summary` | `src/features/notifications/hooks/useDailySummaryNotifications.ts:51` | não | ✅ IMPLEMENTADO_TOTAL |
| `erp-api` | **nenhum** (API de entrada) | não | 🟨 IMPLEMENTADO_PARCIAL — `supabase/functions/erp-api/index.ts:84`; sem UI para gerenciar `erp_api_keys` |
| `excel-export` | **nenhum** | não | ⬛ MORTO_OU_ABANDONADO — `supabase/functions/excel-export/index.ts:20`; o app exporta Excel client-side (`src/lib/excelExport.ts`) |
| `external-db-bridge` | **nenhum** | não | ⬛ MORTO_OU_ABANDONADO — `supabase/functions/external-db-bridge/index.ts:175`; único produtor de `query_telemetry` (`:65`) |
| `health-check` | **nenhum** | não | 🟨 IMPLEMENTADO_PARCIAL — `supabase/functions/health-check/index.ts:40`; consumido apenas por `health-monitor` (que também é órfã) |
| `health-monitor` | **nenhum** | não (comentário `:5` diz "Schedule via pg_cron every 5 minutes", mas não há migration) | 🟨 IMPLEMENTADO_PARCIAL — `supabase/functions/health-monitor/index.ts:50`; único produtor de `edge_health_history` (`:89`), do qual `/status` depende |
| `image-optimizer` | **nenhum** | não | 🟦 SUGERIDO_OU_INICIADO — **stub declarado**: `supabase/functions/image-optimizer/index.ts:1-5` e retorno HTTP 501 `:15-16` |
| `metrics-collector` | **nenhum** | não | ⬛ MORTO_OU_ABANDONADO — `supabase/functions/metrics-collector/index.ts:5`; escreve `system_metrics` (`:60`), tabela **sem nenhum leitor** em `src/` |
| `ml-predictions` | `src/features/analytics/hooks/useMLPredictions.ts:112`, `src/features/maintenance/hooks/useTPMMutations.ts:502` | não | ✅ IMPLEMENTADO_TOTAL |
| `new-device-alert` | `src/hooks/useDeviceDetection.ts:104` | não | ✅ IMPLEMENTADO_TOTAL |
| `pdf-generator` | `src/features/maintenance/components/ExecutionDetailsModal.tsx:165` | não | ✅ IMPLEMENTADO_TOTAL |
| `rate-limit-check` | **nenhum** | não | 🟨 IMPLEMENTADO_PARCIAL — `supabase/functions/rate-limit-check/index.ts:18`; único leitor de `rate_limit_settings` (`:130`), tabela editada pela UI de admin |
| `security-alert` | **nenhum** (os 2 hits do grep são a query key `'security-alerts'` em `SecurityAlertsPanel.tsx:40` e `queryConfig.ts:36`) | não | ⬛ MORTO_OU_ABANDONADO — `supabase/functions/security-alert/index.ts:6` |
| `send-email-report` | **nenhum** | não | ⬛ MORTO_OU_ABANDONADO — `supabase/functions/send-email-report/index.ts:16` (412 linhas, com fallback de preview `:392`) |
| `send-loss-risk-alert` | **nenhum** no front | **trigger de DB** — `supabase/migrations/20260508144832_...sql:8-22` (`on_tpm_execution_alert` AFTER INSERT em `tpm_execution_alerts`) | 🟨 IMPLEMENTADO_PARCIAL — `supabase/functions/send-loss-risk-alert/index.ts:19`; acionada por trigger, mas a trigger lê a URL de `SELECT value FROM secrets` (tabela `secrets`, não verificável aqui) |
| `send-push-notification` | `src/features/notifications/hooks/usePushSubscription.ts:178`, `:204`, `useWebPushNotifications.ts:192` | não | ✅ IMPLEMENTADO_TOTAL |
| `send-tpm-email` | **nenhum** | **não** — a trigger existe mas está **comentada**: `supabase/migrations/20260508115941_...sql:52-56` | ⬛ MORTO_OU_ABANDONADO — `supabase/functions/send-tpm-email/index.ts:8` |
| `technical-assistant` | `src/components/assistant/TechnicalAssistant.tsx:58`, `src/pages/TechnicalAssistantPage.tsx:86` | não | ✅ IMPLEMENTADO_TOTAL |
| `tpm-notifications` | **nenhum** | não | ⬛ MORTO_OU_ABANDONADO — `supabase/functions/tpm-notifications/index.ts:7` |
| `update-operator` | `src/components/operators/EditOperatorModal.tsx:78` | não | ✅ IMPLEMENTADO_TOTAL |
| `validate-login-ip` | **nenhum** | não | 🟨 IMPLEMENTADO_PARCIAL — `supabase/functions/validate-login-ip/index.ts:44`; único enforcement de `ip_allowlist` (`:80`), cuja UI de CRUD existe e é usada |
| `webhook-handler` | `src/lib/simulation.ts:114` (apenas simulação) | não | 🟨 IMPLEMENTADO_PARCIAL — `supabase/functions/webhook-handler/index.ts:7` |

**Órfãs (zero chamadas no frontend): 18 de 33 (55%).**
`backup-scheduler`, `cleanup-security-logs`, `cron-alert-email`, `cron-cleanup`, `erp-api`, `excel-export`,
`external-db-bridge`, `health-check`, `health-monitor`, `image-optimizer`, `metrics-collector`,
`rate-limit-check`, `security-alert`, `send-email-report`, `send-loss-risk-alert`, `send-tpm-email`,
`tpm-notifications`, `validate-login-ip`.

### Cron jobs / automações agendadas

| Mecanismo | Onde | Verificável? |
|---|---|---|
| `CREATE EXTENSION pg_cron` | `supabase/migrations/20251213150058_...sql:2` | sim |
| `CREATE EXTENSION pg_net` | `supabase/migrations/20260512110942_...sql:2`, `20260508115941_...sql:27-31` | sim |
| `cron.schedule('rollup-cron-p95-daily','20 * * * *')` | `supabase/migrations/20260726161334_...sql:77-81` | **sim, incondicional** — chama SQL puro, não Edge Function |
| `cron.schedule('auto-promote-jobs-fallback','*/5 * * * *')` | `supabase/migrations/20260512110942_...sql:43-56` | **condicional** (`IF EXISTS pg_extension pg_cron`) — chama `auto-promote-jobs` |
| Trigger `on_job_finished_promote` → `auto-promote-jobs` | `supabase/migrations/20260512110942_...sql:86-91` | sim |
| Trigger `on_tpm_execution_alert` → `send-loss-risk-alert` | `supabase/migrations/20260508144832_...sql:24-28` | sim |
| Trigger p/ `send-tpm-email` | `supabase/migrations/20260508115941_...sql:52-56` | **COMENTADA** — nunca criada |

**Nenhuma migration agenda** `backup-scheduler`, `cron-cleanup`, `cleanup-security-logs`, `cron-alert-email`,
`metrics-collector`, `health-monitor`, `health-check`, `tpm-notifications` ou `security-alert` — apesar de
todas usarem `requireCronSecret`/`CRON_SECRET` e serem escritas como rotinas. Se estão agendadas, é
exclusivamente pelo Dashboard: **NAO_VERIFICADO**.

---

## Achados relevantes

1. **18 das 33 Edge Functions (55%) não têm nenhum chamador no frontend.** Esse é o achado central do lote.
   Elas se dividem em três grupos: (a) rotinas de cron que **nenhuma migration agenda**
   (`backup-scheduler:35`, `cron-cleanup:9`, `cleanup-security-logs:6`, `metrics-collector:5`,
   `cron-alert-email:90`, `health-monitor:50`, `tpm-notifications:7`, `security-alert:6`);
   (b) funções cujo consumidor natural existe mas não as chama (`rate-limit-check:130` vs. a UI de
   `rate_limit_settings`; `validate-login-ip:80` vs. a UI de `ip_allowlist`); (c) código simplesmente
   abandonado (`excel-export:20`, `send-email-report:16`, `send-tpm-email:8`, `external-db-bridge:175`).

2. **A tela de telemetria não tem produtor de dados.** `AdminTelemetriaPage.tsx:130,197` e
   `useMonitoringData.ts:50,64` leem `query_telemetry`, mas o único `INSERT` em todo o repositório está em
   `external-db-bridge/index.ts:65` — function órfã. A instrumentação `global.fetch` do client
   (`src/integrations/supabase/client.ts:19-62`), que o nome sugere ser a fonte, na verdade só chama
   `logger.warn/error` → `error_logs`. O painel de telemetria de queries provavelmente aparece vazio.

3. **`/status` depende de uma function órfã.** `get_system_status_summary` deriva `edge_status` de
   `edge_health_history` (`supabase/migrations/20260726165835_...sql:53-67`); o único escritor dessa tabela é
   `health-monitor/index.ts:89`, sem chamador nem cron em migration. Como a SQL trata `> 60 min` como
   `unknown` (`:59-60`), a página tende a exibir "Sem coletas recentes" permanentemente.

4. **Dois refs de projeto Supabase diferentes hardcoded em migrations.**
   `supabase/config.toml:1` = `xxroejpvloldkmqdydar`; `20260512110942_...sql:47` usa
   `https://xxroejpvloldkmqdydar.supabase.co/...`; mas `20260508115941_...sql:38` aponta para
   `https://whnnzdreuwxczxelvqjh.supabase.co/functions/v1/send-tpm-email` — **outro projeto**. Também há
   `20260512110942_...sql:14` construindo a URL a partir de `current_setting('request.headers')::json->>'host'`,
   o que não funciona quando a chamada vem de um trigger/cron (sem headers HTTP).

5. **CORS: a hipótese de "wildcard" do ANALISE_TECNICA não se confirma no código atual.** Não há
   `Access-Control-Allow-Origin: *` em nenhuma function de produção — apenas em dois arquivos de teste
   (`_shared/rateLimit.test.ts:25`, `_shared/cronAuth.test.ts:4,43`). 31 das 33 functions importam
   `_shared/cors.ts`, que faz allowlist real (`pickAllowedOrigin`, `_shared/cors.ts:33-36`). As **duas
   exceções** são `backup-scheduler/index.ts` e `metrics-collector/index.ts`, que não importam o helper.

6. **Painéis de segurança com conteúdo fictício apresentado como real.**
   `AICyberAdvisor.tsx:7-31` afirma "bloqueou automaticamente 43 tentativas de brute-force na última hora";
   `AuditAIAdvisor.tsx:7-25` afirma "Conformidade 21 CFR Part 11 … relatório pronto para submissão";
   `CyberResilienceScore.tsx:6-30` exibe um índice fixo. Nenhum tem `fetch`, `invoke` ou query. Os três estão
   montados em `src/pages/SecurityDashboard.tsx:209,217`.

7. **`MasterAPIPage` é uma maquete que documenta uma API que não existe.** Chave falsa em
   `src/pages/MasterAPIPage.tsx:29` (`'sk_live_fast_9283749123847'`), badge "Sistemas Operantes" fixo `:57-60`,
   e endpoints `:37-41` (`/api/v1/inventory`, `PATCH /api/v1/machines/:id`) que **divergem** dos reais da
   `erp-api` (`jobs|machines|operators|lots|production|kpis`, `erp-api/index.ts:122-136`). Não há tela para
   emitir chaves em `erp_api_keys`.

8. **`IntegrationHub` mostra status inventado.** `src/components/integrations/IntegrationHub.tsx:28-45`:
   array literal onde "ERP API" está `status: "connected"` com `lastSync: new Date()` (sempre "agora"), e
   Bitrix24 fica `"disconnected"` **mesmo tendo integração completa**. O `<Switch checked={...}>` em `:99`
   não tem `onCheckedChange` — é um controle inerte. Dois cards marcados "Em breve" (`:155`, `:169`).

9. **Configurações do sistema não saem do navegador.** `SettingsPage.tsx:23-36` e `:39-63` persistem
   preferências e limiares de alerta apenas em `localStorage`, e o toast em `:71` diz "Configuração salva
   automaticamente". Os limiares *são* consumidos (`AlertsWidget.tsx:37`, `DroppableColumn.tsx:82`,
   `KanbanMetricsBar.tsx:24`), então o efeito é real — mas por usuário/navegador, não por instalação.

10. **Duas implementações concorrentes de feature flags, ambas sem consumidores.**
    `src/features/admin/hooks/useFeatureFlags.ts:22` lê a tabela `feature_flags` (criada em
    `20260513191712_...sql:1` com seeds em `:12`) e tem zero consumidores; `src/contexts/FeatureFlagsContext.tsx:12-22`
    define 8 flags em memória e seu provider está montado (`src/providers/AppProviders.tsx:26,62`), mas nenhum
    componente chama seu `isEnabled(flag)`. Nenhuma feature do app está de fato atrás de flag.

11. **Utilitários de resiliência exportados e nunca usados.** `src/lib/index.ts:13,14,15` exportam
    `CircuitBreaker`, `retryWithBackoff` e `RateLimiter`; grep completo em `src/` + `supabase/` retorna apenas
    os próprios testes (`src/test/circuitBreaker.test.ts:2`, `src/test/retryWithBackoff.test.ts:2`). O
    `edgeFunctionFetch` (`src/lib/edgeFunctionFetch.ts:11-24`) faz um `fetch` cru, sem retry nem breaker.

12. **`CodeQualityDashboard` reporta métricas escritas à mão.** `useCodeQualityMetrics.ts:68-79` é um array
    literal de arquivos de teste com contagens fixas, `:84-110` é uma lista manual de nomes de hooks, e o
    comentário `:67` (`// No test files currently exist in the project`) contradiz o próprio conteúdo. A
    página (`src/pages/CodeQualityDashboard.tsx:19`) apresenta isso como medição.

13. **Seis artefatos de admin completamente órfãos** (código presente, zero importadores fora do barrel
    `src/features/admin/index.ts`): `useVersionHistory.ts:20` (índice 16 do barrel), `useDataImport.ts:106`
    (índice 10), `useSavedFilters.ts` (índice 17), `reportsService.ts:3` (índice 20),
    `integrationsService.ts:4` (índice 19), e o `useFeatureFlags` DB (índice 15).

14. **`.env.example` documenta 7 variáveis que nenhum código lê**: `VITE_BITRIX_WEBHOOK_URL:15`,
    `VITE_RESEND_API_KEY:19`, `VITE_TWILIO_*:22-25` (4), `VITE_GOOGLE_MAPS_API_KEY:31`,
    `VITE_GOOGLE_ANALYTICS_ID:32`, além de `VITE_SUPABASE_PROJECT_ID:8` e `VITE_APP_DEBUG:28`. Twilio e Google
    não têm **uma única linha de código** no repositório. Em contrapartida, `VITE_VAPID_PUBLIC_KEY` **é lida**
    (`usePushSubscription.ts:41`) e não está documentada em nenhum `.env.*` — e tem fallback hardcoded.

15. **`webhook-handler` só é exercitado pelo simulador.** `src/lib/simulation.ts:114` o invoca com headers
    `X-Simulation-Mode: 'true'` (`:120`) e assinatura sintética `'sim-' + crypto.randomUUID()` (`:119`).
    Não há nenhum consumidor de produção no repo; tráfego real viria de fora ⇒ NAO_VERIFICADO.

16. **`image-optimizer` é o único stub auto-declarado**, e de forma exemplar: comentário em
    `supabase/functions/image-optimizer/index.ts:1-5` explica que a versão anterior devolvia os bytes originais
    fingindo otimizar, e agora responde `501 not_implemented` (`:15-16`).

---

## Limitações

- **Sem runtime.** Nada foi executado; não houve acesso a banco, ao Dashboard Supabase, a logs ou a produção.
  Todas as afirmações são sobre o **código versionado** neste working tree.
- **Cron/agendamento é parcialmente inauditável.** Só é possível verificar `cron.schedule` presente em
  migrations. Rotinas agendadas via Dashboard, via `supabase/config.toml` (que aqui só tem `project_id`) ou
  por um scheduler externo são invisíveis. Classificar uma function como órfã significa **"sem chamador no
  código do frontend"**, não "nunca executa".
- **Deploy das functions não verificado.** A existência de `supabase/functions/<nome>/index.ts` não implica
  que a function esteja deployada no projeto.
- **Secrets não verificados.** Não é possível saber se `RESEND_API_KEY`, `CRON_SECRET`, `BITRIX24_*`,
  `VAPID_*`, `LOVABLE_API_KEY` ou `SENTRY_DSN` estão configurados. Várias functions degradam silenciosamente
  quando ausentes (ex.: `send-email-report/index.ts:392-398` devolve preview; `cronAuth.ts:36-42` só loga um
  warning quando `CRON_SECRET` não existe e `failClosed` é falso).
- **Tabela `secrets` referenciada em SQL.** `20260508144832_...sql:10,13` lê `SELECT value FROM secrets WHERE
  name = ...`; não foi possível confirmar que essa tabela existe/está populada.
- **RLS não foi auditada neste lote** (escopo de outro lote), embora as tabelas de admin
  (`feature_flags`, `business_config`, `rate_limit_settings`, `ip_allowlist`, `geo_blocking_*`,
  `query_telemetry`) tenham `ENABLE ROW LEVEL SECURITY` nas migrations correspondentes.
- **Método de detecção de órfãos:** `grep -rn --include="*.ts" --include="*.tsx" "<nome>" src/` para cada
  function, seguido de verificação manual de cada hit para descartar falsos positivos (rotas, query keys,
  comentários) — foi assim que `ml-predictions` (18 hits, quase todos rotas `/ml-predictions`) e
  `security-alert` (2 hits, ambos a query key `'security-alerts'`) foram corretamente classificadas em
  direções opostas. A lista final foi cruzada com
  `grep -rnE "functions\.invoke\(\s*['\"\`]|edgeFunctionFetch\(\s*['\"\`]" src/`, que retorna 28 call sites
  cobrindo exatamente 15 functions distintas.
