# Lote 08 — Notificações, Alertas e Comunicação

> **Método:** auditoria estática do repositório em `/home/user/fast-grava-es-v2`.
> Nenhum acesso a runtime, banco de produção, logs de edge functions, painel Supabase
> ou variáveis de ambiente reais. Tudo que depende de configuração em runtime
> (segredos `RESEND_API_KEY`, `VAPID_*`, `CRON_SECRET`, webhooks/cron criados pelo
> Dashboard) está marcado como **NAO_VERIFICADO**.
> Os arquivos `.md` do repositório (incl. `CLAUDE.md` e `ANALISE_TECNICA_SISTEMA.md`)
> foram tratados como hipótese e conferidos contra o código — divergências estão em
> "Achados relevantes".

## Cobertura

Arquivos efetivamente lidos/inspecionados neste lote:

- `src/features/notifications/**` — 38 arquivos, ~4.443 linhas (`index.ts`, 12 hooks, 12 componentes, `types/`)
- `src/contexts/NotificationsContext.tsx`
- `src/components/alerts/**` (6 arquivos), `src/components/chat/QuickChat.tsx`, `src/components/feedback/**` (2 arquivos)
- Consumidores fora do módulo: `src/pages/NotificationsPage.tsx`, `src/pages/AlertsDashboard.tsx`, `src/pages/TPMDashboard.tsx`, `src/pages/KPIDashboard.tsx`, `src/pages/MLPredictionsDashboard.tsx`, `src/pages/Index.tsx`, `src/components/layout/{MainLayout,AppSidebar}.tsx`, `src/components/navigation/MobileNavigation.tsx`, `src/components/settings/SettingsNotificationsTab.tsx`, `src/features/maintenance/components/TPMNotification*.tsx`, `src/features/admin/components/monitoring/CronEmailPreferenceCard.tsx`, `src/features/admin/components/security/{PushNotificationSettings,SecurityAlertsPanel}.tsx`, `src/features/production/hooks/useOEEAlerts.ts`, `src/hooks/{useSmartDelayAlerts,useTechniqueCapacityAlerts,useDeviceDetection}.ts`, `src/features/jobs/hooks/usePriorityEscalation.ts`
- Edge functions: `send-push-notification`, `send-email-report`, `send-loss-risk-alert`, `cron-alert-email`, `security-alert`, `new-device-alert`, `tpm-notifications`, `send-tpm-email`, `daily-maintenance-summary`, `_shared/cronAuth.ts`
- Migrações relevantes (`supabase/migrations/`): tabelas `notifications`, `notification_preferences`, `push_subscriptions`, `push_notifications`, `kpi_alerts`, `user_notification_settings`, `tpm_notification_*`, `maintenance_alerts`, `efficiency_alert_history`, `chat_messages`, `new_device_alerts`, `spc_alerts`, `energy_alerts` + triggers/cron
- PWA/SW: `public/sw.js`, `public/manifest.json`, `src/main.tsx`, `vite.config.ts`, `package.json`
- Greps de rastreamento: `twilio|whatsapp|sms`, `resend`, `vapid|pushManager|applicationServerKey`, `functions.invoke('...')`, `cron.schedule|net.http_post|functions/v1/`, `TODO|FIXME|placeholder|simular|mock`, e um grep de consumidor por hook/componente/tabela.

**Fora de escopo (não classificados aqui):** `BIAlertsWatcher` (analytics/BI), `technical_messages` / assistente técnico (comunicação com IA, lote próprio), `spc_alerts`/`energy_alerts` (analytics).

## Inventário de funcionalidades

