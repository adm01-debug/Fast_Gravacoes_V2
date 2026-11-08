# 11 · GLOSSÁRIO, DADOS DE REFERÊNCIA E LACUNAS

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `bce2374601` · branch `main` · 2026-11-08 15:40 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Glossário do domínio (entidades do sistema)

| Termo | Significado / valores | Tamanho | Origem |
|---|---|---|---|
| `abc_activities` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `abc_activity_rates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `abc_cost_pools` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `abc_job_costs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `app_private.runtime_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 2 colunas | migration |
| `archived_jobs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 1 colunas | migration |
| `audit_log` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `backup_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `bitrix24_field_mappings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `bitrix24_oauth_states` | _(sem COMMENT ON TABLE — significado não documentado)_ | 2 colunas | migration |
| `bitrix24_oauth_tokens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `bitrix24_sync_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `blocked_ips` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `business_config` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `chat_messages` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `cron_health_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `cron_p95_daily` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `csp_violation_reports` | Relatórios de violação de CSP coletados pela edge function csp-report (report-uri). Sem policy de INSERT: apenas service role grava. | 15 colunas | migration |
| `daily_summaries` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `dashboard_layouts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `dashboard_presets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `document_versions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `edge_health_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `efficiency_alert_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `email_verification_tokens` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | types.ts |
| `energy_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `energy_consumption` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `energy_targets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `erp_api_keys` | Stores SHA-256 hashed API keys for ERP integration authentication. | 7 colunas | migration |
| `error_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `feature_flags` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `gamification_rewards` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `gamification_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | types.ts |
| `geo_blocking_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `geo_blocking_rules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `geo_blocking_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `inventory_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `inventory_movements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `ip_allowlist` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `job_status_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `job_status_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `jobs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 31 colunas | migration |
| `kpi_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `login_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `login_lockouts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `lot_components` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `lot_movements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `lot_quality_inspections` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `machine_downtime` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `machine_event_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `machine_health_metrics` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `machine_predictions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `machines` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `maintenance_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `maintenance_checklist_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `maintenance_checklists` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `maintenance_item_responses` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `maintenance_records` | _(sem COMMENT ON TABLE — significado não documentado)_ | 29 colunas | migration |
| `maintenance_schedules` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `maintenance_types` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `materials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `new_device_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `operator_achievements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `operator_goals` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `operator_machines` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `operator_rankings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `operator_skills` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `operator_status_audit` | Audit log tracking operator status changes (activation, deactivation, removal) | 11 colunas | migration |
| `packaging_checklist_items` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `packaging_defects` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `packaging_equipment` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | types.ts |
| `packaging_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `packaging_sla_overrides` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `packaging_task_checklist` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `packaging_tasks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 18 colunas | migration |
| `packaging_waste` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | types.ts |
| `password_reset_requests` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `pre_production_checklists` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `prediction_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `product_categories` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `production_losses` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `production_lots` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `profiles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `push_notifications` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `push_subscriptions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `qr_scan_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `query_telemetry` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `rate_limit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `rate_limit_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `report_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `reward_redemptions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `rls_test_results` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `role_permissions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `security_events` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `shift_checklist_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `shift_handover_checklist` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `shift_handovers` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `shift_occurrences` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `shift_pending_tasks` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `shipment_costs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | types.ts |
| `shipments` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `shipping_providers` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `spc_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `spc_capability_history` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `spc_control_parameters` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `spc_measurements` | _(sem COMMENT ON TABLE — significado não documentado)_ | 16 colunas | migration |
| `system_metrics` | _(sem COMMENT ON TABLE — significado não documentado)_ | 3 colunas | migration |
| `technical_conversations` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `technical_documents` | _(sem COMMENT ON TABLE — significado não documentado)_ | 17 colunas | migration |
| `technical_messages` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `technical_sheet_audit` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `technical_sheet_audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `technical_sheet_favorites` | _(sem COMMENT ON TABLE — significado não documentado)_ | 4 colunas | migration |
| `technical_sheet_materials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `technical_sheet_steps` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `technical_sheet_tips` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `technical_sheet_versions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 6 colunas | migration |
| `technical_sheets` | _(sem COMMENT ON TABLE — significado não documentado)_ | 29 colunas | migration |
| `techniques` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | migration |
| `telemetry_traces` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `tpm_execution_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `tpm_execution_audit_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `tpm_execution_checklist` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | types.ts |
| `tpm_execution_parts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `tpm_execution_supplies` | _(sem COMMENT ON TABLE — significado não documentado)_ | 12 colunas | migration |
| `tpm_executions` | _(sem COMMENT ON TABLE — significado não documentado)_ | 19 colunas | migration |
| `tpm_notification_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `tpm_notification_queue` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `tpm_notification_templates` | _(sem COMMENT ON TABLE — significado não documentado)_ | 10 colunas | migration |
| `tpm_notification_templates_published` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `tpm_parameter_alerts` | _(sem COMMENT ON TABLE — significado não documentado)_ | 13 colunas | migration |
| `tpm_severity_configs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 8 colunas | migration |
| `user_devices` | _(sem COMMENT ON TABLE — significado não documentado)_ | 14 colunas | migration |
| `user_favorites` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `user_mfa_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
| `user_notification_settings` | _(sem COMMENT ON TABLE — significado não documentado)_ | 11 colunas | migration |
| `user_roles` | _(sem COMMENT ON TABLE — significado não documentado)_ | 5 colunas | migration |
| `webauthn_challenges` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | types.ts |
| `webauthn_credentials` | _(sem COMMENT ON TABLE — significado não documentado)_ | 9 colunas | types.ts |
| `webhook_logs` | _(sem COMMENT ON TABLE — significado não documentado)_ | 7 colunas | migration |
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
| tabela | tabela `a` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `backups` usada no código não existe nas migrations/types do repo | `supabase/functions/backup-scheduler/index.ts` |
| tabela | tabela `contacts` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `dashboard_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `emails` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `fantasma` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `fixture_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `ghost_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `payments` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `runtime_table` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `so_teste` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `t` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `t1` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| tabela | tabela `tools_runtime` usada no código não existe nas migrations/types do repo | `scripts/ai-context/gerar.unit.mjs` |
| tabela | tabela `tx` usada no código não existe nas migrations/types do repo | `scripts/ai-context/cenarios.mjs` |
| rls | `erp_api_keys`: RLS ligado sem nenhuma política → só service_role acessa |  |
| rls | `geo_blocking_logs`: front faz SELECT mas nenhuma política RLS permite SELECT → vai falhar/retornar vazio para usuários | `src/features/admin/hooks/useGeoBlocking.ts` |
| rls | `inventory_movements`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/features/inventory/hooks/useInventory.ts` |
| rls | `inventory_movements`: front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/features/inventory/hooks/useInventory.ts` |
| rls | `profiles`: front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/components/settings/UserManagement.tsx` |
| rls | `tpm_notification_templates_published`: front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/features/maintenance/components/TPMNotificationTemplates.tsx` |
| edge | edge function `dashboard-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `fixture-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `ghost-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `inexistente` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `literal-name` invocada mas não existe em supabase/functions/ | `scripts/graphify/tests/test_integration.py` |
| edge | edge function `orphan-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `other` invocada mas não existe em supabase/functions/ | `scripts/ai-context/cenarios.mjs` |
| edge | edge function `runtime-fn` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `runtime-missing` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `send-email` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| edge | edge function `sync-jobs` invocada mas não existe em supabase/functions/ | `scripts/graphify/tests/test_integration.py` |
| edge | edge function `template-name` invocada mas não existe em supabase/functions/ | `scripts/graphify/tests/test_integration.py` |
| edge | edge function `tools-edge` invocada mas não existe em supabase/functions/ | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `dashboard_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `demo` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/test_snapshot.py` |
| rpc | RPC `fixture_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `fn` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/snapshot.py` |
| rpc | RPC `ghost_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `is_admin` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `nome` chamada mas não definida nas migrations/types | `scripts/supabase_snapshot/snapshot.py` |
| rpc | RPC `r1` chamada mas não definida nas migrations/types | `scripts/ai-context/cenarios.mjs` |
| rpc | RPC `runtime_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| rpc | RPC `tools_rpc` chamada mas não definida nas migrations/types | `scripts/ai-context/gerar.unit.mjs` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `scripts/regras_negocio/generate.py` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/features/admin/hooks/useDataExport.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/features/admin/hooks/useDataImport.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/hooks/useBulkActions.ts` |
| dinâmico | 2 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `src/pages/ReportBuilderPage.tsx` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/backup-scheduler/index.ts` |
| dinâmico | 1 chamada(s) `.from(variável)` — tabela só conhecida em runtime | `supabase/functions/excel-export/index.ts` |
| segurança | função `notify_tpm_email` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260508115941_72493014-c1ac-4815-aab4-748637090416.sql` |
| segurança | função `trigger_send_tpm_email` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261019140000_validation_hardening.sql` |
| segurança | função `audit_tpm_execution_changes` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260508130112_1bb71df0-47bb-4121-9d87-b4c184c45325.sql` |
| segurança | função `notify_loss_risk` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008160000_runtime_config_edge_auth.sql` |
| segurança | função `log_technical_sheet_change` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260509120259_98878e05-6d31-44ea-971c-c50d9f484741.sql` |
| segurança | função `audit_technical_sheet_changes` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260509121606_76a3170f-ee88-4c8e-b50e-dc58317e4d7c.sql` |
| segurança | função `increment_sheet_view_count` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260509121953_b8753901-5152-47a8-9b24-9de24614e2cb.sql` |
| segurança | função `update_inventory_stock` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260509124023_04666a2c-f77e-47dc-88f8-dd50f6615c3d.sql` |
| segurança | função `check_job_overlap` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260511192402_c6c4fbcf-9983-4e89-9e99-ea48b6af942d.sql` |
| segurança | função `trigger_auto_promotion` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008160000_runtime_config_edge_auth.sql` |
| segurança | função `create_technical_sheet_version` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260512163310_dd03391e-12f0-470b-9f53-6e6371248d69.sql` |
| segurança | função `audit_logistics_changes` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260512174222_10c215dd-dab4-4535-9789-a63c68021a74.sql` |
| segurança | função `audit_job_status_change` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260516174623_70372cef-5273-4e8f-8a85-b425f24bdae6.sql` |
| segurança | função `validate_stock_before_movement` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260514211903_477568e2-65ad-42f1-ba19-c4d35bc22e9f.sql` |
| segurança | função `log_job_status_change` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260516172507_1193e061-8bc4-44b8-9cf5-ba855879c3bb.sql` |
| segurança | função `check_and_notify_kpi_alert` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260516174623_70372cef-5273-4e8f-8a85-b425f24bdae6.sql` |
| segurança | função `audit_job_changes` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260516180359_c5765536-5948-4b13-8df3-c01302f21cf6.sql` |
| segurança | função `audit_machine_changes` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260516180359_c5765536-5948-4b13-8df3-c01302f21cf6.sql` |
| segurança | função `update_audit_hash` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260520000001_security_rls_indexes_fixes.sql` |
| segurança | função `increment_job_lost_pieces` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20260531000001_add_increment_job_lost_pieces_rpc.sql` |
| segurança | função `runtime_config_get` é SECURITY DEFINER sem `set search_path` (risco de escalação) | `supabase/migrations/20261008160000_runtime_config_edge_auth.sql` |
| webhook | edge function `external-db-bridge` processa eventos de webhook sem sinal de idempotência (evento duplicado = efeito duplicado) | `supabase/functions/external-db-bridge/index.ts` |

