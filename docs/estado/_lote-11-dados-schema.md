# Lote 11 — Camada de Dados (schema, RLS, RPCs, cron)

> Auditoria de estado do repositório `fast-grava-es-v2`, domínio **camada de dados**:
> `supabase/migrations/` (216 arquivos, ~1,1 MB de SQL) + `src/integrations/supabase/types.ts` (6.273 linhas).
> Data da auditoria: 2026-08-16. Escopo: **apenas o que está no repositório**.

---

## Método

Este lote foi produzido **em altitude, por extração automatizada (grep/ripgrep + parsing com Python)**, e
**não** por leitura linha a linha das ~12 mil linhas de SQL. O volume (216 migrations) está muito acima do
teto de contexto de uma leitura integral.

Técnicas usadas:

1. **Inventário por objeto**: regex sobre `CREATE TABLE`, `CREATE [OR REPLACE] FUNCTION`, `CREATE TRIGGER`,
   `CREATE [OR REPLACE] VIEW`, `CREATE POLICY`, `DROP POLICY`, `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`,
   `CREATE INDEX`, `cron.schedule`.
2. **Atribuição de origem**: cada objeto foi mapeado para o **primeiro** arquivo de migration em que aparece
   (ordenação lexicográfica dos nomes, que coincide com a ordem cronológica do timestamp).
3. **Consumo pelo código**: para cada tabela, busca por `.from('<tabela>')` / `.from("<tabela>")` em
   `src/**` e `supabase/functions/**` (`.ts`/`.tsx`), com uma segunda passada "solta" (qualquer ocorrência
   entre aspas) para descartar falsos negativos. Ocorrências em `src/integrations/supabase/types.ts` foram
   **excluídas** — o arquivo de tipos gerado cita todas as tabelas e não prova uso.
4. **Sobrevivência de policies**: parser que casa cada `CREATE POLICY <nome> ON <tabela>` com `DROP POLICY`
   e recriações posteriores do mesmo par (nome, tabela), para separar policies permissivas **historicamente
   criadas** das que **permanecem vigentes ao final da cadeia de migrations**.
5. **Drift repo↔tipos**: comparação de conjuntos entre as chaves de `Database['public']['Tables']` /
   `['Functions']` / `['Views']` em `types.ts` e os objetos criados no SQL.

**Os arquivos `.md` do repositório (`ANALISE_TECNICA_SISTEMA.md`, `docs/ARCHITECTURE.md`, etc.) não foram
usados como fonte de verdade.** Todas as afirmações abaixo têm como evidência um arquivo de migration e um
nome de objeto de banco, ou um arquivo:linha de código.

---

## Inventário de tabelas

**135 tabelas** criadas via `CREATE TABLE` nas migrations (todas em `public`, exceto policies de
`storage.objects`, que não é criada aqui).

Legenda da coluna **Classificação**:

- 🟩 **Consumida** — existe pelo menos um `.from('<tabela>')` em `src/` ou `supabase/functions/`.
- 🟦 **Dormente (candidata)** — tabela criada, com RLS e policies, mas **nenhum** consumidor no código.
  Forte candidata a feature dormente / abandonada / nunca finalizada.