| Funcionalidade | Classificação | Evidência (arquivo:linha) | O que falta / observação |
|---|---|---|---|
| Tabela `push_notifications` (persistência in-app) + RLS completa (SELECT/INSERT/UPDATE/DELETE do próprio usuário) | ✅ IMPLEMENTADO_TOTAL | `supabase/migrations/20251220151304_178cd8c4-beb9-441d-81a2-3ad69b60133d.sql:14` (tabela), `:38` (SELECT), `supabase/migrations/20260306002629_536f0d67-c985-42e2-965c-1638b06db911.sql:2` (UPDATE), `:9` (DELETE), `supabase/migrations/20260712232418_e0446f80-2a29-4a50-b27c-4aaea36a5fa7.sql:63` (INSERT) | — |
| Produtores SQL de notificação in-app (triggers no banco gravando `push_notifications`) | ✅ IMPLEMENTADO_TOTAL | `supabase/migrations/20260508140524_...sql:25` + trigger `:65`; `20260723150905_...sql:16` + trigger `:40`, `:66` + trigger `:95`; `20260516172507_...sql:46`, `:93`; `20260726154437_...sql:122`,`:153`; `20260726153054_...sql:60` | Fio real UI→banco→UI existe. Cobertura por domínio é irregular (embalagem, TPM, job status, saúde de cron). |
| Badge de não-lidas (sidebar / mobile / header) | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/hooks/useNotifications.ts:79` (count) → `src/components/layout/AppSidebar.tsx:45`, `src/components/layout/MainLayout.tsx:54`, `src/components/navigation/MobileNavigation.tsx:285` | — |
| Toast em tempo real ao inserir `push_notifications` | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/hooks/useNotifications.ts:158-166` (canal realtime + `toast.info`) | Depende de Realtime habilitado na tabela — NAO_VERIFICADO. |
| Marcar como lida / marcar todas / excluir notificação | 🟨 IMPLEMENTADO_PARCIAL | mutations em `src/features/notifications/hooks/useNotifications.ts:99`, `:117`, `:138`; botões em `src/features/notifications/components/NotificationsList.tsx:86-95` | Os botões só renderizam para `id` com prefixo `push-`, mas a única página que monta `NotificationsList` gera ids `m-`/`p-`/`s-` (`src/pages/NotificationsPage.tsx:96-99`). Na prática nenhum botão de marcar/excluir aparece. Só `markAllAsRead` é acionável (`src/pages/NotificationsPage.tsx:59`,`:133`) e atua sobre linhas que a tela não exibe. |
| Página `/notifications` "Central de Notificações" | 🟨 IMPLEMENTADO_PARCIAL | rota `src/routes/AppRoutes.tsx:236`; agregação em `src/pages/NotificationsPage.tsx:96-99` (lê `maintenance_alerts`, `machine_predictions`, `daily_summaries`) | Não lê `push_notifications` — divergente do badge/contador. Duas fontes de verdade para "notificação". |
| `NotificationStatsCards` (KPIs da central) | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/components/NotificationStatsCards.tsx:1` consumido em `src/pages/NotificationsPage.tsx:142` | — |
| `NotificationCenter` (dropdown do sino, lê `push_notifications`) | ⬛ MORTO_OU_ABANDONADO | `src/features/notifications/components/NotificationCenter.tsx:18`; exportado em `src/features/notifications/index.ts:16` | `grep -rn "NotificationCenter" src/` → apenas a definição e o barrel. Nunca montado. É a única UI que exibiria linhas de `push_notifications`. |
| `NotificationCard` | ⬛ MORTO_OU_ABANDONADO | `src/features/notifications/components/NotificationCard.tsx:37` | `grep -rn "NotificationCard" src/` → só a própria definição. Nem exportado no barrel. |
| `NotificationsContext` (notificações in-app voláteis) | ⬛ MORTO_OU_ABANDONADO | provider montado em `src/providers/AppProviders.tsx:67`; store em `src/contexts/NotificationsContext.tsx:26` | **Write-only.** `grep -rn "useNotificationsContext()" src/` → 4 chamadores, **todos usando só `add`** (`InAppNotificationWatcher.tsx:19`, `useSmartDelayAlerts.ts:18`, `usePriorityEscalation.ts:18`, `useTechniqueCapacityAlerts.ts:23`). Nenhum componente lê `notifications`/`unreadCount`. |
| `InAppNotificationWatcher` (job status / eficiência / manutenção → contexto) | 🟨 IMPLEMENTADO_PARCIAL | montado em `src/providers/AppProviders.tsx:100`; `src/features/notifications/components/InAppNotificationWatcher.tsx:38`,`:79`,`:90` | Produz para o contexto sem leitor (linha acima) e sem persistência. Alertas somem sem erro visível. |
| `SmartAlertsWatcher` (atraso inteligente / escalonamento / capacidade) | 🟨 IMPLEMENTADO_PARCIAL | montado em `src/providers/AppProviders.tsx:101`; `src/features/notifications/components/SmartAlertsWatcher.tsx:9-11`; `src/hooks/useSmartDelayAlerts.ts:41`, `src/hooks/useTechniqueCapacityAlerts.ts:71`, `src/features/jobs/hooks/usePriorityEscalation.ts:68` | Mesmo destino morto. Esses 3 hooks **não emitem toast**, só `add()` — silêncio total na UI. |
| `ToastWithUndo` / `ToastContainer` + API global `toast`/`showToast` | ⬛ MORTO_OU_ABANDONADO | container montado em `src/components/design-system/ProductDesignProvider.tsx:54` (via `src/providers/AppProviders.tsx:50`); API em `src/features/notifications/components/ToastWithUndo.tsx:363`,`:373` | `grep -rn "showToast\|__toastManager" src/` fora do próprio arquivo → nenhum produtor. O app inteiro usa `sonner`. 440 linhas montadas e nunca alimentadas. |
| `FeedbackProvider` / `useFeedback` | ⬛ MORTO_OU_ABANDONADO | provider montado em `src/providers/AppProviders.tsx:78`; hook em `src/components/feedback/FeedbackProvider.tsx:108` | `grep -rn "useFeedback" src/` → zero consumidores fora do arquivo. |
| `CelebrationMoment` / `MiniCelebration` (`components/feedback/`) | ⬛ MORTO_OU_ABANDONADO | `src/components/feedback/CelebrationMoment.tsx:117`,`:238`,`:275` | Zero importadores. Duplicata do sistema vivo `src/components/ui/celebration.tsx:165` (esse sim montado em `AppProviders.tsx:77`). |
| Sons de alerta (WebAudio, sem arquivos externos) | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/hooks/useNotificationSounds.ts:29-70` (osciladores) consumido em `NotificationIntegrator.tsx:70`, `useTPMNotifications.ts:50`, `useOEEAlerts.ts:19`, `src/pages/NotificationsPage.tsx:58` | Toggle exposto em `src/components/settings/SettingsNotificationsTab.tsx:48`. |
| Alertas de meta de operador (`useGoalAlerts`) | ✅ IMPLEMENTADO_TOTAL | cálculo `src/features/notifications/hooks/useGoalAlerts.ts:43-118`; toast `:117-146`; UI `src/components/operators/GoalAlertsWidget.tsx:112`; `src/pages/KPIDashboard.tsx:80` | Canal = toast in-app apenas; não persiste. Coerente com o escopo declarado. |
| Alertas de eficiência/gargalo + histórico (`useEfficiencyNotifications`) | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/hooks/useEfficiencyNotifications.ts:88` (`recordAlert` → `efficiency_alert_history`), toast `:110`; auto-resolve `:34`; provider `src/providers/AppProviders.tsx:74`; UI `src/pages/AlertsDashboard.tsx:62` | Tabela em `supabase/migrations/20251213112509_...sql:2`. |
| Resumo diário de manutenção (`daily-maintenance-summary`) | ✅ IMPLEMENTADO_TOTAL | hook `src/features/notifications/hooks/useDailySummaryNotifications.ts:51` → function `supabase/functions/daily-maintenance-summary/index.ts:23`; auth `:28`; UI `src/features/notifications/components/DailySummaryCard.tsx:17` montada em `src/pages/Index.tsx:512` | Único edge function de notificação com chamador de frontend confirmado além de `send-push-notification`. |
| Alertas OEE/KPI (`useOEEAlerts` → RPC → `kpi_alerts`) | 🟨 IMPLEMENTADO_PARCIAL | `src/features/production/hooks/useOEEAlerts.ts:70` (RPC `check_and_notify_kpi_alert`); função `supabase/migrations/20260516174623_...sql:23`; tabela `:2` | **Tabela write-only.** `grep -rn "kpi_alerts" src/` → só `src/integrations/supabase/types.ts:1523`. Nenhuma tela lê os alertas persistidos; só o toast/Notification efêmero sobrevive. |
| Alertas TPM em tempo real (`maintenance_alerts` → Notification) | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/hooks/useTPMNotifications.ts:235` (realtime) → `:54` (`sendMaintenanceNotification`); montado por `src/pages/TPMDashboard.tsx:57` e `NotificationIntegrator.tsx:155` | Entrega usa `new Notification()` local (aba aberta), não Web Push — ver seção de canais. |
| Alertas de predição ML (`machine_predictions` → Notification) | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/hooks/useMLPredictionNotifications.ts:194` (realtime) → `:73`; montado em `src/pages/MLPredictionsDashboard.tsx:28`; settings `src/components/ml/MLNotificationSettings.tsx:29` | Mesma limitação de canal. |
| Notificação de desvio de parâmetro TPM (trigger de banco) | ✅ IMPLEMENTADO_TOTAL (in-app) / 🟨 (e-mail) | `supabase/migrations/20260508140524_...sql:25` (grava `push_notifications`), `:39` (enfileira e-mail), trigger `:65` | O ramo in-app fecha o fio. O ramo e-mail depende da fila abaixo, que não envia. |
| Fila de notificação TPM (`tpm_notification_queue`) | 🟨 IMPLEMENTADO_PARCIAL | produtor `supabase/migrations/20260508140524_...sql:39`; consumidor `supabase/functions/tpm-notifications/index.ts:56-104`; UI `src/features/maintenance/components/TPMNotificationQueue.tsx:24` | **O consumidor não envia nada.** `supabase/functions/tpm-notifications/index.ts:69` diz literalmente `// Simular envio` e `:71` `// Aqui chamaria o provedor de Email ou WhatsApp`, e mesmo assim marca `status: 'sent'` (`:75`). Além disso a function não tem agendador: `grep -rn "tpm-notifications" src/ supabase/` fora do próprio diretório → 0 resultados. |
| Logs de notificação TPM (`tpm_notification_logs`) | 🟨 IMPLEMENTADO_PARCIAL | escrita `supabase/functions/tpm-notifications/index.ts:81` e `src/features/notifications/hooks/useTPMNotifications.ts:204`; leitura `src/features/maintenance/components/TPMNotificationLogs.tsx:20` | Grava `status: 'success'` sem que envio algum tenha ocorrido — o painel de logs reporta sucesso falso. |
| Teste de notificação TPM por canal (email/whatsapp/push) | 🟨 IMPLEMENTADO_PARCIAL | `src/features/notifications/hooks/useTPMNotifications.ts:166-232`; UI `src/features/maintenance/components/TPMNotificationSettings.tsx:45` | Para `email` e `whatsapp` só grava log (`:203`) e mostra `toast.success(...)` (`:225`). Nenhuma chamada de envio. Só `push` faz algo (`:217` → `new Notification` local). |
| Templates de notificação TPM (CRUD + publicação) | 🟨 IMPLEMENTADO_PARCIAL | tabelas `supabase/migrations/20260508121901_...sql:2` e `20260508122318_...sql:7`; CRUD `src/features/maintenance/components/TPMNotificationTemplates.tsx:33`,`:44`,`:61`,`:68` | Nenhum remetente lê os templates: `grep -rn "tpm_notification_templates" supabase/functions/` → 0. Conteúdo dos e-mails é HTML fixo dentro das functions. |
| Preferências TPM (localStorage) | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/hooks/useTPMNotifications.ts:25-41`, aplicadas em `:55-65`; UI `TPMNotificationSettings.tsx:40` | — |
| Preferências ML (localStorage) | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/hooks/useMLPredictionNotifications.ts:44`; aplicadas `:76-89`; UI `src/components/ml/MLNotificationSettings.tsx:29` | — |
| `user_notification_settings` (tabela + UI + consumo server-side) | ✅ IMPLEMENTADO_TOTAL | tabela `supabase/migrations/20260508115841_...sql:2`; hook `src/features/notifications/hooks/useNotificationSettings.ts:29`,`:58`; UI `TPMNotificationSettings.tsx:41`; consumo `supabase/functions/send-loss-risk-alert/index.ts:66`, `send-tpm-email/index.ts:45`, `cron-alert-email/index.ts:142`, trigger `20260508140524_...sql:19` | Única tabela de preferência realmente lida pelo backend. |
| Opt-out de e-mail de rotinas cron (`CronEmailPreferenceCard`) | 🟨 IMPLEMENTADO_PARCIAL | UI `src/features/admin/components/monitoring/CronEmailPreferenceCard.tsx:17`,`:24`; leitura server-side `supabase/functions/cron-alert-email/index.ts:141-156` | A preferência é gravada corretamente, mas a function que a consome não tem agendador no repositório (ver canal E-mail). |
| `useNotificationPreferences` (DND, digest, canais por categoria) | ⬛ MORTO_OU_ABANDONADO | `src/features/notifications/hooks/useNotificationPreferences.ts:81`; exportado em `src/features/notifications/index.ts:5` | `grep -rn "useNotificationPreferences" src/` → só a definição e o barrel. Pior: usa `STORAGE_KEY = 'notification-preferences'` (`:79`), **a mesma chave** que `NotificationIntegrator.tsx:40` lê com formato incompatível (`{delayedJobs, lowBuffer,...}` vs `{categories, dnd,...}`). Se algum dia for ligado, quebra o integrator. |
| Tabelas `notifications` e `notification_preferences` (migração 2024-12-24) | 🟦 SUGERIDO_OU_INICIADO | `supabase/migrations/20241224000001_notifications.sql:6`, `supabase/migrations/20241224000002_notification_preferences.sql:5` | Zero referências no código: `grep -rn "notification_preferences" src/ supabase/functions/` → só chaves de localStorage homônimas. E **não aparecem em `src/integrations/supabase/types.ts`** (que só tem `push_notifications:3430`, `push_subscriptions:3469`, `user_notification_settings:5814`, `kpi_alerts:1523`, `chat_messages:410`) — indício forte de que as migrações nunca foram aplicadas ao schema real. Schema mais rico (canais, DND, digest, agrupamento) que o efetivamente usado. |
| RPCs `mark_notification_read` / `mark_all_notifications_read` | 🟦 SUGERIDO_OU_INICIADO | `supabase/migrations/20241224000002_notification_preferences.sql:35`,`:43` | Operam sobre a tabela `notifications` morta. `grep -rn "mark_notification_read" src/` → 0. |
| Alerta de novo dispositivo (segurança) | ✅ IMPLEMENTADO_TOTAL | UI `src/hooks/useDeviceDetection.ts:104` → `supabase/functions/new-device-alert/index.ts:135` (grava `new_device_alerts`), `:166` (Resend), `:281` (encadeia push); painel `src/features/admin/components/security/SecurityAlertsPanel.tsx:45` | Fio mais completo do lote: UI → function → persistência → e-mail real → push. |
| Chat rápido operacional (`QuickChat`) | ✅ IMPLEMENTADO_TOTAL | UI `src/components/chat/QuickChat.tsx:101`; leitura `:40`; insert `:79`; realtime `:52-66`; tabela+RLS `supabase/migrations/20260317212106_...sql:3`,`:32-34`; montado em `src/pages/Index.tsx:521` | Sem paginação (limit 100) e sem notificação de mensagem nova — mas o fio fecha. |
| Dashboard de alertas operacionais (`/alerts`) | ✅ IMPLEMENTADO_TOTAL | `src/pages/AlertsDashboard.tsx:130`,`:140`; componentes `src/components/alerts/{AlertStatsGrid,AlertJobCard,AlertSpecialCards,AlertViewAllModals}.tsx` | — |
| `AlertCard` (`components/alerts/AlertCard.tsx`) | ⬛ MORTO_OU_ABANDONADO | `src/components/alerts/AlertCard.tsx:1` | `grep -rn "alerts/AlertCard" src/` → 0 importadores. Existem dois `AlertCard` locais homônimos vivos (`src/components/dashboard/BottleneckWidget.tsx:45`, `SecurityAlertsPanel.tsx:131`), que não são este. |
| `AlertSummaryStats` | ⬛ MORTO_OU_ABANDONADO | `src/components/alerts/AlertSummaryStats.tsx:17` | `grep -rn "AlertSummaryStats" src/` → só a definição. Substituído por `AlertStatsGrid`. |
| `PushNotificationManager` (painel de gestão de push) | ⬛ MORTO_OU_ABANDONADO | `src/features/notifications/components/PushNotificationManager.tsx:28`; barrel `index.ts:19` | `grep -rn "PushNotificationManager" src/` → só definição e barrel. 254 linhas nunca montadas. |
| `NotificationIntegrator` (job status / eficiência → Notification + som) | 🟨 IMPLEMENTADO_PARCIAL | montado em `src/components/layout/MainLayout.tsx:235`; `src/features/notifications/components/NotificationIntegrator.tsx:80`,`:125` | Todo o corpo é guardado por `permissionRef.current !== 'granted'` (`:81`,`:126`). Como o fluxo de ativação não assina push (ver canal Web Push), o caminho realista é o usuário conceder permissão manualmente pelo navegador; caso contrário nada dispara e nada loga. |
| `RealtimeNotificationsProvider` | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/components/RealtimeNotificationsProvider.tsx:5` → `useRealtimeResetRequests`; montado `src/providers/AppProviders.tsx:75` | Nome enganoso: só cuida de pedidos de reset de senha. |
| `EfficiencyNotificationProvider` | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/components/EfficiencyNotificationProvider.tsx:6-7`; montado `src/providers/AppProviders.tsx:74` | — |
| Teste unitário de notificações | 🟨 IMPLEMENTADO_PARCIAL | `src/features/notifications/hooks/useNotifications.test.ts:1` (82 linhas) | Único teste do domínio inteiro (~4.4k linhas). Nenhum teste para push, e-mail, fila TPM ou watchers. |

