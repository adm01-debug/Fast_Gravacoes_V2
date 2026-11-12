# 11 · GLOSSÁRIO, DADOS DE REFERÊNCIA E LACUNAS

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `dd1b4671aa` · branch `main` · 2026-11-12 14:35 UTC
> Não edite à mão — regras humanas vão em `manual/`.

> Tabelas do glossário e schema usado na auditoria código × schema: **banco real, snapshot de 2026-11-12T13:36:49Z**. Detalhe por tabela/função em `docs/contexto/supabase/`.

## Glossário do domínio (entidades do sistema)

| Termo | Significado / valores | Tamanho | Origem |
|---|---|---|---|
| `abc_activities` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `abc_activity_rates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `abc_cost_pools` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `abc_job_costs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `app_private.runtime_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 2 colunas | banco real |
| `archived_jobs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 33 colunas | banco real |
| `audit_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | banco real |
| `backup_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | banco real |
| `bitrix24_field_mappings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `bitrix24_oauth_states` | _(sem COMMENT ON TABLE — significado não documentado)_ | 2 colunas | banco real |
| `bitrix24_oauth_tokens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | banco real |
| `bitrix24_sync_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `blocked_ips` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | banco real |
| `business_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | banco real |
| `chat_messages` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `cron_health_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | banco real |
| `cron_p95_daily` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | banco real |
| `csp_violation_reports` | Relatórios de violação de CSP coletados pela edge function csp-report (report-uri). Sem policy de INSERT: apenas service role grava. | 15 colunas | banco real |
| `daily_summaries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | banco real |
| `dashboard_layouts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | banco real |
| `dashboard_presets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `document_versions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `edge_health_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `efficiency_alert_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | banco real |
| `energy_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | banco real |
| `energy_consumption` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | banco real |
| `energy_targets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | banco real |
| `error_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `feature_flags` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `gamification_rewards` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `geo_blocking_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `geo_blocking_rules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `geo_blocking_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `inventory_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | banco real |
| `inventory_movements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `ip_allowlist` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `job_status_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `job_status_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | banco real |
| `jobs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 32 colunas | banco real |
| `kpi_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `login_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `login_lockouts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `lot_components` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | banco real |
| `lot_movements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | banco real |
| `lot_quality_inspections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | banco real |
| `machine_downtime` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `machine_event_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `machine_health_metrics` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | banco real |
| `machine_predictions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | banco real |
| `machines` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | banco real |
| `maintenance_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `maintenance_checklist_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | banco real |
| `maintenance_checklists` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `maintenance_item_responses` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `maintenance_records` | _(sem COMMENT ON TABLE — significado não documentado)_ | 29 colunas | banco real |
| `maintenance_schedules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | banco real |
| `maintenance_types` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | banco real |
| `materials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | banco real |
| `new_device_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `operator_achievements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | banco real |
| `operator_goals` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `operator_machines` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | banco real |
| `operator_rankings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | banco real |
| `operator_skills` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `operator_status_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `packaging_checklist_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `packaging_defects` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | banco real |
| `packaging_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `packaging_sla_overrides` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | banco real |
| `packaging_task_checklist` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `packaging_tasks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | banco real |
| `password_reset_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `pre_production_checklists` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | banco real |
| `prediction_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `product_categories` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | banco real |
| `production_losses` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `production_lots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | banco real |
| `profiles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | banco real |
| `push_notifications` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `push_subscriptions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `qr_scan_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `query_telemetry` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | banco real |
| `rate_limit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `rate_limit_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `report_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `reward_redemptions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | banco real |
| `rls_test_results` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `role_permissions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `security_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `shift_checklist_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `shift_handover_checklist` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `shift_handovers` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | banco real |
| `shift_occurrences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | banco real |
| `shift_pending_tasks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | banco real |
| `shipments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | banco real |
| `shipping_providers` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | banco real |
| `spc_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | banco real |
| `spc_capability_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | banco real |
| `spc_control_parameters` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | banco real |
| `spc_measurements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | banco real |
| `system_metrics` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | banco real |
| `technical_conversations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | banco real |
| `technical_documents` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | banco real |
| `technical_messages` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | banco real |
| `technical_sheet_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `technical_sheet_audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | banco real |
| `technical_sheet_favorites` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | banco real |
| `technical_sheet_materials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `technical_sheet_steps` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `technical_sheet_tips` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | banco real |
| `technical_sheet_versions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | banco real |
| `technical_sheets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 29 colunas | banco real |
| `techniques` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | banco real |
| `telemetry_traces` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `tpm_execution_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | banco real |
| `tpm_execution_audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `tpm_execution_parts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `tpm_execution_supplies` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `tpm_executions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | banco real |
| `tpm_notification_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | banco real |
| `tpm_notification_queue` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | banco real |
| `tpm_notification_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | banco real |
| `tpm_notification_templates_published` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `tpm_parameter_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | banco real |
| `tpm_severity_configs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | banco real |
| `user_devices` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | banco real |
| `user_favorites` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | banco real |
| `user_mfa_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `user_notification_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | banco real |
| `user_roles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | banco real |
| `webhook_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | banco real |
| `app_role` (enum) | coordinator, operator, manager, admin |  | banco |
| `sheet_status` (enum) | draft, published, review_needed |  | banco |
| `skill_level` (enum) | basic, advanced, expert |  | banco |
| `CalendarGroupBy` (TS) | machine \| technique |  | `src/components/calendar/types.ts` |
| `ViewMode` (TS) | expanded \| compact |  | `src/components/kanban/KanbanFiltersBar.tsx` |
| `SwimlanesMode` (TS) | none \| technique \| machine |  | `src/components/kanban/KanbanFiltersBar.tsx` |
| `CommandCategory` (TS) | navigation \| actions \| settings \| recent \| contextual \| jobs \| search |  | `src/components/navigation/CommandPaletteCommands.tsx` |
| `HistoryPeriodPreset` (TS) | today \| 7d \| 30d \| all \| custom |  | `src/features/admin/components/audit/HistoryPeriodFilter.tsx` |
| `ActivityType` (TS) | create \| update \| delete \| view \| login \| logout \| settings \| error \| success \| warning |  | `src/features/admin/hooks/useActivityLog.ts` |
| `ExportFormat` (TS) | csv \| json |  | `src/features/admin/hooks/useDataExport.ts` |
| `MonitoringWindow` (TS) | 1h \| 24h \| 7d |  | `src/features/admin/hooks/useMonitoringData.ts` |
| `KPIPeriod` (TS) | day \| week \| month \| year \| all |  | `src/features/analytics/hooks/useKPIs.ts` |
| `ConnectionStatus` (TS) | connecting \| connected \| disconnected \| error |  | `src/features/analytics/hooks/useRealtimeConnection.ts` |
| `AppRole` (TS) | coordinator \| operator \| manager \| admin |  | `src/features/auth/types/auth.types.ts` |
| `InventoryCategory` (TS) | ink \| screen \| solvent \| consumable \| other |  | `src/features/inventory/hooks/useInventory.ts` |
| `SortField` (TS) | orderNumber \| client \| scheduledDate \| priority \| quantity \| created_at |  | `src/features/jobs/lib/pending-queue.ts` |
| `SortDirection` (TS) | asc \| desc |  | `src/features/jobs/lib/pending-queue.ts` |
| `SlaLevel` (TS) | ok \| warning \| overdue |  | `src/features/packaging/hooks/usePackagingSettings.ts` |
| `DELAY_CATEGORIES` (TS) | { value: 'atraso_producao', label: 'Atraso vindo da produção' }, { value: 'fila_manuseio', label: 'Fila no setor de manuseio' }, { value: 'retrabalho', label: 'Retrabalho / defeito' }, { value: 'falta_material', label: 'Falta de material de embalagem' }, { value: 'falta_operador', label: 'Falta de o … |  | `src/features/packaging/types/packaging.schema.ts` |
| `DowntimeType` (TS) | setup \| maintenance \| breakdown \| idle \| other |  | `src/features/production/hooks/useMachineDowntime.ts` |
| `GoalType` (TS) | efficiency \| jobs_completed \| pieces_produced \| loss_rate |  | `src/features/production/hooks/useOperatorGoals.ts` |
| `SkillLevel` (TS) | basic \| advanced \| expert |  | `src/features/production/hooks/useOperatorSkills.ts` |
| `HapticPattern` (TS) | light \| medium \| heavy \| selection \| success \| warning \| error |  | `src/hooks/use-haptic-feedback.tsx` |
| `SwipeDirection` (TS) | left \| right \| up \| down |  | `src/hooks/use-swipe-gesture.tsx` |
| `CircuitState` (TS) | closed \| open \| half_open |  | `src/lib/circuitBreaker.ts` |
| `ErrorSeverity` (TS) | info \| warning \| error \| critical |  | `src/lib/errorHandling.ts` |
| `LogLevel` (TS) | debug \| info \| warn \| error \| critical |  | `src/lib/logger.ts` |
| `NavBackVia` (TS) | button \| swipe \| hotkey \| breadcrumb \| mobile-header |  | `src/lib/navTelemetry.ts` |
| `SimulationSource` (TS) | bitrix24 \| stripe \| system \| unknown \| iot \| energy |  | `src/lib/simulation.ts` |
| `ReplayResult` (TS) | success \| retry \| conflict |  | `src/lib/offline/offlineQueue.ts` |
| `TransitionPreset` (TS) | fade \| slide \| zoom \| flip \| parallax \| blur-slide \| none |  | `src/lib/transitions/index.ts` |
| `TransitionEase` (TS) | linear \| easeIn \| easeOut \| easeInOut \| spring |  | `src/lib/transitions/index.ts` |
| `NavDirection` (TS) | forward \| backward \| up \| down |  | `src/lib/transitions/index.ts` |
| `JobStatus` (TS) | queue \| ready \| scheduled \| production \| finished \| paused \| cancelled \| delayed \| rework \| buffer \| packaging |  | `src/types/job.ts` |
| `JobPriority` (TS) | low \| medium \| high \| urgent |  | `src/types/job.ts` |
| `JobStatus` (TS) | queue \| ready \| scheduled \| production \| finished \| paused \| cancelled \| delayed \| rework \| buffer \| packaging |  | `src/types/scheduling.ts` |
| `UserRole` (TS) | coordinator \| operator \| manager |  | `src/types/scheduling.ts` |
| `TechniqueId` (TS) | silk-textile \| silk-vinyl-flat \| silk-vinyl-rotative \| silk-decal \| fiber-laser \| laser-co2 \| laser-uv \| tampo \| hot-stamp \| thermal-press \| sublimation-mug \| decal-oven \| dtf-uv-application \| dtf-textile \| dtf-uv \| cut-media |  | `src/types/scheduling.ts` |
| `ViewMode` (TS) | daily \| weekly \| kanban \| list \| occupancy \| alerts |  | `src/types/scheduling.ts` |
| `AppRole` (TS) | admin \| manager \| coordinator \| operator |  | `supabase/functions/_shared/auth.ts` |
| `Aal` (TS) | aal1 \| aal2 |  | `supabase/functions/_shared/auth.ts` |
| `LogLevel` (TS) | debug \| info \| warn \| error |  | `supabase/functions/_shared/logger.ts` |

## Dados de referência (seed — planos, categorias, perfis fixos)

| Tabela | Colunas | Valores | Origem |
|---|---|---|---|
| `business_config` | `key, value, description` | `('price_per_piece', '2.5', 'Preço médio por peça usado no estimatedRevenue dos KPIs') ON CONFLICT (key) DO NOTHING` | `supabase/migrations/20261001143300_seed_price_per_piece.sql` |
| `techniques` | `id, name, short_name, color, setup_time` | `('serigrafia', 'Serigrafia', 'SER', '#3b82f6', 15), ('sublimacao', 'Sublimação', 'SUB', '#a855f7', 12), ('tampografia','Tampografia', 'TAM', '#f97316', 10), ('flexo', 'Flexografia', 'FLX', '#22c55e', 18), ('laser', 'Gravação Laser', 'LSR', '#ef4444', 8), ('uv', 'UV DTF', 'UV', '#eab308', 12), ('dtf', 'DTF', 'DTF', '#06b6d4', 10), ('bordado', 'Bordado', 'BRD', '#ec4899', 20) ON CONFLICT (id) DO UPD …` | `supabase/seed.sql` |
| `business_config` | `key, value, description` | `('general_settings', '{"app_name":"FAST GRAVAÇÕES","timezone":"America/Sao_Paulo","locale":"pt-BR","default_period_days":30,"currency":"BRL"}'::jsonb, 'General application settings'), ('shift_settings', '{"shifts":[{"name":"Manhã","start":"07:00","end":"15:00"},{"name":"Tarde","start":"15:00","end":"23:00"},{"name":"Noite","start":"23:00","end":"07:00"}],"default_shift":"Manhã"}'::jsonb, 'Producti …` | `supabase/seed.sql` |
| `_seed_machines_stage` | `id, code, name, technique_id, is_active` | `('11111111-1111-1111-1111-111111111111', 'SER-01', 'Serigrafia 1', 'serigrafia', true), ('22222222-2222-2222-2222-222222222222', 'SER-02', 'Serigrafia 2', 'serigrafia', true), ('33333333-3333-3333-3333-333333333333', 'SUB-01', 'Sublimação 1', 'sublimacao', true), ('44444444-4444-4444-4444-444444444444', 'TAM-01', 'Tampografia 1', 'tampografia', true), ('55555555-5555-5555-5555-555555555555', 'TAM- …` | `supabase/seed.sql` |
| `jobs` | `id, order_number, client, product, quantity, technique_id, machine_id, scheduled_date, start_time, end_time, estimated_duration, status, priority, gravure_color, actual_start_time, actual_end_time, lost_pieces, notes, created_at, updated_at` | `('a1111111-1111-1111-1111-000000000001'::uuid, 'PED-2026-0741', 'Adidas Brasil', 'Camiseta Dry Fit', 500, 'serigrafia', v_ser1, v_today - 25, '09:00', '13:30', 195, 'finished', 'high', 'Branco 1 cor', v_today - 25, v_today - 25 + interval '4 hours 30 minutes', 12, NULL, now() - interval '25 days', now() - interval '25 days'), ('a1111111-1111-1111-1111-000000000002'::uuid, 'PED-2026-0742', 'Nike Br …` | `supabase/seed.sql` |
| `job_status_history` | `job_id, previous_status, new_status, changed_by, created_at` | `('a1111111-1111-1111-1111-000000000001'::uuid, 'queue', 'scheduled', NULL, now() - interval '26 days'), ('a1111111-1111-1111-1111-000000000001'::uuid, 'scheduled','production',NULL, now() - interval '25 days'), ('a1111111-1111-1111-1111-000000000001'::uuid, 'production','finished', NULL, now() - interval '25 days' + interval '4 hours 30 minutes'), ('a1111111-1111-1111-1111-000000000002'::uuid, 'qu …` | `supabase/seed.sql` |
| `machine_event_audit` | `machine_id, event_type, old_value, new_value, performed_by, performed_at` | `(v_ser1, 'activation', 'false', 'true', NULL, now() - interval '7 days'), (v_ser1, 'status_change','idle', 'running',NULL, now() - interval '25 days'), (v_ser1, 'status_change','running','idle', NULL, now() - interval '25 days' + interval '4 hours 30 minutes'), (v_sub1, 'activation', 'false', 'true', NULL, now() - interval '6 days'), (v_lsr1, 'activation', 'false', 'true', NULL, now() - interval ' …` | `supabase/seed.sql` |
| `inventory_items` | `id, name, category, current_stock, unit, min_stock_level, location, specification` | `('b0000001-0000-0000-0000-000000000001'::uuid, 'Tinta Serigráfica Branca Premium', 'ink', 8.5, 'kg', 5, 'Almoxarifado A', 'PVC Branco 150 mesh'), ('b0000001-0000-0000-0000-000000000002'::uuid, 'Tinta Serigráfica Azul Cyan', 'ink', 12.2, 'kg', 5, 'Almoxarifado A', 'PVC Azul Cyan 150 mesh'), ('b0000001-0000-0000-0000-000000000003'::uuid, 'Tinta Sublimação Full Color', 'ink', 3.8, 'l', 5, 'Almoxarifa …` | `supabase/seed.sql` |
| `inventory_movements` | `item_id, user_id, type, quantity, reason, job_id, created_at` | `('b0000001-0000-0000-0000-000000000001'::uuid, NULL, 'IN', 10.0, 'Compra mensal', NULL, now() - interval '20 days'), ('b0000001-0000-0000-0000-000000000002'::uuid, NULL, 'IN', 15.0, 'Reposição estoque', NULL, now() - interval '18 days'), ('b0000001-0000-0000-0000-000000000003'::uuid, NULL, 'OUT', 2.5, 'Pedido PED-2026-0742', 'a1111111-1111-1111-1111-000000000002'::uuid, now() - interval '22 days') …` | `supabase/seed.sql` |
| `energy_consumption` | `machine_id, recorded_at, consumption_kwh, power_factor, voltage, current_amps, peak_demand_kw, cost_per_kwh, reading_type` | `(v_ser1, now() - interval '30 days', 12.5, 0.92, 220, 8.2, 3.2, 0.85, 'automatic'), (v_ser1, now() - interval '25 days', 18.7, 0.93, 220, 10.5, 4.1, 0.85, 'automatic'), (v_ser1, now() - interval '20 days', 22.1, 0.94, 220, 12.1, 4.8, 0.85, 'automatic'), (v_ser1, now() - interval '15 days', 16.4, 0.92, 220, 9.8, 3.6, 0.85, 'automatic'), (v_ser1, now() - interval '10 days', 24.8, 0.95, 220, 13.4, 5. …` | `supabase/seed.sql` |

## Auditoria de consistência (código × schema) — trate como NÃO VERIFICADO

> `status`: inclui estados só de UI/realtime (ex.: `uploading`, `SUBSCRIBED`) que nunca vão ao banco — confira o arquivo antes de concluir que falta valor no enum.

| Tipo | Problema | Onde |
|---|---|---|
| status | valor `producing` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/dashboard/LiveMachineStatusPanel.tsx` |
| status | valor `upcoming` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/design-system/hooks/MaintenanceOperatorDemos.tsx`<br>`escreve:src/components/design-system/hooks/MaintenanceOperatorDemos.tsx` |
| status | valor `Bom` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/design-system/sections/code-quality/CodeQualityPerformanceTab.tsx` |
| status | valor `Pago` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/design-system/sections/tables/InteractiveTables.tsx`<br>`escreve:src/components/design-system/sections/tables/BasicAndStripedTables.tsx`<br>`escreve:src/components/design-system/sections/tables/InteractiveTables.tsx` |
| status | valor `Pendente` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/design-system/sections/tables/InteractiveTables.tsx`<br>`escreve:src/components/design-system/sections/tables/BasicAndStripedTables.tsx`<br>`escreve:src/components/design-system/sections/tables/InteractiveTables.tsx` |
| status | valor `Cancelado` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/design-system/sections/tables/BasicAndStripedTables.tsx`<br>`escreve:src/components/design-system/sections/tables/InteractiveTables.tsx` |
| status | valor `delivered` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/logistics/EditShipmentModal.tsx`<br>`compara:src/pages/LogisticsPage.tsx` |
| status | valor `good` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/operator/ProductionTimer.tsx` |
| status | valor `Conectado` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/settings/SettingsBackupTab.tsx` |
| status | valor `Configurar` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/settings/SettingsBackupTab.tsx` |
| status | valor `verified` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/settings/TwoFactorSetup.tsx`<br>`compara:src/components/traceability/BlockchainIntegrityCard.tsx`<br>`compara:src/features/admin/components/security/MFASettings.tsx`<br>`compara:src/features/auth/hooks/useAuthenticatorAssuranceLevel.ts` |
| status | valor `syncing` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/components/traceability/BlockchainIntegrityCard.tsx` |
| status | valor `active` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/traceability/TraceabilityStatsCards.tsx`<br>`compara:src/pages/TraceabilityPage.tsx` |
| status | valor `quarantine` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/traceability/TraceabilityStatsCards.tsx` |
| status | valor `blocked` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/traceability/TraceabilityStatsCards.tsx` |
| status | valor `Equilibrado` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/features/analytics/components/bi/FuturisticBI.tsx` |
| status | valor `string` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/features/analytics/hooks/useBottleneckPrediction.ts`<br>`compara:src/features/analytics/hooks/useKPIs.ts`<br>`compara:src/features/analytics/hooks/useLoadBalancing.ts`<br>`compara:src/features/jobs/hooks/useSmartSequencing.ts` |
| status | valor `fulfilled` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/features/auth/components/AuthProvider.tsx`<br>`compara:src/hooks/abc/useABCMutations.ts`<br>`compara:src/pages/KanbanBoard.tsx`<br>`compara:supabase/functions/send-email-report/index.ts` |
| status | valor `correction_requested` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/features/maintenance/components/ExecutionDetailsModal.tsx`<br>`compara:src/features/maintenance/components/ExecutionRecordView.tsx`<br>`escreve:src/features/maintenance/hooks/useTPMApprovalMutations.ts` |
| status | valor `processing` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/features/maintenance/components/TPMNotificationQueue.tsx` |
| status | valor `failed` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/features/maintenance/components/TPMNotificationQueue.tsx`<br>`escreve:supabase/functions/tpm-notifications/index.ts` |
| status | valor `sent` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/features/maintenance/components/TPMNotificationQueue.tsx`<br>`escreve:supabase/functions/cron-alert-email/index.ts`<br>`escreve:supabase/functions/send-email-report/index.ts`<br>`escreve:supabase/functions/tpm-notifications/index.ts` |
| status | valor `read` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/features/notifications/hooks/useNotifications.ts`<br>`escreve:src/features/notifications/hooks/useNotifications.ts`<br>`filtra:src/features/notifications/hooks/useNotifications.ts` |
| status | valor `normal` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:src/hooks/useTechniqueCapacityAlerts.ts` |
| status | valor `concluido` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/CodeQualityDashboard.tsx`<br>`escreve:src/pages/CodeQualityDashboard.tsx` |
| status | valor `in_transit` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/LogisticsPage.tsx` |
| status | valor `returned` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/LogisticsPage.tsx` |
| status | valor `SUBSCRIBED` para `status` usado no código não existe em nenhum enum do banco/TS | `compara:src/pages/NotificationsPage.tsx` |
| status | valor `not_implemented` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/image-optimizer/index.ts` |
| status | valor `sending` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/send-push-notification/index.ts` |
| status | valor `logged_only` para `status` usado no código não existe em nenhum enum do banco/TS | `escreve:supabase/functions/webhook-handler/index.ts` |
| status | valor `loading` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/design-system/hooks/PredictionHooksDemos.tsx` |
| status | valor `retrying` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/design-system/hooks/PredictionHooksDemos.tsx` |
| status | valor `suspended` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/layout/QuickFavoritesBar.tsx`<br>`compara:src/features/notifications/hooks/useNotificationSounds.ts`<br>`compara:src/hooks/useThemeSound.ts`<br>`compara:src/lib/soundFeedback.ts` |
| status | valor `collapsed` para `state` usado no código não existe em nenhum enum do banco/TS | `compara:src/components/ui/sidebar.tsx` |
| status | valor `failed` para `login_status` usado no código não existe em nenhum enum do banco/TS | `filtra:src/features/admin/hooks/useMonitoringData.ts` |
| coluna | coluna `processed` usada no código não existe no schema de `tpm_notification_queue` |  |
| tabela | tabela `backups` usada no código não existe no banco real (snapshot) | `supabase/functions/backup-scheduler/index.ts` |
| tabela | tabela `erp_api_keys` usada no código não existe no banco real (snapshot) | `supabase/functions/erp-api/index.ts` |
| rls | `inventory_movements`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/features/inventory/hooks/useInventory.ts` |
| rls | `inventory_movements`: front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/features/inventory/hooks/useInventory.ts` |
| rls | `profiles`: front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/components/settings/UserManagement.tsx` |
| rls | `tpm_notification_templates_published`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/features/maintenance/components/TPMNotificationTemplates.tsx` |
| rpc | RPC `count_active_operators_since` chamada mas não definida no banco real (snapshot) | `supabase/functions/metrics-collector/index.ts` |
| rpc | RPC `count_running_machines` chamada mas não definida no banco real (snapshot) | `supabase/functions/metrics-collector/index.ts` |
| rpc | RPC `increment_job_lost_pieces` chamada mas não definida no banco real (snapshot) | `src/features/production/hooks/useProductionLosses.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/features/admin/hooks/useDataExport.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/features/admin/hooks/useDataImport.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/hooks/useBulkActions.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/pages/ReportBuilderPage.tsx` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/backup-scheduler/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/excel-export/index.ts` |
| segurança | função `app_private.runtime_config_get` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `docs/contexto/supabase/functions/app_private/runtime_config_get__8ddb4bac95115aff.sql` |
| segurança | função `auto_reassign_stale_packaging_tasks` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `docs/contexto/supabase/functions/public/auto_reassign_stale_packaging_tasks__12ae32cb1ec02d01.sql` |
| segurança | função `notify_loss_risk` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `docs/contexto/supabase/functions/public/notify_loss_risk__12ae32cb1ec02d01.sql` |
| segurança | função `trigger_auto_promotion` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `docs/contexto/supabase/functions/public/trigger_auto_promotion__12ae32cb1ec02d01.sql` |
| segurança | função `trigger_send_tpm_email` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `docs/contexto/supabase/functions/public/trigger_send_tpm_email__12ae32cb1ec02d01.sql` |
| webhook | edge function `external-db-bridge` processa eventos de webhook sem sinal de idempotência (evento duplicado = efeito duplicado) | `supabase/functions/external-db-bridge/index.ts` |

## Lacunas — o que este contexto NÃO consegue responder (perguntas para o dono do negócio)

- `archived_jobs.shipping_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `bitrix24_oauth_states.state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `cron_health_history.last_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `job_status_audit.old_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `job_status_audit.new_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `job_status_history.previous_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `job_status_history.new_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `jobs.shipping_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `login_audit.login_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `maintenance_records.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `production_lots.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `push_notifications.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `reward_redemptions.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `shipments.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `technical_sheet_steps.step_number` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `telemetry_traces.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `tpm_executions.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `tpm_notification_queue.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- 130/131 tabelas sem `COMMENT ON TABLE` — o significado de negócio não está no schema: `abc_activities`, `abc_activity_rates`, `abc_cost_pools`, `abc_job_costs`, `app_private.runtime_config`, `archived_jobs`, `audit_log`, `backup_logs`, `bitrix24_field_mappings`, `bitrix24_oauth_states`, `bitrix24_oauth_tokens`, `bitrix24_sync_history` …
- Há tabelas usadas no código que não existem no banco real (snapshot) — a chamada falha em produção ou a tabela ainda não foi criada.

## Regras manuais presentes

- `manual/regras-implementadas-2026-11.md`