| Tabela | Migration de origem | Consumida no código? | Classificação |
|---|---|---|---|
| abc_activities | 20251214172445_732b0e77….sql:2 | src/hooks/abc/useABCData.ts:15 | 🟩 |
| abc_activity_rates | 20251214172445_732b0e77….sql:26 | src/hooks/abc/useABCMutations.ts:140 | 🟩 |
| abc_cost_pools | 20251214172445_732b0e77….sql:14 | src/hooks/abc/useABCMutations.ts:161 | 🟩 |
| abc_job_costs | 20251214172445_732b0e77….sql:39 | src/hooks/abc/useABCMutations.ts:37 | 🟩 |
| audit_log | 20260421004919_c11aeb06….sql:9 | src/features/admin/hooks/useAuditTrail.ts:20 | 🟩 |
| bitrix24_field_mappings | 20251213161533_f8bdeca4….sql:2 | src/features/admin/services/integrationsService.ts:16 | 🟩 |
| bitrix24_oauth_tokens | 20251213154910_d0453ca8….sql:2 | supabase/functions/bitrix24-sync/index.ts:38 | 🟩 |
| bitrix24_sync_history | 20251213150343_4a663971….sql:2 | src/features/admin/services/integrationsService.ts:6 | 🟩 |
| blocked_ips | 20251231115823_134f6d49….sql:16 | src/features/admin/hooks/useRateLimitLogs.ts:78 | 🟩 |
| business_config | 20260513191106_46eb83ce….sql:1 | src/features/admin/hooks/useBusinessConfig.ts:27 | 🟩 |
| chat_messages | 20260317212106_5246a827….sql:3 | src/components/chat/QuickChat.tsx:41 | 🟩 |
| cron_health_history | 20260726153016_513e978a….sql:1 | src/features/admin/hooks/useCronHealthHistory.ts:71 | 🟩 |
| cron_p95_daily | 20260726161334_0dc2a73a….sql:1 | src/features/admin/hooks/useCronP95Daily.ts:62 | 🟩 |
| daily_summaries | 20251220133349_01981255….sql:2 | src/features/admin/services/reportsService.ts:26 | 🟩 |
| dashboard_layouts | 20260509134434_95255be9….sql:1 | src/hooks/useDashboardLayout.ts:57 | 🟩 |
| dashboard_presets | 20260516190619_29267167….sql:6 | src/features/admin/hooks/useDashboardPresets.ts:23 | 🟩 |
| document_versions | 20251220150808_3771f0db….sql:23 | src/hooks/useDocuments.ts:159 | 🟩 |
| edge_health_history | 20260726165835_441f51a4….sql:1 | supabase/functions/health-monitor/index.ts:89 | 🟩 |
| efficiency_alert_history | 20251213112509_40265f22….sql:2 | src/features/analytics/hooks/useEfficiencyAlertHistory.ts:40 | 🟩 |
| **email_verification_tokens** | 20251231115823_134f6d49….sql:57 | **nenhum** | 🟦 |
| energy_alerts | 20251220150157_8c97633b….sql:19 | src/features/analytics/hooks/useEnergy.ts:108 | 🟩 |
| energy_consumption | 20251220150157_8c97633b….sql:2 | src/features/analytics/hooks/useEnergy.ts:75 | 🟩 |
| energy_targets | 20251220150157_8c97633b….sql:34 | src/features/analytics/hooks/useEnergy.ts:125 | 🟩 |
| **entity_versions** | 20241231000001_entity_versions.sql:2 | **nenhum** | 🟦 |
| erp_api_keys | 20260520000001_security_rls_indexes_fixes.sql:213 | supabase/functions/erp-api/index.ts:47 | 🟩 |
| error_logs | 20260508180707_df70a259….sql:2 | src/components/ui/error-boundary.tsx:39 | 🟩 |
| feature_flags | 20260513191712_a99f3831….sql:1 | src/features/admin/hooks/useFeatureFlags.ts:22 | 🟩 |
| gamification_rewards | 20260512143602_c8aafdab….sql:2 | src/hooks/useGamification.ts:153 | 🟩 |
| **gamification_settings** | 20251220144811_ddce69a0….sql:34 | **nenhum** | 🟦 |
| inventory_items | 20260509124023_04666a2c….sql:2 | src/components/digital-twin/SupplyChainPanel.tsx:19 | 🟩 |
| inventory_movements | 20260509124023_04666a2c….sql:33 | src/features/inventory/hooks/useInventory.ts:111 | 🟩 |
| ip_allowlist | 20251231024918_18390658….sql:2 | src/components/settings/IPAllowlist.tsx:44 | 🟩 |
| job_status_audit | 20260516180359_c5765536….sql:2 | src/features/admin/hooks/useDetailedAuditTrail.ts:49 | 🟩 |
| job_status_history | 20260512175348_b2547eed….sql:33 | src/features/jobs/hooks/useJobStatusHistory.ts:21 | 🟩 |
| jobs | 20251212212803_e2782029….sql:22 | src/components/planning/LoadBalancingPanel.tsx:36 | 🟩 |
| **kpi_alerts** | 20260516174623_70372cef….sql:2 | **nenhum** (só via RPC `check_and_notify_kpi_alert`) | 🟦 |
| login_audit | 20251231024918_18390658….sql:71 | src/components/settings/LoginAuditLog.tsx:38 | 🟩 |
| login_lockouts | 20251231132402_d92693f8….sql:2 | supabase/functions/check-login-lockout/index.ts:98 | 🟩 |
| lot_components | 20251220142015_2e9cca54….sql:22 | src/features/inventory/hooks/useTraceability.ts:113 | 🟩 |
| lot_movements | 20251220142015_2e9cca54….sql:37 | src/features/inventory/hooks/useTraceability.ts:130 | 🟩 |
| lot_quality_inspections | 20251220142015_2e9cca54….sql:52 | src/features/inventory/hooks/useTraceability.ts:147 | 🟩 |
| machine_downtime | 20260512175348_b2547eed….sql:16 | src/features/production/hooks/useMachineDowntime.ts:26 | 🟩 |
| machine_event_audit | 20260516180359_c5765536….sql:16 | src/features/admin/hooks/useDetailedAuditTrail.ts:68 | 🟩 |
| machine_health_metrics | 20251214173607_56d7abd2….sql:34 | src/features/admin/services/reportsService.ts:6 | 🟩 |
| machine_predictions | 20251214173607_56d7abd2….sql:2 | src/features/maintenance/components/PredictiveHealthCard.tsx:20 | 🟩 |
| machines | 20251212212803_e2782029….sql:12 | src/components/shift/OccurrencesPanel.tsx:47 | 🟩 |
| maintenance_alerts | 20251214172945_ab94e7d7….sql:85 | src/features/production/services/maintenanceService.ts:21 | 🟩 |
| maintenance_checklist_items | 20251214172945_ab94e7d7….sql:40 | src/features/maintenance/components/ChecklistManager.tsx:119 | 🟩 |
| maintenance_checklists | 20251214172945_ab94e7d7….sql:29 | src/features/maintenance/components/ChecklistManager.tsx:101 | 🟩 |
| maintenance_item_responses | 20251214172945_ab94e7d7….sql:73 | src/features/maintenance/components/BatchApprovalPreviewModal.tsx:48 | 🟩 |
| maintenance_records | 20251214172945_ab94e7d7….sql:55 | src/features/production/hooks/useMTBFMTTR.ts:70 | 🟩 |
| maintenance_schedules | 20251214172945_ab94e7d7….sql:12 | src/features/production/services/maintenanceService.ts:5 | 🟩 |
| maintenance_types | 20251214172945_ab94e7d7….sql:2 | src/features/maintenance/hooks/useTPMData.ts:34 | 🟩 |
| materials | 20251213164630_61ce46c4….sql:12 | src/hooks/technical-sheets/useTechnicalSheetsQueries.ts:75 | 🟩 |
| new_device_alerts | 20251231122707_03884ad2….sql:50 | src/features/admin/components/security/SecurityAlertsPanel.tsx:45 | 🟩 |
| **notification_preferences** | 20241224000002_notification_preferences.sql:5 | **nenhum** | 🟦 |
| **notifications** | 20241224000001_notifications.sql:6 | **nenhum** | 🟦 |
| operator_achievements | 20251220144811_ddce69a0….sql:2 | src/hooks/useGamification.ts:117 | 🟩 |
| operator_goals | 20251214143433_eb7013ed….sql:2 | src/features/production/hooks/useOperatorGoals.ts:71 | 🟩 |
| operator_machines | 20251214111919_d4d04242….sql:2 | src/hooks/useGamification.ts:282 | 🟩 |
| operator_rankings | 20251220144811_ddce69a0….sql:18 | src/hooks/useGamification.ts:74 | 🟩 |
| operator_skills | 20260512171232_b9a7467b….sql:9 | src/features/production/hooks/useOperatorSkills.ts:23 | 🟩 |
| operator_status_audit | 20251214122654_b50cd4de….sql:2 | src/features/production/hooks/useOperators.ts:95 | 🟩 |
| packaging_checklist_items | 20260723150514_21fd854c….sql:3 | src/features/packaging/hooks/usePackagingChecklist.ts:38 | 🟩 |
| packaging_defects | 20260723125433_314d8f93….sql:96 | src/features/packaging/hooks/usePackagingAuditTimeline.ts:25 | 🟩 |
| **packaging_equipment** | 20260802113515_15352d5c….sql:92 | **nenhum** | 🟦 |
| packaging_settings | 20260723125433_314d8f93….sql:167 | src/features/packaging/hooks/usePackagingSettings.ts:35 | 🟩 |
| packaging_sla_overrides | 20260723162822_4691c313….sql:2 | src/features/packaging/hooks/usePackagingSlaOverrides.ts:52 | 🟩 |
| packaging_task_checklist | 20260723150514_21fd854c….sql:34 | src/features/packaging/hooks/usePackagingAuditTimeline.ts:26 | 🟩 |
| packaging_tasks | 20260723125433_314d8f93….sql:26 | src/features/packaging/hooks/usePackagingDelayPareto.ts:24 | 🟩 |
| **packaging_waste** | 20260802113432_445cb69f….sql:3 | **nenhum** | 🟦 |
| password_reset_requests | 20251231024327_452c44ae….sql:2 | src/components/settings/PasswordResetRequests.tsx:60 | 🟩 |
| pre_production_checklists | 20260317212106_5246a827….sql:14 | src/components/operator/PreProductionChecklist.tsx:50 | 🟩 |
| prediction_history | 20251214173607_56d7abd2….sql:20 | src/features/analytics/hooks/useMLPredictions.ts:81 | 🟩 |
| product_categories | 20251213164630_61ce46c4….sql:3 | src/hooks/technical-sheets/useTechnicalSheetsQueries.ts:55 | 🟩 |
| production_losses | 20260512175348_b2547eed….sql:2 | src/features/production/hooks/useProductionLosses.ts:31 | 🟩 |
| production_lots | 20251220142015_2e9cca54….sql:6 | src/features/inventory/hooks/useTraceability.ts:75 | 🟩 |
| profiles | 20251213011430_d92f2ce9….sql:5 | src/components/settings/UserManagement.tsx:64 | 🟩 |
| push_notifications | 20251220151304_178cd8c4….sql:14 | src/features/notifications/hooks/useNotifications.ts:39 | 🟩 |
| push_subscriptions | 20251220151304_178cd8c4….sql:2 | src/features/notifications/hooks/useWebPushNotifications.ts:55 | 🟩 |
| qr_scan_history | 20251213123245_19ee8f21….sql:2 | src/components/qrcode/ScanStatsChart.tsx:42 | 🟩 |
| query_telemetry | 20260323120727_2b4f9900….sql:2 | src/features/admin/hooks/useMonitoringData.ts:50 | 🟩 |
| rate_limit_logs | 20251231115823_134f6d49….sql:2 | src/features/admin/hooks/useRateLimitLogs.ts:62 | 🟩 |
| rate_limit_settings | 20251231115823_134f6d49….sql:31 | src/features/admin/hooks/useRateLimitLogs.ts:110 | 🟩 |
| report_templates | 20260512163111_469ee485….sql:2 | src/pages/ReportBuilderPage.tsx:133 | 🟩 |
| reward_redemptions | 20260512143602_c8aafdab….sql:15 | src/hooks/useGamification.ts:178 | 🟩 |
| **rls_test_results** | 20260513135919_d0597eb6….sql:2 | **nenhum** | 🟦 |
| role_permissions | 20251231125744_0ae90bee….sql:2 | src/features/auth/hooks/useRolePermissions.ts:24 | 🟩 |
| **saved_filters** | 20241231000000_saved_filters.sql:8 | **nenhum** | 🟦 |
| security_events | 20251231115823_134f6d49….sql:44 | src/features/admin/hooks/useRateLimitLogs.ts:125 | 🟩 |
| shift_checklist_templates | 20251220135105_e07f8d61….sql:66 | src/components/shift/ChecklistTemplatesManager.tsx:31 | 🟩 |
| shift_handover_checklist | 20251220135105_e07f8d61….sql:19 | src/hooks/shift-handover/useShiftHandoverQueries.ts:60 | 🟩 |
| shift_handovers | 20251220135105_e07f8d61….sql:2 | src/components/shift/OccurrencesPanel.tsx:56 | 🟩 |
| shift_occurrences | 20251220135105_e07f8d61….sql:48 | src/hooks/shift-handover/useShiftHandoverQueries.ts:86 | 🟩 |
| shift_pending_tasks | 20251220135105_e07f8d61….sql:31 | src/hooks/shift-handover/useShiftHandoverQueries.ts:72 | 🟩 |
| **shipment_costs** | 20260512184343_0d26a522….sql:9 | **nenhum** | 🟦 |
| shipments | 20260512173356_65d07680….sql:12 | src/features/inventory/hooks/useLogistics.ts:56 | 🟩 |
| shipping_providers | 20260512173356_65d07680….sql:2 | src/features/inventory/hooks/useLogistics.ts:42 | 🟩 |
| spc_alerts | 20251220142711_de32cb31….sql:47 | src/features/analytics/hooks/useSPC.ts:116 | 🟩 |
| spc_capability_history | 20251220142711_de32cb31….sql:65 | src/features/analytics/hooks/useSPC.ts:137 | 🟩 |
| spc_control_parameters | 20251220142711_de32cb31….sql:6 | src/features/analytics/hooks/useSPC.ts:84 | 🟩 |
| spc_measurements | 20251220142711_de32cb31….sql:27 | src/features/analytics/hooks/useSPC.ts:99 | 🟩 |
| technical_conversations | 20251213121106_34cc9bfc….sql:2 | src/hooks/useTechnicalConversations.ts:45 | 🟩 |
| technical_documents | 20251220150808_3771f0db….sql:2 | src/hooks/useDocuments.ts:49 | 🟩 |
| technical_messages | 20251213121106_34cc9bfc….sql:11 | src/hooks/useTechnicalConversations.ts:157 | 🟩 |
| technical_sheet_audit | 20260509121606_76a3170f….sql:7 | src/hooks/technical-sheets/useTechnicalSheetsQueries.ts:212 | 🟩 |
| **technical_sheet_audit_logs** | 20260509120259_98878e05….sql:13 | **nenhum** | 🟦 |
| technical_sheet_favorites | 20260509121606_76a3170f….sql:26 | src/hooks/technical-sheets/useTechnicalSheetMutations.ts:242 | 🟩 |
| technical_sheet_materials | 20251213164630_61ce46c4….sql:50 | src/hooks/technical-sheets/useTechnicalSheetMutations.ts:156 | 🟩 |
| technical_sheet_steps | 20251213164630_61ce46c4….sql:38 | src/hooks/technical-sheets/useTechnicalSheetMutations.ts:94 | 🟩 |
| technical_sheet_tips | 20251213164630_61ce46c4….sql:61 | src/hooks/technical-sheets/useTechnicalSheetMutations.ts:198 | 🟩 |
| **technical_sheet_versions** | 20260512163310_dd03391e….sql:2 | **nenhum** | 🟦 |
| technical_sheets | 20251213164630_61ce46c4….sql:21 | src/hooks/technical-sheets/useTechnicalSheetMutations.ts:15 | 🟩 |
| techniques | 20251212212803_e2782029….sql:2 | src/components/settings/TechniqueManagement.tsx:38 | 🟩 |
| telemetry_traces | 20260513191712_a99f3831….sql:31 | src/features/production/hooks/usePerformanceMetrics.ts:40 | 🟩 |
| tpm_execution_alerts | 20260508144556_5e04c24b….sql:13 | src/features/maintenance/hooks/useTPMMutations.ts:219 | 🟩 |
| **tpm_execution_audit_logs** | 20260508130112_1bb71df0….sql:2 | **nenhum** | 🟦 |
| **tpm_execution_checklist** | 20260508124849_3a952c8b….sql:18 | **nenhum** | 🟦 |
| tpm_execution_parts | 20260508124849_3a952c8b….sql:29 | src/features/maintenance/hooks/useTPMMutations.ts:309 | 🟩 |
| tpm_execution_supplies | 20260508144556_5e04c24b….sql:2 | src/features/maintenance/hooks/useTPMMutations.ts:230 | 🟩 |
| tpm_executions | 20260508124849_3a952c8b….sql:2 | supabase/functions/send-loss-risk-alert/index.ts:49 | 🟩 |
| tpm_notification_logs | 20260508121901_9a37c909….sql:14 | src/features/notifications/hooks/useTPMNotifications.ts:204 | 🟩 |
| tpm_notification_queue | 20260508124651_5ec6ef68….sql:2 | src/features/maintenance/components/TPMNotificationQueue.tsx:24 | 🟩 |
| tpm_notification_templates | 20260508121901_9a37c909….sql:2 | src/features/maintenance/components/TPMNotificationTemplates.tsx:33 | 🟩 |
| tpm_notification_templates_published | 20260508122318_797edf3a….sql:7 | src/features/maintenance/components/TPMNotificationTemplates.tsx:68 | 🟩 |
| tpm_parameter_alerts | 20260508134459_928b5a62….sql:7 | src/features/maintenance/components/TPMParameterAlerts.tsx:37 | 🟩 |
| tpm_severity_configs | 20260508121901_9a37c909….sql:28 | src/features/maintenance/components/TPMSeverityConfigs.tsx:35 | 🟩 |
| user_devices | 20251231122707_03884ad2….sql:2 | src/hooks/useUserDevices.ts:33 | 🟩 |
| user_favorites | 20251214133328_e8e21d01….sql:2 | src/hooks/useQuickFavorites.ts:64 | 🟩 |
| user_mfa_settings | 20251231024918_18390658….sql:35 | src/components/settings/TwoFactorSetup.tsx:97 | 🟩 |
| user_notification_settings | 20260508115841_57dce838….sql:2 | src/features/notifications/hooks/useTPMNotifications.ts:169 | 🟩 |
| user_roles | 20251213011430_d92f2ce9….sql:18 | src/components/settings/UserManagement.tsx:77 | 🟩 |
| **webauthn_challenges** | 20251231124514_6ce7bbb6….sql:42 | **nenhum** | 🟦 |
| **webauthn_credentials** | 20251231124514_6ce7bbb6….sql:2 | **nenhum** | 🟦 |
| webhook_logs | 20260515114604_3ed3bf90….sql:1 | supabase/functions/webhook-handler/index.ts:106 | 🟩 |