## Canais de entrega (push, e-mail, SMS, WhatsApp, in-app)

| Canal | Classificação | Evidência | Segredo/config | Produtor real? |
|---|---|---|---|---|
| **In-app persistido** (`push_notifications` + realtime + badge) | ✅ IMPLEMENTADO_TOTAL | tabela `20251220151304_...sql:14`; leitura `src/features/notifications/hooks/useNotifications.ts:38`,`:79`; realtime+toast `:158`; badge `AppSidebar.tsx:45` | nenhum | **Sim** — triggers de banco (`20260508140524_...sql:25`, `20260723150905_...sql:16`/`:66`, `20260516172507_...sql:46`/`:93`, `20260726154437_...sql:122`/`:153`) e `supabase/functions/cron-alert-email/index.ts:213`. |
| **In-app volátil** (`NotificationsContext`) | ⬛ MORTO_OU_ABANDONADO | `src/contexts/NotificationsContext.tsx:26`; 4 produtores via `add()` (`InAppNotificationWatcher.tsx:19` etc.) | nenhum | Sim, 4 produtores — **mas nenhum consumidor de leitura**. Canal termina em memória descartada. |
| **Toast (sonner)** | ✅ IMPLEMENTADO_TOTAL | `useGoalAlerts.ts:117`, `useEfficiencyNotifications.ts:110`, `useNotifications.ts:164`, `useTPMNotifications.ts:225` | nenhum | Sim. É o canal que de fato chega ao usuário hoje. |
| **Toast com Undo** (`ToastWithUndo`) | ⬛ MORTO_OU_ABANDONADO | container `ProductDesignProvider.tsx:54`; API `ToastWithUndo.tsx:373` | nenhum | **Não** — nenhum chamador de `showToast`/`toast.*` desse módulo. |
| **Notification API local (aba aberta)** | 🟨 IMPLEMENTADO_PARCIAL | `src/features/notifications/hooks/usePushNotifications.ts:126` (`new Notification(...)`) | permissão do browser | Sim — é o que `useTPMNotifications`, `useMLPredictionNotifications`, `useOEEAlerts`, `NotificationIntegrator` e `useDailySummaryNotifications` realmente usam. **Não é push:** só funciona com a aplicação aberta. O hook chama-se `usePushNotifications` e não possui método `subscribe` (só `unsubscribe`, `:202`) — nomenclatura enganosa. |
| **Web Push (browser fechado)** | 🟨 IMPLEMENTADO_PARCIAL | SW `public/sw.js:93` (handler `push`), `:141` (`showNotification`), `:146` (`notificationclick`); registro `src/main.tsx:54` (**só em PROD**); assinatura `usePushSubscription.ts:101`; envio `supabase/functions/send-push-notification/index.ts:118` | `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` no servidor (`send-push-notification/index.ts:154-156`); `VITE_VAPID_PUBLIC_KEY` no cliente (`usePushSubscription.ts:41`) — **nenhuma dessas variáveis está no `.env.example`** | Parcial. Ver os 5 defeitos listados em "Achados" (payload não criptografado, chaves VAPID divergentes/demo, prompt que não assina, fallback que conta sucesso falso, SW não registrado em dev). |
| **E-mail (Resend)** | 🟨 IMPLEMENTADO_PARCIAL | `new-device-alert/index.ts:166` (SDK `resend@2.0.0`, `:2`); `send-loss-risk-alert/index.ts:138`; `send-email-report/index.ts:339`; `cron-alert-email/index.ts:190`; `send-tpm-email/index.ts:108` | `RESEND_API_KEY` lido de `Deno.env` em todas (ex. `cron-alert-email/index.ts:108`). `.env.example:20` documenta `VITE_RESEND_API_KEY` — variável **de frontend, nunca lida por nenhum código** (`grep VITE_RESEND` em `src/` → 0) | **Só 1 das 5 tem produtor confirmado no repo:** `new-device-alert` (chamada de `src/hooks/useDeviceDetection.ts:104`). As outras 4 estão sem chamador — detalhe por function abaixo. Todas degradam silenciosamente sem a chave (ex. `cron-alert-email/index.ts:210` só loga e marca envio). |
| ↳ `send-loss-risk-alert` | 🟨 IMPLEMENTADO_PARCIAL | function `supabase/functions/send-loss-risk-alert/index.ts:100`; trigger `supabase/migrations/20260508144832_...sql:26` sobre `tpm_execution_alerts` | `RESEND_API_KEY`, `CRON_SECRET` | Trigger existe, mas: (a) lê `SELECT value FROM secrets` (`:9`,`:12`) e a tabela `secrets` **nunca é criada em nenhuma migração** (`grep -rn "\bsecrets\b" supabase/migrations/` → só esses 2 usos); (b) envia `Authorization: Bearer <service_role_key>`, enquanto a function exige `CRON_SECRET` fail-closed (`index.ts:27` → `_shared/cronAuth.ts:47`) — rejeita 401 salvo se `CRON_SECRET == service_role_key`. NAO_VERIFICADO em runtime. |
| ↳ `send-email-report` | ⬛ MORTO_OU_ABANDONADO | `supabase/functions/send-email-report/index.ts:339` (412 linhas, RBAC coordinator/admin em `:56`) | `RESEND_API_KEY` | **Nenhum.** `grep -rn "send-email-report" src/ supabase/` fora do diretório → 0. A UI que menciona Resend é decorativa: `src/components/settings/SettingsBackupTab.tsx:33` (`status: 'Configurar', connected: false`). |
| ↳ `cron-alert-email` (rotinas cron falhando/silenciosas) | 🟨 IMPLEMENTADO_PARCIAL | `supabase/functions/cron-alert-email/index.ts:190` (envio), `:213` (dedupe + in-app), opt-out `:141` | `RESEND_API_KEY`, `CRON_SECRET` (fail-closed `:94`) | Lógica completa e cuidadosa (dedupe 6 h, destinatários por role, opt-out), **mas sem agendador no repo**: o único `cron.schedule` presente é `20260726161334_...sql:77` (`rollup_cron_p95_daily`). Agendamento externo/Dashboard = NAO_VERIFICADO. |
| ↳ `send-tpm-email` | 🟦 SUGERIDO_OU_INICIADO | `supabase/functions/send-tpm-email/index.ts:108` | `RESEND_API_KEY` | **Trigger comentado**: `supabase/migrations/20260508115941_...sql:51-54` (`-- CREATE TRIGGER on_maintenance_alert_insert`). A URL da function é hardcoded para outro projeto (`:39` → `whnnzdreuwxczxelvqjh.supabase.co`) e o header usa `current_setting('app.settings.service_role_key')`. Nunca invocada. |
| **SMS (Twilio)** | 🟦 SUGERIDO_OU_INICIADO | `.env.example:23-25` (`VITE_TWILIO_ACCOUNT_SID`, `VITE_TWILIO_AUTH_TOKEN`, `VITE_TWILIO_PHONE_NUMBER`); coluna `sms_enabled` em `supabase/migrations/20241224000002_notification_preferences.sql:9` | apenas variáveis documentadas | **Não.** `grep -rin "twilio" src/ supabase/` → **0 ocorrências**. Não existe uma linha de código de envio de SMS. A tabela que teria `sms_enabled` também é morta. |
| **WhatsApp** | 🟦 SUGERIDO_OU_INICIADO | `.env.example:26` (`VITE_TWILIO_WHATSAPP_NUMBER`); UI `src/features/maintenance/components/TPMNotificationSettings.tsx:169-174`; templates `TPMNotificationTemplates.tsx:170`; coluna `whatsapp_enabled`/`whatsapp_number` em `20260508115841_...sql` e hook `useNotificationSettings.ts:11-12` | apenas variáveis documentadas | **Não.** Zero código de integração (`grep -rin "twilio" src/ supabase/` → 0). O único caminho "WhatsApp" é `useTPMNotifications.ts:183`, que apenas **filtra destinatários e grava log de sucesso** (`:203`) sem enviar, e a fila `tpm-notifications/index.ts:71` que declara `// Aqui chamaria o provedor de Email ou WhatsApp`. A UI promete "Alertas críticos via WhatsApp Business" (`TPMNotificationSettings.tsx:170`). |
| **Sonoro (WebAudio)** | ✅ IMPLEMENTADO_TOTAL | `src/features/notifications/hooks/useNotificationSounds.ts:29-70` | nenhum | Sim, 4+ consumidores. |
| **Chat interno (`chat_messages`)** | ✅ IMPLEMENTADO_TOTAL | `src/components/chat/QuickChat.tsx:79` (insert), `:52` (realtime), `:40` (histórico) | nenhum | Sim. |