## Lacunas — o que este contexto NÃO consegue responder (perguntas para o dono do negócio)

- Nenhuma regra manual em `manual/`: prazos, limites, exceções comerciais, quem aprova o quê — só o negócio sabe.
- `jobs.shipping_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `technical_sheet_steps.step_number` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `maintenance_records.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `production_lots.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `push_notifications.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `login_audit.login_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `tpm_notification_templates.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `tpm_notification_queue.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `tpm_executions.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `reward_redemptions.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `shipments.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `job_status_history.previous_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `job_status_history.new_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `telemetry_traces.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `job_status_audit.old_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `job_status_audit.new_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `cron_health_history.last_status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `bitrix24_oauth_states.state` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- `packaging_equipment.status` é uma coluna de status sem enum/CHECK — os valores válidos e as transições permitidas não estão no banco.
- 137/140 tabelas sem `COMMENT ON TABLE` — o significado de negócio não está no schema: `techniques`, `machines`, `jobs`, `profiles`, `user_roles`, `efficiency_alert_history`, `technical_conversations`, `technical_messages`, `qr_scan_history`, `bitrix24_sync_history`, `bitrix24_oauth_tokens`, `bitrix24_field_mappings` …
- Há tabelas usadas no código sem migration no repo — o schema real pode ter sido alterado pelo painel.

## Regras manuais presentes

_nenhuma — copie `manual/TEMPLATE-regras-de-negocio.md`_