### 🟦 As 17 tabelas sem nenhum consumidor no código

Agrupadas por hipótese de causa (a hipótese é inferência a partir do repositório; **não** verificada em runtime):

| Grupo | Tabelas | Observação |
|---|---|---|
| **WebAuthn / passkeys nunca implementado no cliente** | `webauthn_credentials`, `webauthn_challenges` | A string `webauthn` não aparece em **nenhum** arquivo de `src/` ou `supabase/functions/` fora de `types.ts`. Migration `20251231124514_6ce7bbb6….sql` cria as duas tabelas + RLS. Feature de banco 100 % dormente. |
| **Notificações "v1" substituídas** | `notifications`, `notification_preferences` | Migrations manuais de dez/2024 (`20241224000001`, `20241224000002`). O app usa `push_notifications` / `push_subscriptions` / `user_notification_settings` (out/2025 em diante). Também **ausentes de `types.ts`** (ver seção de drift). Sobrevive um par de funções órfãs: `mark_notification_read`, `mark_all_notifications_read`. |
| **Infra genérica de dez/2024 nunca ligada** | `saved_filters`, `entity_versions` | Migrations manuais `20241231000000` / `20241231000001`. Também ausentes de `types.ts`. `saved_filters` tem trigger + função dedicados (`trigger_saved_filters_updated_at`, `ensure_single_default_filter`) mas nenhum leitor. |
| **Auditoria/versionamento duplicado de fichas técnicas** | `technical_sheet_audit_logs`, `technical_sheet_versions` | Coexistem com `technical_sheet_audit` (consumida em `useTechnicalSheetsQueries.ts:212`). Três mecanismos para a mesma finalidade; dois sem leitor. `create_technical_sheet_version` e `increment_technical_sheet_version` são triggers que escrevem em tabelas que ninguém lê. |
| **TPM: escrita por trigger, leitura inexistente** | `tpm_execution_audit_logs`, `tpm_execution_checklist` | `tpm_execution_audit_logs` é alimentada pelo trigger `trigger_audit_tpm_execution`; `tpm_execution_checklist` pelo trigger `trigger_save_checklist_snapshot` (`save_tpm_checklist_snapshot`). Dados são gravados e nunca consultados pelo app. |
| **Embalagem: tabelas mais recentes (ago/2026) ainda sem UI** | `packaging_equipment`, `packaging_waste` | Criadas em `20260802113515` e `20260802113432` — as **penúltimas** migrations do repo. Provável feature em construção, ainda sem front-end. |
| **Segurança/e-mail** | `email_verification_tokens` | Criada junto do bloco de rate limiting (`20251231115823`). Nenhum consumidor, nem em edge function de e-mail. |
| **Config/analytics sem leitor** | `gamification_settings`, `kpi_alerts`, `rls_test_results`, `shipment_costs` | `kpi_alerts` só é escrita pela função `check_and_notify_kpi_alert` (chamada em `useOEEAlerts.ts:70`), nunca lida. `rls_test_results` é escrita pela função `test_rls_policies`, que também não é chamada de lugar nenhum. `shipment_costs` tem trigger `update_shipment_costs_updated_at` e policies, mas o módulo de logística só usa `shipments`/`shipping_providers`. |