## Achados relevantes

### 1. Web Push nunca entrega payload legível — o corpo não é criptografado
`supabase/functions/send-push-notification/index.ts:118-128` faz `POST` no endpoint com
`Content-Encoding: aes128gcm` (`:123`) mas envia `new TextEncoder().encode(payload)` (`:127`),
ou seja **texto puro**. O protocolo Web Push (RFC 8291) exige criptografia ECDH/HKDF com as
chaves `p256dh`/`auth` da subscription — que são lidas do banco (`:16-17`) e **nunca usadas**.
O JWT VAPID é montado corretamente (`:69-109`), mas o corpo não. Consequência: o serviço de
push rejeita ou o Service Worker cai no `catch` de `event.data.json()` (`public/sw.js:116`) e
mostra o texto genérico *"Fast Grava / Nova notificação"* (`:95-96`). NAO_VERIFICADO em runtime.

### 2. Três chaves VAPID diferentes, uma delas é a chave-demo pública do Google
- `src/features/notifications/hooks/usePushSubscription.ts:21` → `BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U` (chave de exemplo amplamente publicada em tutoriais)
- `src/features/notifications/hooks/useWebPushNotifications.ts:15` → outra chave hardcoded, **diferente**
- servidor → `VAPID_PUBLIC_KEY` do ambiente (`send-push-notification/index.ts:154`)