### ⚠️ Tabelas consumidas pelo código que **não existem em nenhuma migration**

Este é o inverso do achado acima e é igualmente relevante: 7 nomes de tabela usados em `.from()` não têm
`CREATE TABLE` no repositório.

| Tabela usada | Onde | `CREATE TABLE` no repo? |
|---|---|---|
| `geo_blocking_settings` | src/features/admin/hooks/useGeoBlocking.ts:73 | **não** (mas **está** em `types.ts`) |
| `geo_blocking_rules` | src/features/admin/hooks/useGeoBlocking.ts:107 | **não** (mas **está** em `types.ts`) |
| `geo_blocking_logs` | src/features/admin/hooks/useGeoBlocking.ts:122 | **não** (mas **está** em `types.ts`) |
| `archived_jobs` | supabase/functions/cron-cleanup/index.ts:48 | **não**, e **não** em `types.ts` |
| `backups` | supabase/functions/backup-scheduler/index.ts:61 | **não**, e **não** em `types.ts` |
| `backup_logs` | supabase/functions/backup-scheduler/index.ts:74 | **não**, e **não** em `types.ts` |
| `system_metrics` | supabase/functions/metrics-collector/index.ts:60 | **não**, e **não** em `types.ts` |

Interpretação: as três `geo_blocking_*` existem no banco real (o `types.ts` gerado as conhece) mas foram
criadas **fora do versionamento** — provavelmente por SQL manual no console Supabase. As outras quatro não
existem nem no SQL nem nos tipos: o código das edge functions `cron-cleanup`, `backup-scheduler` e
`metrics-collector` grava em tabelas que, pelo que o repositório mostra, **não existem**.
Se elas existem ou não no banco de produção é **NAO_VERIFICADO**.

---

## Funções / RPCs

**68 funções distintas** criadas com `CREATE [OR REPLACE] FUNCTION` (contagem por nome; muitas são
redefinidas várias vezes ao longo das migrations — ver "Reconstrutibilidade").

### Chamadas explicitamente via `.rpc()` no código

Existem apenas **8 call sites de `.rpc()`** em todo o repositório (`src/` + `supabase/functions/`):

| Função | Call site | Migration que a define |
|---|---|---|
| `verify_audit_chain` | src/features/admin/hooks/useAuditTrail.ts:95 | 20260421004919_c11aeb06….sql |
| `get_packaging_leaderboard` | src/features/packaging/components/PackagingLeaderboard.tsx:18 (`as any`) | 20260723….sql (bloco packaging) |
| `check_and_notify_kpi_alert` | src/features/production/hooks/useOEEAlerts.ts:70 | 20260516174623_70372cef….sql |
| `increment_job_lost_pieces` | src/features/production/hooks/useProductionLosses.ts:99 (`as never`) | 20260531000001_add_increment_job_lost_pieces_rpc.sql |
| `count_active_operators_since` | supabase/functions/metrics-collector/index.ts:36 | 20260614000001_metrics_distinct_counts.sql |
| `count_running_machines` | supabase/functions/metrics-collector/index.ts:51 | 20260614000001_metrics_distinct_counts.sql |
| `purge_old_logs` | supabase/functions/cron-cleanup/index.ts:27 | migration de manutenção |
| *(dinâmica)* `supabase.rpc(rpc!, params)` | supabase/functions/external-db-bridge/index.ts:261 | nome resolvido em runtime — **não auditável estaticamente** |

Além disso, três hooks chamam RPC de forma **não tipada** (cast de `supabase.rpc` para `(fn: string) => …`,
portanto invisíveis ao grep de `.rpc('nome')`): `get_cron_health`
(src/features/admin/hooks/useCronHealth.ts:34), `get_system_status_summary`
(src/features/admin/hooks/useSystemStatusSummary.ts) e a leitura ligada a `rollup_cron_p95_daily` /
`snapshot_cron_health` (feita via tabela, não via RPC).

### Funções de trigger (36) — "usadas", mas indiretamente

36 funções são referenciadas por `EXECUTE FUNCTION` em `CREATE TRIGGER`: `audit_job_changes`,
`audit_job_status_change`, `audit_log_immutable`, `audit_logistics_changes`, `audit_machine_changes`,
`audit_profile_change`, `audit_technical_sheet_changes`, `audit_tpm_execution_changes`,
`audit_trigger_func`, `calculate_days_of_supply`, `check_job_overlap`, `create_technical_sheet_version`,
`enforce_packaging_checklist_before_ship`, `ensure_single_default_filter`,
`handle_maintenance_correction_notification`, `handle_new_user`, `handle_parameter_alert_notification`,
`handle_tpm_updated_at`, `increment_technical_sheet_version`, `log_job_status_change`,
`log_technical_sheet_change`, `notify_loss_risk`, `notify_packaging_defect_critical`,
`notify_packaging_task_created`, `on_job_finished_create_packaging_task`,
`on_packaging_defect_create_rework_job`, `on_packaging_ready_create_shipment`,
`process_audit_log_hashing`, `rollback_inventory_stock`, `save_tpm_checklist_snapshot`,
`trigger_auto_promotion`, `trigger_send_tpm_email`, `update_inventory_stock`,
`update_saved_filters_updated_at`, `update_updated_at_column`, `validate_inventory_stock`,
`validate_stock_before_movement`.

### Funções usadas dentro de policies RLS

`has_role` (582 ocorrências no SQL das migrations), `has_any_active_role` (81), `get_user_role` (7) e
`app_private.has_role`. São o backbone do RBAC no banco — não são órfãs.

### 🟦 Funções órfãs (nenhum `.rpc()`, nenhum trigger, nenhum chamador SQL)

| Função | Migration de origem | Situação |
|---|---|---|
| `mark_notification_read` | migração do bloco `notifications` (dez/2024) | 0 chamadores. Pertence ao módulo `notifications` dormente. |
| `mark_all_notifications_read` | idem | 0 chamadores. |
| `check_tpm_schedules_notifications` | bloco TPM (20260508…) | 0 chamadores; presumivelmente destinada a cron nunca agendado. |
| `process_tpm_notifications_cron` | 20260508124651_5ec6ef68….sql | 0 chamadores; o nome sugere cron, mas **não há `cron.schedule`** para ela. |
| `auto_reassign_stale_packaging_tasks` | bloco packaging | 0 chamadores; só aparece em `types.ts`. |
| `refresh_operator_rankings` | bloco gamificação | 0 chamadores. |
| `get_packaging_manifest` | bloco packaging | 0 chamadores (existe em `types.ts`, nunca invocada). |
| `packaging_task_sla_status` | bloco packaging | 0 chamadores diretos. |
| `increment_sheet_view_count` | bloco fichas técnicas | 1 referência interna; nenhum chamador do app. |
| `test_rls_policies` | 20260513135919_d0597eb6….sql | 0 chamadores; escreve na tabela dormente `rls_test_results`. |
| `update_audit_hash` | bloco de auditoria | 0 chamadores; coexiste com `calculate_audit_hash`/`compute_audit_hash`/`process_audit_log_hashing`. |
| `notify_tpm_email` | bloco TPM | Só referenciada por `trigger_send_tpm_email`; sem consumidor no app. |
| `cron_expected_interval_minutes` | 20260726…(bloco cron health) | Auxiliar de `get_cron_health`. |
| `log_security_violation` | bloco de segurança | 2 referências internas em SQL; **nenhum** chamador no código TS. |

Total: **~14 funções sem consumidor efetivo** (algumas ainda referenciadas internamente por outra função SQL).

---

## Triggers e Views

### Triggers

**85 triggers distintos** criados (`CREATE TRIGGER`), e **36 `DROP TRIGGER`** ao longo da história —
sinal de recriação/refatoração repetida, não de remoção líquida.

Distribuição por natureza:

| Categoria | Qtd. aprox. | Exemplos |
|---|---|---|
| `updated_at` automático (`update_updated_at_column`) | ~34 | `update_jobs_updated_at`, `update_profiles_updated_at`, `trg_packaging_tasks_updated_at`, `update_cron_p95_daily_updated_at` |
| Auditoria / trilha imutável | ~14 | `tr_audit_job_changes`, `tr_audit_machine_changes`, `audit_log_no_update`, `audit_log_no_delete`, `tr_audit_log_hashing`, `trg_audit_packaging_tasks` |
| Regras de negócio / automação de fluxo | ~10 | `on_job_finished_promote`, `trg_on_job_finished_create_packaging_task`, `trg_packaging_ready_create_shipment`, `trg_packaging_defect_create_rework`, `trg_enforce_pkg_checklist`, `trigger_check_job_overlap` |
| Estoque | 3 | `tr_update_inventory_stock`, `tr_rollback_inventory_stock`, `tr_validate_inventory_stock`, `trigger_validate_stock_movement` |
| Notificações | ~5 | `on_maintenance_alert_insert`, `tr_parameter_alert_notification`, `on_tpm_execution_alert`, `trg_notify_packaging_defect_critical` |
| Auth | 1 | `on_auth_user_created` → `handle_new_user` |

Cadeia de automação notável (tudo em banco, sem passar pelo app):
`jobs.status = finished` → `on_job_finished_create_packaging_task` → `packaging_tasks` →
`notify_packaging_task_created` → e, ao ficar pronto, `on_packaging_ready_create_shipment` → `shipments`.
Um defeito registrado dispara `on_packaging_defect_create_rework_job`, que **cria um novo job**.
Isso significa que boa parte do fluxo produtivo é orquestrado por triggers, não por código de aplicação.

### Views

**Zero.** Não há nenhum `CREATE VIEW` nem `CREATE MATERIALIZED VIEW` em nenhuma das 216 migrations.
Isso é confirmado pelo lado dos tipos: `src/integrations/supabase/types.ts` declara
`Views: { [_ in never]: never }` — ou seja, o banco real também não expõe views ao PostgREST.
Consistente entre SQL e tipos.

### Índices

**263 `CREATE INDEX` / `CREATE UNIQUE INDEX`**, concentrados em migrations dedicadas
(`20260719120000_add_missing_performance_indexes.sql`, `20260719190000_add_composite_partial_indexes.sql`,
`20260520000001_security_rls_indexes_fixes.sql`).

---

## RLS — panorama e policies permissivas

### Panorama

| Métrica | Valor | Evidência |
|---|---|---|
| `CREATE POLICY` no histórico | **588** | parsing de todas as migrations |
| `DROP POLICY` no histórico | **389** | idem |
| Policies distintas vigentes (estimativa) | **~199** | 588 − 389, assumindo pareamento perfeito |
| `ENABLE ROW LEVEL SECURITY` | **144 ocorrências / 135 tabelas distintas** | todas as 135 tabelas criadas têm RLS habilitado em algum momento |
| Tabelas criadas **sem** `ENABLE ROW LEVEL SECURITY` | **0** | conjunto-diferença vazio |
| `SECURITY DEFINER` | **73 ocorrências** | funções privilegiadas |
| Policies exigindo **aal2 / MFA** | **0** | `grep -iE "aal2\|assurance_level"` → **zero resultados** |

**RLS está habilitado em 100 % das tabelas versionadas.** O problema não é ausência de RLS — é a
**qualidade** das expressões.

### MFA / aal2 — ausência total

Nenhuma policy no repositório referencia `aal2`, `assurance_level` ou `amr`. Existe uma tabela
`user_mfa_settings` e um componente `TwoFactorSetup.tsx`, mas **nenhuma policy exige segundo fator para
acessar dado nenhum**. MFA, no que o repositório mostra, é puramente cosmético do ponto de vista de
autorização no banco.

### Policies permissivas

- **192 `CREATE POLICY`** contendo `USING (true)` e/ou `WITH CHECK (true)` foram criadas ao longo da história.
- Dessas, **44 não foram removidas nem substituídas por nenhuma migration posterior** — ou seja,
  permanecem vigentes ao final da cadeia.

Houve um esforço real de remediação (migrations `20260412114527`, `20260412120237`, `20260719160000`,
`20260719200000`, `20260718200100`, `20260718200200`), que trocou `USING(true)` por checagens correlacionadas
em `user_roles`. Mas o esforço foi **parcial e depois revertido na prática**: as três migrations mais recentes
que criam objetos (02/ago/2026) **reintroduzem `USING (true)`**.

#### As 44 policies permissivas vigentes