Dois hooks concorrentes assinam com chaves distintas na mesma tabela `push_subscriptions`.
Nenhuma delas casa com a chave privada do servidor, salvo coincidência. `VITE_VAPID_PUBLIC_KEY`
(`usePushSubscription.ts:41`) **não está documentada no `.env.example`**.

### 3. O prompt de ativação de push não assina o dispositivo
`src/App.tsx:16` monta `<PushNotificationPrompt delay={15000} />`. O handler de aceite
(`src/features/notifications/components/PushNotificationPrompt.tsx:69`) chama apenas
`requestPermission()` de `usePushNotifications`, hook que **não possui `subscribe`**
(`usePushNotifications.ts:226-240`) e nunca escreve em `push_subscriptions`. O usuário
concede permissão, o botão some (`isSubscribed` vem de `push_subscriptions`,
`usePushNotifications.ts:65-73`)... e nenhuma subscription é criada. O único caminho que
assina de verdade está enterrado em **Configurações → Notificações**
(`src/components/settings/SettingsNotificationsTab.tsx:33` → `usePushSubscription.subscribe`).

### 4. Sem VAPID configurado, o envio de push reporta sucesso falso
`supabase/functions/send-push-notification/index.ts:277-281`: quando `VAPID_*` está ausente,
loga `[VAPID not configured] Would send to: ...` e **incrementa `successCount++`**. A resposta
(`:315-321`) devolve `sent: N` e a notificação é marcada `status: 'sent'` (`:306`). O frontend
só percebe porque também checa `data?.vapid_configured === false` (`usePushSubscription.ts:192`) —
mas `useWebPushNotifications.sendTestNotification` (`:192-203`) **não checa** e mostra
`toast.success('Notificação de teste enviada!')` incondicionalmente.