| Arquivo:linha | Tabela | Policy | Cláusula |
|---|---|---|---|
| 20241231000001_entity_versions.sql:19 | entity_versions | "Users can view versions" | `FOR SELECT USING (true)` — **sem `TO`, aplica a `anon`** |
| 20251213123245_19ee8f21….sql:16 | qr_scan_history | "Authenticated users can view scan history" | `FOR SELECT TO authenticated USING (true)` |
| 20251214203346_48c27e6d….sql:43 | **jobs** | "Authenticated users can view jobs" | `FOR SELECT TO authenticated USING (true)` |
| 20251231024327_452c44ae….sql:19 | password_reset_requests | "Anyone can create password reset requests" | `FOR INSERT WITH CHECK (true)` — **sem `TO`, aplica a `anon`** |
| 20260317212106_5246a827….sql:33 | chat_messages | "Authenticated users can view chat messages" | `USING (true)` |
| 20260317212106_5246a827….sql:38 | pre_production_checklists | "Anyone can view checklists" | `USING (true)` |
| 20260317221345_a38f2094….sql:85 | **role_permissions** | "Authenticated users can view permissions" | `USING (true)` |
| 20260412114527_5d889920….sql:25 | abc_activities | "Authenticated users can view activities" | `USING (true)` |
| 20260412120237_326b08d4….sql:63 | maintenance_schedules | "Authenticated users can view maintenance schedules" | `USING (true)` |
| 20260412121530_fdd2f555….sql:21 | spc_measurements | "Authenticated users can view SPC measurements" | `USING (true)` |
| 20260412121530_fdd2f555….sql:30 | bitrix24_field_mappings | "Authenticated users can view field mappings" | `USING (true)` |
| 20260508121901_9a37c909….sql:46 | tpm_notification_templates | "Templates viewable by authenticated users" | `USING (true)` |
| 20260508121901_9a37c909….sql:49 | tpm_notification_logs | "Logs viewable by authenticated users" | `USING (true)` |
| 20260508121901_9a37c909….sql:50 | tpm_notification_logs | "Logs insertable by system" | `FOR INSERT WITH CHECK (true)` |
| 20260508121901_9a37c909….sql:52 | tpm_severity_configs | "Severity configs viewable by authenticated users" | `USING (true)` |
| 20260508122318_797edf3a….sql:26 | tpm_notification_templates_published | "Published templates viewable by everyone" | `USING (true)` |
| 20260512213032_9ae46855….sql:11 | shipment_costs | "Authenticated users can view shipment costs" | `USING (true)` |
| 20260513135919_d0597eb6….sql:16 | rls_test_results | "Allow authenticated to view test results" | `USING (true)` |
| 20260513191106_46eb83ce….sql:17 | business_config | "Configs são visíveis por todos autenticados" | `USING (true)` |
| 20260513191712_a99f3831….sql:19 | feature_flags | "Flags visíveis por todos autenticados" | `USING (true)` |
| 20260522195454_1430c315….sql:7 | job_status_history | "Authenticated users can view job status history" | `USING (true)` |
| 20260522195454_1430c315….sql:10 | machine_downtime | "…view machine downtime" | `USING (true)` |
| 20260522195454_1430c315….sql:16 | operator_skills | "…view operator skills" | `USING (true)` |
| 20260522195454_1430c315….sql:19 | production_losses | "…view production losses" | `USING (true)` |
| 20260522195454_1430c315….sql:22 | tpm_execution_alerts | "…view tpm execution alerts" | `USING (true)` |
| 20260522195454_1430c315….sql:26 | tpm_execution_supplies | "…view tpm execution supplies" | `USING (true)` |
| 20260522195454_1430c315….sql:29 | tpm_parameter_alerts | "…view parameter alerts" | `USING (true)` |
| 20260522195454_1430c315….sql:32 | gamification_settings | "…view gamification settings" | `USING (true)` |
| 20260522195454_1430c315….sql:35 | maintenance_checklists | "…view maintenance checklists" | `USING (true)` |
| 20260522195454_1430c315….sql:38 | maintenance_checklist_items | "…view maintenance checklist items" | `USING (true)` |
| 20260522195454_1430c315….sql:41 | maintenance_types | "…view maintenance types" | `USING (true)` |
| 20260522195454_1430c315….sql:44 | shift_checklist_templates | "…view shift checklist templates" | `USING (true)` |
| 20260522195454_1430c315….sql:47 | technical_sheets | "…view technical sheets" | `USING (true)` |
| 20260522195454_1430c315….sql:50 | technical_sheet_materials | "…view technical sheet materials" | `USING (true)` |
| 20260522195454_1430c315….sql:53 | technical_sheet_steps | "…view technical sheet steps" | `USING (true)` |
| 20260522195454_1430c315….sql:56 | technical_sheet_tips | "…view technical sheet tips" | `USING (true)` |
| 20260522195454_1430c315….sql:59 | techniques | "…view techniques" | `USING (true)` |
| 20260522195454_1430c315….sql:62 | machines | "…view machines" | `USING (true)` |
| 20260522195454_1430c315….sql:65 | materials | "…view materials" | `USING (true)` |
| 20260522195454_1430c315….sql:68 | product_categories | "…view product categories" | `USING (true)` |
| **20260802113432_445cb69f….sql:16** | packaging_waste | "Users can insert waste records" | `FOR INSERT TO authenticated WITH CHECK (true)` |
| **20260802113432_445cb69f….sql:17** | packaging_waste | "Users can read waste records" | `USING (true)` |
| **20260802113515_15352d5c….sql:107** | packaging_equipment | "All authenticated users can see equipment" | `USING (true)` |
| **20260802113601_342e3660….sql:6** | packaging_defects | "Anyone can see defects" | `USING (true)` |

Observações críticas:

1. **`jobs` e `role_permissions` com `USING (true)`.** Qualquer usuário autenticado — inclusive um recém-cadastrado
   sem papel algum — lê a carteira inteira de pedidos e o mapa completo de permissões do sistema.
2. **Duas policies sem cláusula `TO` alcançam `anon`**: `entity_versions` (SELECT) e
   `password_reset_requests` (INSERT). A segunda é intencional (reset de senha precisa ser anônimo) e foi
   mitigada por `20260719210000_rate_limit_password_reset_requests.sql`; a primeira parece descuido.
3. **127 policies vigentes não declaram `TO <role>`** (portanto valem para `PUBLIC`, incluindo `anon`).
   A maioria compensa com predicados `auth.uid() = user_id` ou `has_role(...)`, mas depender do predicado
   em vez de restringir o role é frágil.
4. **A remediação foi abandonada.** As três últimas migrations que criam policies (02/ago/2026, módulo de
   embalagem) voltaram ao padrão `USING (true)`, apesar de existirem migrations de jul/2026 dedicadas
   exatamente a eliminá-lo.

---

## Cron jobs declarados

Apenas **duas** chamadas a `cron.schedule` existem em todo o histórico de migrations:

| Job | Schedule | Ação | Arquivo |
|---|---|---|---|
| `auto-promote-jobs-fallback` | `*/5 * * * *` | `net.http_post` para `https://xxroejpvloldkmqdydar.supabase.co/functions/v1/auto-promote-jobs` | 20260512110942_cb61b4fe….sql:43 |
| `rollup-cron-p95-daily` | `20 * * * *` | `SELECT public.rollup_cron_p95_daily(2)` | 20260726161334_0dc2a73a….sql:77 |

Extensões: `pg_cron` e `pg_net` habilitadas em `20251213150058_4e04dfb2….sql` e reforçadas em
`20260512110942_cb61b4fe….sql`.

Pontos de atenção:

- O job `auto-promote-jobs-fallback` está dentro de um bloco `DO $$ … IF EXISTS (SELECT 1 FROM pg_extension
  WHERE extname = 'pg_cron') … END $$`. Se `pg_cron` não estivesse instalada no momento da aplicação, o job
  **silenciosamente não é criado** e nenhum erro é levantado.