### 5. Twilio (SMS/WhatsApp) não existe — é só variável de ambiente
`grep -rin "twilio" src/ supabase/` retorna **zero** linhas. As 4 variáveis em
`.env.example:23-26` e o `CLAUDE.md` prometem SMS e WhatsApp; o código nunca chamou a API.
Pior, a UI já expõe o canal como se funcionasse:
`src/features/maintenance/components/TPMNotificationSettings.tsx:169-174` ("Alertas críticos
via WhatsApp Business"), com aba de template dedicada (`TPMNotificationTemplates.tsx:170`),
e o teste de canal grava log `status: 'success'` (`useTPMNotifications.ts:203-225`) sem enviar.
**É a classe exata de "feature dormente que falha sem erro visível"** — o operador vê log verde.

### 6. `tpm-notifications` marca a fila como enviada sem enviar, e ninguém a agenda
`supabase/functions/tpm-notifications/index.ts:69` (`// Simular envio`), `:71`
(`// Aqui chamaria o provedor de Email ou WhatsApp`), `:74-77` (`status: 'sent'`),
`:81-88` (log `status: 'success'`). Além disso a function é fail-closed por `CRON_SECRET`
(`:13`) e **não tem nenhum agendador** — `grep -rn "tpm-notifications" src/ supabase/` fora
do diretório → 0. Na prática a fila alimentada pelo trigger
`20260508140524_...sql:39` cresce indefinidamente ou, se a function for chamada manualmente,
é zerada com falso sucesso.

### 7. Todas as notificações in-app "smart" caem em um contexto sem leitor
`NotificationsProvider` (`src/providers/AppProviders.tsx:67`) recebe `add()` de 4 produtores
(`InAppNotificationWatcher.tsx:19`, `useSmartDelayAlerts.ts:18`, `usePriorityEscalation.ts:18`,
`useTechniqueCapacityAlerts.ts:23`) e **nenhum componente lê `notifications`/`unreadCount`**
(`grep -rn "useNotificationsContext()" src/` → só os 4 `add`). O componente que exibiria isso,
`NotificationCenter` (`src/features/notifications/components/NotificationCenter.tsx:18`), lê
`push_notifications` (fonte diferente) e **nunca é montado**. Três dos quatro produtores nem
emitem toast — a detecção de atraso inteligente, o escalonamento de prioridade e o alerta de
capacidade de técnica rodam a cada evento e desaparecem sem rastro.

### 8. Duas fontes de verdade para "notificação" divergem na tela
O badge do sino conta `push_notifications` (`useNotifications.ts:79`), mas a página
`/notifications` monta uma lista de `maintenance_alerts` + `machine_predictions` +
`daily_summaries` (`src/pages/NotificationsPage.tsx:96-99`). O botão "Marcar lidas"
(`:133` → `markAllAsRead`) zera o badge sem alterar nada do que está na tela; e os botões
individuais de marcar/excluir de `NotificationsList.tsx:86,91` só renderizam para ids
`push-*`, que essa página nunca produz — ficam permanentemente invisíveis.

### 9. Migração de notificações de 2024-12-24 aparentemente nunca foi aplicada
`supabase/migrations/20241224000001_notifications.sql:6` e
`20241224000002_notification_preferences.sql:5` criam um sistema bem mais completo
(canais por categoria, DND, digest, agrupamento, `delivery_status`) que **não aparece em
`src/integrations/supabase/types.ts`** (arquivo gerado a partir do schema real; ele contém
`push_notifications:3430`, `push_subscriptions:3469`, `user_notification_settings:5814`,
`kpi_alerts:1523`, `chat_messages:410`, mas nenhuma entrada `notifications:` ou
`notification_preferences:`). O RPC `mark_notification_read`
(`20241224000002_...sql:35`) também não tem chamador. NAO_VERIFICADO no banco real.

### 10. `kpi_alerts` é uma tabela write-only
`src/features/production/hooks/useOEEAlerts.ts:70` chama o RPC
`check_and_notify_kpi_alert` (`20260516174623_...sql:23`) a cada alerta de OEE. Nenhuma tela
lê a tabela — `grep -rn "kpi_alerts" src/` só encontra `types.ts:1523`. Além disso a policy de
SELECT usa `has_role(..., 'admin')` / `'manager'` (`20260516174623_...sql:16-19`) e a própria
migração `20260620000001_optimize_rls_select_auth_uid.sql:820` comenta *"usa 'admin' que pode
não existir no enum"*.

### 11. Segredos e project-refs hardcoded / inconsistentes nas migrações
- `20260508115941_...sql:39` → `https://whnnzdreuwxczxelvqjh.supabase.co/functions/v1/send-tpm-email`
- `20260512110942_...sql:47` → `https://xxroejpvloldkmqdydar.supabase.co/functions/v1/auto-promote-jobs`

Dois project-refs diferentes, ambos hardcoded, nenhum coincidindo com o outro. Confirma o
apontamento de "hardcoded webhook URLs" do `ANALISE_TECNICA_SISTEMA.md`. Somado à tabela
`secrets` inexistente (achado 5 do canal e-mail), os triggers HTTP do banco são frágeis.

### 12. Código morto de peso no domínio
Somando os itens ⬛ deste lote: `NotificationCenter` (181 l.), `PushNotificationManager` (254 l.),
`ToastWithUndo` (440 l., montado mas sem produtor), `useNotificationPreferences` (197 l.),
`CelebrationMoment` (302 l.), `FeedbackProvider` (187 l., montado sem consumidor),
`NotificationCard` (72 l.), `AlertCard` + `AlertSummaryStats`, `send-email-report` (412 l.),
`security-alert` (78 l., sem chamador — `grep -rn "security-alert" src/ supabase/` fora do
diretório → 0). **≈ 2.100 linhas** sem caminho de execução.

### 13. Divergências entre documentação e código
- `CLAUDE.md` diz *"PWA via `vite-plugin-pwa`"*. O plugin está em `package.json:104` mas
  **não é usado em `vite.config.ts`** (nenhuma menção a `VitePWA`); o SW é registrado à mão
  em `src/main.tsx:54` e o manifesto é o estático `public/manifest.json`.
- `src/main.tsx:51` registra o SW **apenas quando `import.meta.env.PROD`** — em desenvolvimento,
  `navigator.serviceWorker.ready` nunca resolve e `usePushSubscription`/`useWebPushNotifications`
  ficam pendurados indefinidamente (o próprio comentário `:49-50` reconhece a dependência).
- `.env.example:20` documenta `VITE_RESEND_API_KEY` (frontend), mas as functions leem
  `RESEND_API_KEY` do ambiente Deno. A variável `VITE_` não é lida por nenhum código.

## Limitações

- **Runtime: NAO_VERIFICADO.** Sem acesso a banco, logs, Dashboard Supabase ou variáveis de
  ambiente reais. Não é possível afirmar se `VAPID_*`, `RESEND_API_KEY` ou `CRON_SECRET` estão
  configurados, se as tabelas `notifications`/`notification_preferences`/`secrets` existem no
  schema real, nem se há Database Webhooks / `cron.schedule` criados **fora das migrações**
  (pelo Dashboard) invocando `cron-alert-email`, `tpm-notifications`, `send-email-report` ou
  `send-tpm-email`. Todas as classificações de "sem produtor" valem **para o que está versionado**.
- Os achados sobre criptografia de Web Push (achado 1) e sobre casamento de chaves VAPID
  (achado 2) são conclusões de leitura de código, não de teste de entrega real.
- `src/integrations/supabase/types.ts` é arquivo gerado; usei sua ausência de entradas como
  **indício** (não prova) de que uma migração não foi aplicada — o arquivo pode estar defasado.
- Não auditei o conteúdo/HTML dos e-mails linha a linha, apenas o caminho de envio, o segredo
  usado e a existência de produtor.
- `BIAlertsWatcher`, `spc_alerts`, `energy_alerts` e o assistente técnico (`technical_messages`)
  foram deliberadamente deixados para os lotes de analytics/IA.