- Esse job embute a **URL do projeto hardcoded** (`xxroejpvloldkmqdydar.supabase.co`) e depende de
  `current_setting('app.settings.service_role_key', true)` — um GUC que **não é definido em nenhuma
  migration do repositório**. Se o GUC não existir, `current_setting(..., true)` devolve `NULL` e o header
  vira `Bearer ` (vazio), fazendo o POST falhar com 401 — silenciosamente, pois `net.http_post` é assíncrono.
- **Não há `cron.schedule` para as funções que aparentam ser rotinas agendadas**:
  `snapshot_cron_health` (o comentário em `useCronHealthHistory.ts:7` afirma "alimentado a cada 15 min"),
  `process_tpm_notifications_cron`, `check_tpm_schedules_notifications`, `auto_reassign_stale_packaging_tasks`,
  `purge_old_logs`, `refresh_operator_rankings`. Ou esses agendamentos foram criados **fora do versionamento**
  (console Supabase), ou nunca existiram.
- **A execução efetiva de qualquer cron é `NAO_VERIFICADO`.** Sem acesso ao banco vivo é impossível
  consultar `cron.job` / `cron.job_run_details` para saber se os jobs existem, estão `active`, ou rodaram.

---

## Reconstrutibilidade e drift

### 1. Drift declarado de projeto

`supabase/config.toml` aponta para:

```toml
project_id = "xxroejpvloldkmqdydar"
```

O mesmo ID está **hardcoded** dentro do SQL, em `20260512110942_cb61b4fe….sql:47`
(`https://xxroejpvloldkmqdydar.supabase.co/functions/v1/auto-promote-jobs`). Ou seja: aplicar essas
migrations em um projeto Supabase diferente (staging, um fork, um ambiente de recuperação) cria um cron job
que **aponta de volta para o projeto original**. Isso é um risco concreto de cross-environment write.

> Nota de contexto: o ambiente desta sessão expõe um conector MCP Supabase rotulado "FAST GRAVAÇÕES" apontando
> para um project ref **diferente** (`uoujzvpecohinketylud`). Não foi feita nenhuma consulta a banco vivo, e
> qual projeto é o de produção real é **NAO_VERIFICADO** — registra-se apenas que há mais de um candidato.

### 2. Drift repositório ↔ `types.ts`

`src/integrations/supabase/types.ts` é gerado a partir do **banco real** e serve como uma foto indireta do
schema em produção. Comparando com o SQL versionado:

| Direção | Qtd. | Objetos |
|---|---|---|
| Em `types.ts` mas **sem `CREATE TABLE`** no repo | **3** | `geo_blocking_settings`, `geo_blocking_rules`, `geo_blocking_logs` |
| Em migration mas **ausente de `types.ts`** | **5** | `notifications`, `notification_preferences`, `saved_filters`, `entity_versions`, `erp_api_keys` |
| Total de tabelas em `types.ts` | 133 | vs. 135 no SQL |

Leitura do padrão: as **4 tabelas de dez/2024** (`notifications`, `notification_preferences`,
`saved_filters`, `entity_versions`) são exatamente as que (a) foram criadas por migrations de nome manual,
(b) não têm nenhum consumidor no código, **e** (c) não aparecem nos tipos gerados. A explicação mais
econômica é que **essas migrations nunca foram aplicadas ao banco de produção** — foram escritas à mão,
commitadas e esquecidas. `erp_api_keys` (criada em `20260520000001_security_rls_indexes_fixes.sql`, também
de nome manual) cai na mesma categoria, **embora seja lida por `supabase/functions/erp-api/index.ts:47`** —
o que significaria que a API de ERP consulta uma tabela que o banco pode não ter.

**Isto é uma inferência a partir de artefatos do repositório, não uma verificação. Se cada migration foi
ou não aplicada é `NAO_VERIFICADO`.**

No lado das funções:

| Direção | Qtd. | Observação |
|---|---|---|
| Funções em `types.ts` | 21 | apenas as não-trigger expostas ao PostgREST |
| Funções chamadas via `.rpc()` **ausentes** de `types.ts` | **4** | `verify_audit_chain`, `increment_job_lost_pieces`, `count_active_operators_since`, `count_running_machines` |

Isso explica os casts defensivos no código (`as any` em `PackagingLeaderboard.tsx:18`, `as never` em
`useProductionLosses.ts:99`, cast completo de `supabase.rpc` em `useCronHealth.ts:34`): **`types.ts` está
desatualizado em relação às migrations mais recentes**, e o time contorna com casts em vez de regenerar.

### 3. As migrations reconstroem o schema do zero?

**Provavelmente sim, mas com fragilidades reais.**

Fatores favoráveis:

- **Nenhum `DROP TABLE`** (0 ocorrências) e **nenhum `DROP VIEW`** em todo o histórico. Não há tabela criada
  e depois removida — não existem migrations contraditórias no nível de tabela.
- Apenas **1 `DROP FUNCTION`**.
- Nenhum `ALTER TABLE` referencia tabela que não seja criada antes (conjunto-diferença vazio).
- Toda tabela criada recebe `ENABLE ROW LEVEL SECURITY`.

Fatores de risco:

- **Idempotência inconsistente**: das 139 declarações `CREATE TABLE`, apenas **48 usam `IF NOT EXISTS`**.
  Uma reaplicação parcial quebra.
- **4 tabelas têm `CREATE TABLE` em duas migrations diferentes**:

  | Tabela | 1ª criação | 2ª criação | Risco |
  |---|---|---|---|
  | `operator_skills` | 20260512171232_b9a7467b….sql:9 (`IF NOT EXISTS`) | 20260512174926_9fee57af….sql:2 (`IF NOT EXISTS`) | baixo (a 2ª vira no-op) |
  | `operator_rankings` | 20251220144811_ddce69a0….sql:18 (**sem** `IF NOT EXISTS`) | 20260512174926_9fee57af….sql:26 (`IF NOT EXISTS`) | **definições divergentes silenciadas** |
  | `operator_status_audit` | 20251214122654_b50cd4de….sql:2 (**sem** `IF NOT EXISTS`) | 20260512174926_9fee57af….sql:47 (`IF NOT EXISTS`) | **idem** |
  | `tpm_execution_supplies` | 20260508144556_5e04c24b….sql:2 (`IF NOT EXISTS`) | 20260508152140_2b71398a….sql:16 (`IF NOT EXISTS`) | baixo |

  O padrão perigoso é `operator_rankings` / `operator_status_audit`: uma segunda migration redefine a tabela
  com `IF NOT EXISTS`, o que faz o Postgres **ignorar completamente** a nova definição de colunas. Se as duas
  definições divergirem, o schema resultante depende de qual migration rodou primeiro — e um banco reconstruído
  do zero e o banco de produção podem acabar diferentes. Isso é **NAO_VERIFICADO** sem comparar com o banco.

- **Churn extremo de policies**: 588 `CREATE POLICY` contra 389 `DROP POLICY`. Cerca de dois terços das
  policies criadas foram posteriormente derrubadas e recriadas. Migrations que fazem `CREATE POLICY` sem um
  `DROP POLICY IF EXISTS` prévio falham em reaplicação.
- **36 `DROP TRIGGER`** para 85 triggers — mesmo padrão de reescrita repetida.
- **73 ocorrências de `SECURITY DEFINER`**, com uma migration inteira dedicada a corrigir `search_path`
  (`20260718200000_fix_search_path_all_functions.sql`) — indício de que o problema clássico de
  `SECURITY DEFINER` sem `SET search_path` existiu por meses antes de ser tratado.

### 4. Duas gerações de migrations convivendo

| Padrão de nome | Qtd. | Origem provável |
|---|---|---|
| `<timestamp>_<uuid>.sql` | 194 | geradas pela plataforma Lovable |
| `<timestamp>_<nome-descritivo>.sql` | **22** | escritas à mão |

As 22 manuais são exatamente onde estão as correções de segurança e performance
(`20260520000001_security_rls_indexes_fixes.sql`, `20260620000001_optimize_rls_select_auth_uid.sql`,
`20260718200000_fix_search_path_all_functions.sql`, `20260719*`, `20260804000001_add_user_roles_profiles_fk.sql`).
E é entre elas que estão as 5 tabelas ausentes de `types.ts`. Ou seja: **as migrations manuais são
justamente as que têm maior probabilidade de não terem sido aplicadas**, e são as que carregam as correções
de segurança. Se essa hipótese estiver certa, boa parte do trabalho de hardening pode não estar em produção.
**NAO_VERIFICADO.**

---

## Achados relevantes

1. **🟦 17 de 135 tabelas (12,6 %) não têm nenhum consumidor no código.** O achado mais valioso: `webauthn_credentials`
   e `webauthn_challenges` são uma feature de passkeys 100 % dormente (a string "webauthn" não existe fora de
   `types.ts`); `notifications`/`notification_preferences`/`saved_filters`/`entity_versions` são uma geração
   inteira de dez/2024 abandonada; `tpm_execution_audit_logs`, `tpm_execution_checklist`,
   `technical_sheet_audit_logs` e `technical_sheet_versions` **recebem escritas por trigger** e nunca são lidas —
   o banco acumula dados de auditoria que ninguém consulta.
2. **⚠️ 7 tabelas são usadas pelo código e não existem em migration alguma.** As três `geo_blocking_*` estão em
   `types.ts` (existem no banco, criadas fora do versionamento). Mas `archived_jobs`, `backups`, `backup_logs`
   e `system_metrics` não estão nem no SQL nem nos tipos — três edge functions (`cron-cleanup`,
   `backup-scheduler`, `metrics-collector`) escrevem em tabelas fantasma. Se essas escritas falham em produção,
   é `NAO_VERIFICADO`.
3. **44 policies permissivas (`USING (true)`) continuam vigentes** ao final da cadeia, incluindo em `jobs`
   (carteira inteira de pedidos) e `role_permissions` (mapa de permissões). Houve remediação real em
   abr–jul/2026, mas as **três últimas migrations (02/ago/2026) reintroduziram o padrão** — a disciplina
   regrediu.
4. **Zero policies exigem MFA.** Não há `aal2` em nenhum lugar. A tabela `user_mfa_settings` e o
   `TwoFactorSetup.tsx` existem, mas o banco não diferencia sessão com e sem segundo fator.
5. **Zero views.** Toda agregação é feita ou em função `SECURITY DEFINER` ou no cliente. Consistente entre
   SQL e `types.ts`.
6. **O fluxo produtivo central é orquestrado por triggers, não por código.** Job finalizado → cria tarefa de
   embalagem → notifica → cria remessa; defeito → cria job de retrabalho. 85 triggers, com uma cadeia de
   automação que atravessa 4 domínios. Isso é invisível para quem lê só o front-end e é uma fonte provável de
   comportamento "mágico" difícil de depurar.
7. **`types.ts` está desatualizado**: 4 funções chamadas via `.rpc()` não estão nos tipos, e o código
   compensa com `as any` / `as never` / cast completo de `supabase.rpc`. Cada cast desses é um ponto onde o
   TypeScript deixou de proteger.
8. **~14 funções SQL são órfãs**, incluindo quatro cujos nomes indicam rotina agendada
   (`process_tpm_notifications_cron`, `check_tpm_schedules_notifications`,
   `auto_reassign_stale_packaging_tasks`, `refresh_operator_rankings`) para as quais **não existe
   `cron.schedule`** no repositório.
9. **Apenas 2 cron jobs versionados**, e um deles depende de um GUC (`app.settings.service_role_key`) que
   nenhuma migration define, além de embutir a URL do projeto no SQL.
10. **`operator_rankings` e `operator_status_audit` são recriadas com `IF NOT EXISTS`** por uma migration
    posterior — se as definições divergirem, a segunda é silenciosamente ignorada e um banco reconstruído do
    zero pode diferir do de produção.
11. **Duas gerações de migrations** (194 Lovable + 22 manuais). As manuais concentram as correções de
    segurança **e** são as que mais provavelmente nunca foram aplicadas (5 das suas tabelas estão ausentes
    de `types.ts`).

---

## Limitações — o que é `NAO_VERIFICADO`

Esta auditoria leu **apenas arquivos do repositório**. Não houve nenhuma conexão a banco de dados.
Tudo abaixo é **impossível de determinar** a partir do repo e está explicitamente marcado como
**NAO_VERIFICADO** — nenhuma afirmação deste documento deve ser lida como verificação de runtime:

- **NAO_VERIFICADO** — se cada uma das 216 migrations foi de fato **aplicada** ao banco de produção.
  A tabela `supabase_migrations.schema_migrations` não foi consultada. A inferência sobre as migrations de
  dez/2024 e as manuais serem não-aplicadas se apoia **apenas** na ausência dessas tabelas no `types.ts`
  gerado — é uma hipótese plausível, não um fato.
- **NAO_VERIFICADO** — se as 135 tabelas **existem** no banco, e com quais colunas. O schema real pode ter
  divergido por SQL manual no console (as três `geo_blocking_*` são prova de que isso aconteceu ao menos uma vez).
- **NAO_VERIFICADO** — se qualquer tabela **tem linhas**. Uma tabela classificada 🟦 pode estar cheia de
  dados históricos (as alimentadas por trigger provavelmente estão) ou completamente vazia. A classificação
  🟦 significa exclusivamente "sem consumidor no código", nunca "sem dados".
- **NAO_VERIFICADO** — se os cron jobs `auto-promote-jobs-fallback` e `rollup-cron-p95-daily` existem em
  `cron.job`, estão `active = true`, ou **rodaram alguma vez**. Nem se existem cron jobs adicionais criados
  fora do versionamento.
- **NAO_VERIFICADO** — se as 44 policies permissivas identificadas são as que de fato estão vigentes no
  banco. O cálculo foi feito casando `CREATE POLICY` com `DROP POLICY` **no repositório**; policies alteradas
  ou removidas manualmente no console não aparecem aqui. `pg_policies` não foi consultada.
- **NAO_VERIFICADO** — a contagem real de policies em produção (~199 é aritmética sobre o repo: 588 − 389).
- **NAO_VERIFICADO** — se as escritas em `archived_jobs`, `backups`, `backup_logs` e `system_metrics` falham
  em produção, e se `supabase/functions/erp-api` consegue ler `erp_api_keys`.
- **NAO_VERIFICADO** — se o GUC `app.settings.service_role_key` está definido no banco (portanto se o cron
  `auto-promote-jobs-fallback` consegue autenticar).
- **NAO_VERIFICADO** — se `pg_cron` e `pg_net` estão de fato instaladas (o SQL usa `IF NOT EXISTS` /
  guarda condicional, que mascara a ausência).
- **NAO_VERIFICADO** — qual project ref é o de produção. `config.toml` diz `xxroejpvloldkmqdydar`; o
  ambiente desta sessão referencia também `uoujzvpecohinketylud`. Nenhum dos dois foi contatado.
- **Ponto cego estático**: `supabase/functions/external-db-bridge/index.ts:261` chama
  `supabase.rpc(rpc!, params)` com nome resolvido em runtime. Qualquer função da lista de "órfãs" pode, na
  prática, ser invocada por esse caminho — o grep não alcança.
- **Ponto cego de nomes dinâmicos**: consultas construídas com nome de tabela em variável não são capturadas
  pelo padrão `.from('<literal>')`. Uma tabela marcada 🟦 poderia, teoricamente, ser acessada assim.
