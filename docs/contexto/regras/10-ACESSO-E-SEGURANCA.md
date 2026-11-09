# 10 · ACESSO E SEGURANÇA — quem pode o quê

> Gerado automaticamente por AI Context Sync v1.3.2 · commit `dcdf3a3e60` · branch `main` · 2026-11-09 05:22 UTC
> Não edite à mão — regras humanas vão em `manual/`.

## Perfis / roles identificados

`admin`, `assistant`, `coordinator`, `denied`, `g`, `granted`, `manager`, `operator`, `p`, `perm`, `role`, `target`, `user`

- Tabelas de perfil/permissão: `user_roles`, `role_permissions`
- Colunas de perfil: `user_roles.role` (app_role NOT NULL DEFAULT 'operator'), `technical_messages.role` (TEXT NOT NULL CHECK (role IN ('user', 'assistant'))), `role_permissions.role` (app_role NOT NULL), `rls_test_results.role` (TEXT NOT NULL)
- Claims do JWT usados em políticas/funções: `aal`
- Funções usadas dentro de políticas RLS (a regra real está no corpo delas — veja `06`): `has_any_active_role`, `has_role`

## Matriz tabela × operação → quem pode (derivada das políticas RLS)

| Tabela | RLS | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `abc_activities` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `abc_activity_rates` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `abc_cost_pools` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `abc_job_costs` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `app_private.runtime_config` | não encontrado | sem RLS | sem RLS | sem RLS | sem RLS |
| `archived_jobs` | enabled | public: app_private.has_role(auth.uid(), 'manager'::public.app_role) OR app_private.has_role(auth.uid(), 'admin'::public.app_role) | — | — | — |
| `audit_log` | enabled | public: false<br>authenticated: app_private.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR app_private.has_role((SELECT auth.uid()), 'manager'::ap | public: false | public: false | public: false |
| `backup_logs` | enabled | public: app_private.has_role(auth.uid(), 'manager'::public.app_role) OR app_private.has_role(auth.uid(), 'admin'::public.app_role) | — | — | — |
| `bitrix24_field_mappings` | enabled | authenticated: has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: true | authenticated: has_role(auth.uid(), 'coordinator'::app_role) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) |
| `bitrix24_oauth_states` | enabled | public: false | public: false | public: false | public: false |
| `bitrix24_oauth_tokens` | enabled | public: false | public: false | public: false | public: false |
| `bitrix24_sync_history` | enabled | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | authenticated: public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') | authenticated: public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') | — |
| `blocked_ips` | enabled | public: has_role(auth.uid(), 'coordinator')<br>public: has_role(auth.uid(), 'manager') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `business_config` | enabled | authenticated: true | — | authenticated: public.has_role(auth.uid(), 'manager') | — |
| `chat_messages` | enabled | authenticated: true | authenticated: auth.uid() = sender_id | authenticated: auth.uid() = sender_id | — |
| `cron_health_history` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') | — | — | — |
| `cron_p95_daily` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') | — | — | — |
| `csp_violation_reports` | enabled | — | — | — | — |
| `daily_summaries` | enabled | authenticated: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) |
| `dashboard_layouts` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | — |
| `dashboard_presets` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `document_versions` | enabled | public: has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: public.has_any_active_role() AND EXISTS ( SELECT 1 FROM public.technical_documents td WHERE td.id = document_versions.documen | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) |
| `edge_health_history` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') | — | — | — |
| `efficiency_alert_history` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') | authenticated: public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') | — |
| `email_verification_tokens` | enabled | public: auth.uid() = user_id<br>authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id |
| `energy_alerts` | enabled | authenticated: public.has_any_active_role()<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() |
| `energy_consumption` | enabled | public: has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) |
| `energy_targets` | enabled | public: has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) |
| `erp_api_keys` | enabled | — | — | — | — |
| `error_logs` | enabled | public: auth.uid() = user_id | public: auth.uid() IS NOT NULL | — | — |
| `feature_flags` | enabled | authenticated: true<br>authenticated: public.has_role(auth.uid(), 'manager') | authenticated: public.has_role(auth.uid(), 'manager') | authenticated: public.has_role(auth.uid(), 'manager') | authenticated: public.has_role(auth.uid(), 'manager') |
| `gamification_rewards` | enabled | authenticated: is_active = true AND public.has_any_active_role() | — | — | — |
| `gamification_settings` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `geo_blocking_logs` | enabled | — | authenticated: user_id = auth.uid() OR user_id IS NULL OR app_private.has_role(auth.uid(),'coordinator'::app_role) OR app_private.has_role(a | — | — |
| `geo_blocking_rules` | enabled | authenticated: app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_pri | authenticated: app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_pri | authenticated: app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_pri | authenticated: app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_pri |
| `geo_blocking_settings` | enabled | authenticated: app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_pri | authenticated: app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_pri | authenticated: app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_pri | authenticated: app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role) OR app_pri |
| `inventory_items` | enabled | authenticated: public.has_any_active_role()<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.ui | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.ui | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.ui | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.ui |
| `inventory_movements` | enabled | authenticated: public.has_any_active_role() | — | — | — |
| `ip_allowlist` | enabled | public: has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager')<br>public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `job_status_audit` | enabled | authenticated, anon: false<br>authenticated: public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role) | authenticated, anon: false | authenticated, anon: false | authenticated, anon: false |
| `job_status_history` | enabled | authenticated: true | — | — | — |
| `jobs` | enabled | authenticated: true | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)<br>authenticated: has_role(auth.uid(), 'operator'::app_role) AND machine_id IN ( SELECT machine_id FROM public.operator_machines WHERE operator | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) |
| `kpi_alerts` | enabled | authenticated: public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') | — | — | — |
| `login_audit` | enabled | public: auth.uid() = user_id<br>public: has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager') | authenticated: auth.uid() IS NOT NULL<br>authenticated: user_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role | — | — |
| `login_lockouts` | enabled | public: false | public: false | public: false | public: false |
| `lot_components` | enabled | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) |
| `lot_movements` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_any_active_role() | — | — |
| `lot_quality_inspections` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role()<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role() | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role() | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role() |
| `machine_downtime` | enabled | authenticated: true<br>authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() |
| `machine_event_audit` | enabled | authenticated: public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role) | — | — | — |
| `machine_health_metrics` | enabled | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') |
| `machine_predictions` | enabled | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') |
| `machines` | enabled | authenticated: has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: true | authenticated: has_role(auth.uid(), 'coordinator'::app_role) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) |
| `maintenance_alerts` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') | authenticated: public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') | — |
| `maintenance_checklist_items` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `maintenance_checklists` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `maintenance_item_responses` | enabled | authenticated: public.has_any_active_role()<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() |
| `maintenance_records` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_any_active_role() | authenticated: performed_by = auth.uid() OR approver_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.ui | — |
| `maintenance_schedules` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true<br>public: app_private.has_role(auth.uid(), 'manager'::public.app_role)<br>public: app_private.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'coordinator')<br>public: app_private.has_role(auth.uid(), 'manager'::public.app_role)<br>public: app_private.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'coordinator')<br>public: app_private.has_role(auth.uid(), 'manager'::public.app_role)<br>public: app_private.has_role(auth.uid(), 'admin'::public.app_role) | public: has_role(auth.uid(), 'coordinator')<br>public: app_private.has_role(auth.uid(), 'manager'::public.app_role)<br>public: app_private.has_role(auth.uid(), 'admin'::public.app_role) |
| `maintenance_types` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `materials` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `new_device_alerts` | enabled | public: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | — |
| `operator_achievements` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') |
| `operator_goals` | enabled | public: has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) |
| `operator_machines` | enabled | public: has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) |
| `operator_rankings` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') |
| `operator_skills` | enabled | public: public.has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: public.has_role(auth.uid(), 'coordinator') | public: public.has_role(auth.uid(), 'coordinator') | public: public.has_role(auth.uid(), 'coordinator') |
| `operator_status_audit` | enabled | public: has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager') | public: has_role(auth.uid(), 'coordinator') | — | — |
| `packaging_checklist_items` | enabled | authenticated: public.has_any_active_role()<br>authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') |
| `packaging_defects` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_any_active_role() AND EXISTS ( SELECT 1 FROM public.packaging_tasks t WHERE t.id = packaging_defects.packaging_tas<br>authenticated: true<br>authenticated: EXISTS ( SELECT 1 FROM public.packaging_tasks WHERE id = packaging_task_id AND (assigned_to = auth.uid() OR public.has_role(a | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'operator') AND reported_by = auth.uid() AND EXISTS ( SELECT 1 FROM public.packaging_tasks t WHER<br>authenticated: EXISTS ( SELECT 1 FROM public.packaging_tasks WHERE id = packaging_task_id AND (assigned_to = auth.uid() OR public.has_role(a | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: EXISTS ( SELECT 1 FROM public.packaging_tasks WHERE id = packaging_task_id AND (assigned_to = auth.uid() OR public.has_role(a | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: EXISTS ( SELECT 1 FROM public.packaging_tasks WHERE id = packaging_task_id AND (assigned_to = auth.uid() OR public.has_role(a |
| `packaging_equipment` | enabled | authenticated: true | — | — | — |
| `packaging_settings` | enabled | authenticated: public.has_any_active_role()<br>authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') |
| `packaging_sla_overrides` | enabled | authenticated: public.has_any_active_role() | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') |
| `packaging_task_checklist` | enabled | authenticated: public.has_any_active_role()<br>authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'operator | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'operator | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'operator | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'operator |
| `packaging_tasks` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_any_active_role() AND (assigned_to IS NULL OR assigned_to = auth.uid()) | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: public.has_role(auth.uid(), 'operator') AND (assigned_to IS NULL OR assigned_to = auth.uid()) | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') |
| `packaging_waste` | enabled | authenticated: true | authenticated: has_any_active_role() and (operator_id is null or operator_id = auth.uid()) | — | — |
| `password_reset_requests` | enabled | public: has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager') | anon, authenticated: status = 'pending' | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: app_private.has_role(auth.uid(),'coordinator') OR app_private.has_role(auth.uid(),'manager') | — |
| `pre_production_checklists` | enabled | authenticated: true | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | — |
| `prediction_history` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator')<br>public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') |
| `product_categories` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `production_losses` | enabled | authenticated: true | authenticated: public.has_any_active_role() | — | — |
| `production_lots` | enabled | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) |
| `profiles` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('coordinator', 'manager', 'admin') <br>public: auth.uid() = id<br>public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)<br>authenticated: id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid | public: auth.uid() = id | public: auth.uid() = id<br>public: auth.uid() = id | — |
| `push_notifications` | enabled | public: auth.uid() = user_id | authenticated: user_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `push_subscriptions` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `qr_scan_history` | enabled | authenticated: true | authenticated: auth.uid() = operator_id | — | — |
| `query_telemetry` | enabled | authenticated: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | authenticated: auth.uid() IS NOT NULL<br>authenticated: user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') | — | authenticated: has_role(auth.uid(), 'coordinator'::app_role) |
| `rate_limit_logs` | enabled | public: has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager') | authenticated: auth.uid() IS NOT NULL<br>authenticated: user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') | — | — |
| `rate_limit_settings` | enabled | public: has_role(auth.uid(), 'coordinator')<br>public: has_role(auth.uid(), 'manager') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `report_templates` | enabled | public: auth.uid() = user_id OR is_public = true | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `reward_redemptions` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | — | — |
| `rls_test_results` | enabled | authenticated: true | — | — | — |
| `role_permissions` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `security_events` | enabled | public: has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager') | authenticated: auth.uid() IS NOT NULL<br>authenticated: user_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role | — | — |
| `shift_checklist_templates` | enabled | public: has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: true<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) |
| `shift_handover_checklist` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role()<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role() | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role() | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role() |
| `shift_handovers` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: auth.uid() IS NOT NULL | public: outgoing_operator_id = auth.uid() OR incoming_operator_id = auth.uid() OR has_role(auth.uid(), 'coordinator'::app_role) | — |
| `shift_occurrences` | enabled | authenticated: public.has_any_active_role()<br>authenticated: public.has_any_active_role()<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_any_active_role()<br>authenticated: EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id AND (h.outgoing_operator_id = auth.uid() OR h.incomin | authenticated: public.has_any_active_role()<br>authenticated: EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id AND (h.outgoing_operator_id = auth.uid() OR h.incomin | authenticated: public.has_any_active_role()<br>authenticated: public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') |
| `shift_pending_tasks` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role()<br>authenticated: public.has_any_active_role()<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role()<br>authenticated: EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id AND (h.outgoing_operator_id = auth.uid() OR h.incomin | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role()<br>authenticated: EXISTS (SELECT 1 FROM public.shift_handovers h WHERE h.id = handover_id AND (h.outgoing_operator_id = auth.uid() OR h.incomin | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: public.has_any_active_role()<br>authenticated: public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') |
| `shipment_costs` | enabled | authenticated: true<br>authenticated: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) |
| `shipments` | enabled | authenticated: public.has_any_active_role()<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.ui | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.ui | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.ui | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.ui |
| `shipping_providers` | enabled | authenticated: public.has_any_active_role()<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) |
| `spc_alerts` | enabled | authenticated: public.has_role(auth.uid(), 'coordinator')<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_role(auth.uid(), 'coordinator') | authenticated: public.has_role(auth.uid(), 'coordinator') | authenticated: public.has_role(auth.uid(), 'coordinator') |
| `spc_capability_history` | enabled | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | public: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') |
| `spc_control_parameters` | enabled | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) |
| `spc_measurements` | enabled | authenticated: true<br>authenticated: EXISTS ( SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND is_active = true ) | authenticated: public.has_any_active_role()<br>authenticated: operator_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_ | — | — |
| `system_metrics` | enabled | public: app_private.has_role(auth.uid(), 'manager'::public.app_role) OR app_private.has_role(auth.uid(), 'admin'::public.app_role) | — | — | — |
| `technical_conversations` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `technical_documents` | enabled | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)<br>authenticated: public.has_any_active_role() AND ( status = 'approved' OR app_private.has_role((SELECT auth.uid()), 'coordinator'::app_role)  | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) | public: has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) |
| `technical_messages` | enabled | public: EXISTS ( SELECT 1 FROM public.technical_conversations WHERE id = conversation_id AND user_id = auth.uid() ) | public: EXISTS ( SELECT 1 FROM public.technical_conversations WHERE id = conversation_id AND user_id = auth.uid() ) | — | — |
| `technical_sheet_audit` | enabled | authenticated: public.has_any_active_role() | — | — | — |
| `technical_sheet_audit_logs` | enabled | authenticated: public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR  | — | — | — |
| `technical_sheet_favorites` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `technical_sheet_materials` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `technical_sheet_steps` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `technical_sheet_tips` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `technical_sheet_versions` | enabled | authenticated: public.has_role((SELECT auth.uid()), 'coordinator'::app_role) OR public.has_role((SELECT auth.uid()), 'manager'::app_role) OR | public: public.has_role(auth.uid(), 'coordinator') | — | — |
| `technical_sheets` | enabled | public: has_role(auth.uid(), 'coordinator')<br>authenticated: true<br>authenticated: (public.has_role((SELECT auth.uid()), 'operator'::app_role) AND status = 'published'::sheet_status) OR public.has_role((SELEC | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') | public: has_role(auth.uid(), 'coordinator') |
| `techniques` | enabled | authenticated: has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: true | authenticated: has_role(auth.uid(), 'coordinator'::app_role) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) | authenticated: has_role(auth.uid(), 'coordinator'::app_role) |
| `telemetry_traces` | enabled | authenticated: public.has_role(auth.uid(), 'manager') | authenticated: auth.uid() IS NOT NULL | — | — |
| `tpm_execution_alerts` | enabled | authenticated: true<br>authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() |
| `tpm_execution_audit_logs` | enabled | authenticated: public.has_any_active_role() | — | — | — |
| `tpm_execution_checklist` | enabled | authenticated: public.has_any_active_role()<br>authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() |
| `tpm_execution_parts` | enabled | authenticated: public.has_any_active_role()<br>authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() |
| `tpm_execution_supplies` | enabled | authenticated: true<br>authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role()<br>authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() |
| `tpm_executions` | enabled | authenticated: public.has_any_active_role() | authenticated: technician_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.ha | authenticated: technician_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.ha | authenticated: public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') |
| `tpm_notification_logs` | enabled | authenticated: true | authenticated: true<br>authenticated: user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') | — | — |
| `tpm_notification_queue` | enabled | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() |
| `tpm_notification_templates` | enabled | authenticated: true<br>authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') | authenticated: public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') |
| `tpm_notification_templates_published` | enabled | authenticated: true | — | — | — |
| `tpm_parameter_alerts` | enabled | authenticated: true<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role)<br>authenticated: app_private.has_role(auth.uid(), 'manager'::app_role) | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) | authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'coordinator'::app_role) |
| `tpm_severity_configs` | enabled | authenticated: true<br>authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() | authenticated: public.has_any_active_role() |
| `user_devices` | enabled | public: auth.uid() = user_id | authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id | public: auth.uid() = user_id |
| `user_favorites` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | — |
| `user_mfa_settings` | enabled | public: auth.uid() = user_id<br>public: has_role(auth.uid(), 'coordinator') OR has_role(auth.uid(), 'manager') | public: auth.uid() = user_id | public: auth.uid() = user_id | — |
| `user_notification_settings` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | — |
| `user_roles` | enabled | authenticated: EXISTS ( SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('coordinator', 'manager', 'admin') <br>public: public.has_role(auth.uid(), 'coordinator')<br>authenticated: auth.uid() = user_id<br>authenticated: public.has_role(auth.uid(), 'coordinator'::app_role) AND role = 'operator'::app_role<br>authenticated: app_private.has_role((SELECT auth.uid()), 'manager'::app_role) AND role NOT IN ('admin'::app_role, 'manager'::app_role)<br>authenticated: app_private.has_role((SELECT auth.uid()), 'admin'::app_role) | authenticated: public.has_role(auth.uid(), 'coordinator'::app_role) AND role = 'operator'::app_role<br>authenticated: app_private.has_role((SELECT auth.uid()), 'manager'::app_role) AND role NOT IN ('admin'::app_role, 'manager'::app_role)<br>authenticated: app_private.has_role((SELECT auth.uid()), 'admin'::app_role)<br>authenticated: coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' | authenticated: public.has_role(auth.uid(), 'coordinator'::app_role) AND role = 'operator'::app_role<br>authenticated: app_private.has_role((SELECT auth.uid()), 'manager'::app_role) AND role NOT IN ('admin'::app_role, 'manager'::app_role)<br>authenticated: app_private.has_role((SELECT auth.uid()), 'admin'::app_role)<br>authenticated: public.has_role(auth.uid(), 'admin'::app_role) OR ( (public.has_role(auth.uid(), 'coordinator'::app_role) OR public.has_role(<br>authenticated: coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' | authenticated: public.has_role(auth.uid(), 'coordinator'::app_role) AND role = 'operator'::app_role<br>authenticated: app_private.has_role((SELECT auth.uid()), 'manager'::app_role) AND role NOT IN ('admin'::app_role, 'manager'::app_role)<br>authenticated: app_private.has_role((SELECT auth.uid()), 'admin'::app_role)<br>authenticated: coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' |
| `webauthn_challenges` | enabled | authenticated: auth.uid() = user_id<br>authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id<br>authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id<br>authenticated: auth.uid() = user_id | authenticated: auth.uid() = user_id<br>authenticated: auth.uid() = user_id |
| `webauthn_credentials` | enabled | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id | public: auth.uid() = user_id |
| `webhook_logs` | enabled | authenticated: public.has_role(auth.uid(), 'manager') | — | — | — |

> `—` com RLS ligado = ninguém além de service_role. `sem RLS` = qualquer chave anon lê/escreve tudo.

## Onde o RLS é IGNORADO (service_role) — 88 arquivo(s)

- `scripts/ai-context/cenarios.mjs`
- `scripts/ai-context/gerar.unit.mjs`
- `scripts/graphify/enrich.py`
- `scripts/regras_negocio/generate.py`
- `scripts/supabase_snapshot/snapshot.py`
- `supabase/create_operator_fn.sql`
- `supabase/functions/_shared/cronAuth.test.ts`
- `supabase/functions/_shared/cronAuth.ts`
- `supabase/functions/approve-password-reset/index.ts`
- `supabase/functions/auto-promote-jobs/index.ts`
- `supabase/functions/backup-scheduler/index.ts`
- `supabase/functions/bitrix24-sync/index.ts`
- `supabase/functions/calculate-inventory-intelligence/index.ts`
- `supabase/functions/calculate-rankings/index.ts`
- `supabase/functions/check-login-lockout/index.ts`
- `supabase/functions/cleanup-security-logs/index.ts`
- `supabase/functions/create-operator/index.ts`
- `supabase/functions/cron-alert-email/index.ts`
- `supabase/functions/cron-cleanup/index.ts`
- `supabase/functions/csp-report/index.ts`
- `supabase/functions/daily-maintenance-summary/index.ts`
- `supabase/functions/erp-api/index.ts`
- `supabase/functions/excel-export/index.ts`
- `supabase/functions/external-db-bridge/index.ts`
- `supabase/functions/external-db-bridge/validate_contract.ts`
- `supabase/functions/health-check/index.ts`
- `supabase/functions/health-monitor/index.ts`
- `supabase/functions/metrics-collector/index.ts`
- `supabase/functions/ml-predictions/index.ts`
- `supabase/functions/new-device-alert/index.ts`
- `supabase/functions/pdf-generator/index.ts`
- `supabase/functions/rate-limit-check/index.ts`
- `supabase/functions/security-alert/index.ts`
- `supabase/functions/send-email-report/index.ts`
- `supabase/functions/send-loss-risk-alert/index.ts`
- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/send-tpm-email/index.ts`
- `supabase/functions/tpm-notifications/index.ts`
- `supabase/functions/update-operator/index.ts`
- `supabase/functions/validate-login-ip/index.ts`
- `supabase/functions/webhook-handler/index.ts`
- `supabase/migrations/20260508115941_72493014-c1ac-4815-aab4-748637090416.sql`
- `supabase/migrations/20260508144832_765e2d9e-90d4-43dc-99bf-7e072423cd5f.sql`
- `supabase/migrations/20260509120316_8dc54f78-90ae-48ef-b428-c85102ed3423.sql`
- `supabase/migrations/20260512110942_cb61b4fe-9a86-40b9-9d12-24764f730f0e.sql`
- `supabase/migrations/20260512110956_be4e8c49-15ca-4951-8c67-594bfc71a8a9.sql`
- `supabase/migrations/20260512143124_14e8e4ef-8a62-4abf-b154-aa95b8d01649.sql`
- `supabase/migrations/20260513135919_d0597eb6-e453-4149-8905-b2077a47da5c.sql`
- `supabase/migrations/20260514211713_6529e69c-528c-4d4a-87bb-a27f0fcfd0d7.sql`
- `supabase/migrations/20260515114604_3ed3bf90-47f7-4d4f-8908-c8eb807dbc2d.sql`
- `supabase/migrations/20260515134557_e5a585a8-41eb-464e-85ea-883c3dfa35ae.sql`
- `supabase/migrations/20260522150743_54b10132-b2db-4300-9bdd-105ea937512c.sql`
- `supabase/migrations/20260614000001_metrics_distinct_counts.sql`
- `supabase/migrations/20260619145920_dc0bb323-a7f7-4e01-aa54-71d7c440fb50.sql`
- `supabase/migrations/20260619145943_74f847cd-2222-4ccb-bbe4-2838aeb8a5a2.sql`
- `supabase/migrations/20260619155918_14786be5-aded-4abd-956e-613927209aea.sql`
- `supabase/migrations/20260619160053_f360994f-c4a8-4301-b10f-b32c6cc8edd4.sql`
- `supabase/migrations/20260619203844_4936e3f8-2b8f-424a-9a00-02f598282431.sql`
- `supabase/migrations/20260711152506_43bf9062-b5e3-4ed3-9898-93fa550ab31c.sql`
- `supabase/migrations/20260718200200_scope_analytics_writes_to_elevated_roles.sql`
- `supabase/migrations/20260723113841_de387258-5a92-4f11-8e7e-a7c7fc6ed882.sql`
- `supabase/migrations/20260723113901_303ec06d-ae1a-4325-8ffd-e69b5d92f82d.sql`
- `supabase/migrations/20260723125433_314d8f93-3261-4e54-88c8-c5111249a8dd.sql`
- `supabase/migrations/20260723150259_923812ba-b026-4f9e-b063-588d1a82aac0.sql`
- `supabase/migrations/20260723150514_21fd854c-ed0c-4ee1-8b29-52977bc475fa.sql`
- `supabase/migrations/20260723162822_4691c313-3644-42fb-becb-3b1d22986ba6.sql`
- `supabase/migrations/20260726150724_ee3d2224-0878-43f3-8186-b76c4c61dc9a.sql`
- `supabase/migrations/20260726153016_513e978a-96e7-48e8-b512-33efd2829eb9.sql`
- `supabase/migrations/20260726153054_3df06a6d-43ca-41a4-9610-7dfda9da9644.sql`
- `supabase/migrations/20260726153117_027f7634-99b9-4ef2-b7b7-95f0370d9893.sql`
- `supabase/migrations/20260726154456_40b6fdf0-ab0c-4992-a2e7-2b0a6c840ee4.sql`
- `supabase/migrations/20260726161334_0dc2a73a-2f32-4855-acb2-6ce7fc124ee7.sql`
- `supabase/migrations/20260726165835_441f51a4-fda0-44bd-9395-849d58bcdb2b.sql`
- `supabase/migrations/20260802113432_445cb69f-f96b-41be-be55-150b4cde95cd.sql`
- `supabase/migrations/20260802113515_15352d5c-bbea-4170-9300-d918db96318b.sql`
- `supabase/migrations/20261001143000_geo_blocking_tables_reconstruct.sql`
- `supabase/migrations/20261001143100_fix_legacy_supabase_urls_cron.sql`
- `supabase/migrations/20261001143200_complete_maintenance_record_rpc.sql`
- `supabase/migrations/20261001152000_csp_violation_reports.sql`
- `supabase/migrations/20261001153000_rate_limit_check_and_record.sql`
- `supabase/migrations/20261002120000_fix_notify_loss_risk_and_tpm_alerts_rls.sql`
- `supabase/migrations/20261002130000_csp_reports_retention.sql`
- `supabase/migrations/20261002140000_csp_report_dedup_rpc.sql`
- `supabase/migrations/20261002150000_rate_limit_pair.sql`
- `supabase/migrations/20261008160000_runtime_config_edge_auth.sql`
- `supabase/migrations/20261019140000_validation_hardening.sql`
- `supabase/migrations/20261028223000_bitrix_oauth_states.sql`
- `supabase/migrations/20261029002000_fix_schedule_policies_and_archive_rpc.sql`

## Funções SQL `SECURITY DEFINER` (rodam com privilégio do dono, ignoram RLS)

- `archive_finished_jobs`
- `audit_job_changes`
- `audit_job_status_change`
- `audit_logistics_changes`
- `audit_machine_changes`
- `audit_technical_sheet_changes`
- `audit_tpm_execution_changes`
- `audit_trigger_func`
- `auto_reassign_stale_packaging_tasks`
- `check_and_notify_kpi_alert`
- `check_job_overlap`
- `count_active_operators_since`
- `count_running_machines`
- `create_operator`
- `create_technical_sheet_version`
- `enforce_packaging_checklist_before_ship`
- `get_cron_health`
- `get_packaging_leaderboard`
- `get_packaging_manifest`
- `get_system_status_summary`
- `get_user_role`
- `handle_new_user`
- `handle_parameter_alert_notification`
- `has_any_active_role`
- `has_role`
- `increment_job_lost_pieces`
- `increment_sheet_view_count`
- `is_staff`
- `log_job_status_change`
- `log_security_violation`
- `log_technical_sheet_change`
- `notify_loss_risk`
- `notify_packaging_defect_critical`
- `notify_packaging_task_created`
- `notify_tpm_email`
- `on_job_finished_create_packaging_task`
- `on_packaging_defect_create_rework_job`
- `on_packaging_ready_create_shipment`
- `purge_old_logs`
- `rollup_cron_p95_daily`
- `runtime_config_get`
- `snapshot_cron_health`
- `trigger_auto_promotion`
- `trigger_send_tpm_email`
- `update_audit_hash`
- `update_inventory_stock`
- `validate_inventory_stock`
- `validate_stock_before_movement`
- `verify_audit_chain`

## Edge functions públicas (sem JWT — qualquer um chama)

- `bitrix24-sync`
- `csp-report`

## Rotas protegidas no front

| Rota | Guard | Roles | Arquivo |
|---|---|---|---|
| /app | ProtectedRoute |  | `scripts/ai-context/gerar.unit.mjs` |

Guards usados: Protected, ProtectedRoute

Middleware matcher (Next.js): nenhum

## Grants / Revokes (agrupados por role e privilégio)

| Ação | Para/De | Privilégios | Objetos |
|---|---|---|---|
| grant | anon, authenticated | execute | `create_operator` |
| grant | authenticated | all | `packaging_waste` |
| grant | authenticated | execute | `has_role`, `get_user_role`, `verify_audit_chain`, `verify_audit_chain`, `increment_sheet_view_count`, `refresh_operator_rankings`, `calculate_days_of_supply`, `has_role`, `get_cron_health`, `get_system_status_summary`, `get_system_status_summary`, `get_packaging_leaderboard`, `get_packaging_manifest`, `approve_maintenance_record` |
| grant | authenticated | select | `packaging_settings`, `cron_health_history`, `cron_p95_daily`, `edge_health_history`, `packaging_equipment` |
| grant | authenticated | select, insert, update, delete | `packaging_tasks`, `packaging_defects`, `packaging_checklist_items`, `packaging_task_checklist`, `packaging_sla_overrides` |
| grant | authenticated, anon | execute | `is_staff` |
| grant | authenticated, service_role | execute | `audit_logistics_changes`, `audit_technical_sheet_changes`, `audit_tpm_execution_changes`, `check_job_overlap`, `create_technical_sheet_version`, `handle_new_user`, `log_role_changes`, `log_security_violation`, `log_technical_sheet_change`, `notify_loss_risk`, `notify_tpm_email`, `trigger_auto_promotion`, `update_inventory_stock`, `validate_inventory_stock`, `verify_audit_chain` … +8 |
| grant | postgres | all privileges | `cron` |
| grant | postgres, service_role | execute | `log_technical_sheet_change`, `trigger_auto_promotion` |
| grant | service_role | all | `packaging_tasks`, `packaging_defects`, `packaging_settings`, `packaging_checklist_items`, `packaging_task_checklist`, `packaging_sla_overrides`, `cron_health_history`, `cron_p95_daily`, `edge_health_history`, `packaging_waste`, `packaging_equipment` |
| grant | service_role | execute | `create_operator`, `has_role`, `count_running_machines`, `count_active_operators_since`, `get_user_role`, `increment_sheet_view_count`, `has_role`, `has_any_active_role`, `purge_old_logs`, `purge_old_logs`, `get_cron_health`, `snapshot_cron_health`, `snapshot_cron_health`, `auto_reassign_stale_packaging_tasks`, `rate_limit_check_and_record` … +4 |
| grant | service_role, postgres | execute | `snapshot_cron_health` |
| revoke | PUBLIC | all | `log_technical_sheet_change`, `has_any_active_role`, `purge_old_logs`, `get_system_status_summary`, `get_packaging_leaderboard`, `auto_reassign_stale_packaging_tasks`, `get_packaging_manifest`, `app_private.runtime_config`, `app_private.runtime_config_get`, `approve_maintenance_record` |
| revoke | PUBLIC | execute | `trigger_auto_promotion`, `audit_logistics_changes`, `audit_technical_sheet_changes`, `audit_tpm_execution_changes`, `check_job_overlap`, `create_technical_sheet_version`, `handle_new_user`, `log_role_changes`, `log_security_violation`, `log_technical_sheet_change`, `notify_loss_risk`, `notify_tpm_email`, `trigger_auto_promotion`, `update_inventory_stock`, `validate_inventory_stock` … +18 |
| revoke | PUBLIC, anon | all | `get_cron_health`, `cron_expected_interval_minutes`, `get_system_status_summary` |
| revoke | PUBLIC, anon | execute | `complete_maintenance_record`, `complete_maintenance_record` |
| revoke | PUBLIC, anon, authenticated | all | `count_running_machines`, `count_active_operators_since`, `snapshot_cron_health`, `snapshot_cron_health`, `snapshot_cron_health` |
| revoke | PUBLIC, anon, authenticated | execute | `check_and_notify_kpi_alert`, `test_rls_policies`, `verify_audit_chain`, `verify_audit_chain`, `has_any_active_role`, `on_packaging_ready_create_shipment`, `on_packaging_defect_create_rework_job`, `enforce_packaging_checklist_before_ship`, `notify_packaging_task_created`, `notify_packaging_defect_critical`, `rollup_cron_p95_daily`, `rollup_cron_p95_daily` |
| revoke | anon | execute | `purge_old_logs`, `on_job_finished_create_packaging_task`, `get_system_status_summary`, `rate_limit_check_and_record`, `purge_old_logs`, `insert_csp_report_dedup`, `rate_limit_check_and_record_pair`, `get_packaging_manifest`, `get_packaging_leaderboard`, `get_system_status_summary`, `get_cron_health`, `auto_reassign_stale_packaging_tasks` |
| revoke | anon, authenticated, public | execute | `get_user_role`, `increment_sheet_view_count` |
| revoke | authenticated | execute | `purge_old_logs`, `on_job_finished_create_packaging_task`, `rate_limit_check_and_record`, `purge_old_logs`, `insert_csp_report_dedup`, `rate_limit_check_and_record_pair` |
| revoke | public | all | `get_cron_health` |
| revoke | public | execute | `validate_stock_before_movement`, `log_job_status_change`, `check_and_notify_kpi_alert`, `audit_machine_changes`, `audit_job_changes`, `rollback_inventory_stock`, `audit_log_immutable`, `log_security_violation`, `compute_audit_hash`, `process_audit_log_hashing`, `calculate_audit_hash` |
| revoke | public, anon | all | `app_private.has_role`, `app_private.has_role` |
| revoke | public, anon, authenticated | execute | `has_role`, `archive_finished_jobs` |

## Riscos de acesso detectados

| Tabela | Problema | Arquivos |
|---|---|---|
| `erp_api_keys` | RLS ligado sem nenhuma política → só service_role acessa |  |
| `geo_blocking_logs` | front faz SELECT mas nenhuma política RLS permite SELECT → vai falhar/retornar vazio para usuários | `src/features/admin/hooks/useGeoBlocking.ts` |
| `inventory_movements` | front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/features/inventory/hooks/useInventory.ts` |
| `inventory_movements` | front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/features/inventory/hooks/useInventory.ts` |
| `profiles` | front faz DELETE mas nenhuma política RLS permite DELETE → vai falhar/retornar vazio para usuários | `src/components/settings/UserManagement.tsx` |
| `tpm_notification_templates_published` | front faz INSERT mas nenhuma política RLS permite INSERT → vai falhar/retornar vazio para usuários | `src/features/maintenance/components/TPMNotificationTemplates.tsx` |

## Multi-tenancy

_nenhuma coluna de tenant identificada — sistema single-tenant ou isolamento por usuário (auth.uid())_

## Soft delete (registros 'apagados' continuam na tabela — filtre!)

| Tabela | Coluna |
|---|---|
| `machines` | `is_active` |
| `user_roles` | `is_active` |
| `bitrix24_field_mappings` | `is_active` |
| `technical_sheets` | `is_active` |
| `abc_activities` | `is_active` |
| `abc_cost_pools` | `is_active` |
| `maintenance_schedules` | `is_active` |
| `maintenance_checklists` | `is_active` |
| `machine_predictions` | `is_active` |
| `shift_checklist_templates` | `is_active` |
| `spc_control_parameters` | `is_active` |
| `energy_targets` | `is_active` |
| `ip_allowlist` | `is_active` |
| `rate_limit_settings` | `is_active` |
| `tpm_notification_templates` | `is_active` |
| `gamification_rewards` | `is_active` |
| `shipping_providers` | `is_active` |
| `erp_api_keys` | `is_active` |
| `packaging_checklist_items` | `is_active` |
| `packaging_sla_overrides` | `is_active` |
| `cron_health_history` | `active` |
| `archived_jobs` | `archived_at` |
| `gamification_settings` | `is_active` |

## Auditoria (colunas de rastreio)

| Tabela | Colunas |
|---|---|
| `techniques` | `created_at` |
| `machines` | `created_at` |
| `jobs` | `created_at`, `updated_at` |
| `profiles` | `created_at`, `updated_at` |
| `user_roles` | `created_at` |
| `efficiency_alert_history` | `created_at` |
| `technical_conversations` | `created_at`, `updated_at` |
| `technical_messages` | `created_at` |
| `bitrix24_oauth_tokens` | `created_at`, `updated_at` |
| `bitrix24_field_mappings` | `created_at`, `updated_at` |
| `product_categories` | `created_at`, `updated_at` |
| `materials` | `created_at`, `updated_at` |
| `technical_sheets` | `created_at`, `created_by`, `updated_at`, `updated_by` |
| `technical_sheet_steps` | `created_at` |
| `technical_sheet_materials` | `created_at` |
| `technical_sheet_tips` | `created_at` |
| `operator_status_audit` | `created_at` |
| `user_favorites` | `created_at`, `updated_at` |
| `operator_goals` | `created_at`, `created_by`, `updated_at` |
| `abc_activities` | `created_at`, `updated_at` |
| `abc_cost_pools` | `created_at`, `updated_at` |
| `abc_activity_rates` | `created_at`, `updated_at` |
| `abc_job_costs` | `created_at` |
| `maintenance_types` | `created_at` |
| `maintenance_schedules` | `created_at`, `created_by`, `updated_at` |
| `maintenance_checklists` | `created_at`, `updated_at` |
| `maintenance_checklist_items` | `created_at` |
| `maintenance_records` | `created_at` |
| `maintenance_alerts` | `created_at` |
| `machine_predictions` | `created_at` |
| `prediction_history` | `created_at` |
| `daily_summaries` | `created_at` |
| `shift_handovers` | `created_at`, `updated_at` |
| `shift_handover_checklist` | `created_at` |
| `shift_pending_tasks` | `created_at`, `updated_at` |
| `shift_occurrences` | `created_at` |
| `shift_checklist_templates` | `created_at`, `created_by`, `updated_at` |
| `production_lots` | `created_at`, `updated_at` |
| `lot_components` | `created_at` |
| `lot_movements` | `created_at` |
| `lot_quality_inspections` | `created_at` |
| `spc_control_parameters` | `created_at`, `updated_at` |
| `spc_measurements` | `created_at` |
| `spc_alerts` | `created_at` |
| `operator_achievements` | `created_at` |
| `operator_rankings` | `created_at`, `updated_at` |
| `energy_consumption` | `created_at` |
| `energy_alerts` | `created_at` |
| `energy_targets` | `created_at`, `created_by`, `updated_at` |
| `technical_documents` | `created_at`, `updated_at` |
| `document_versions` | `created_at` |
| `push_subscriptions` | `created_at`, `updated_at` |
| `push_notifications` | `created_at` |
| `password_reset_requests` | `created_at` |
| `ip_allowlist` | `created_at`, `created_by` |
| `user_mfa_settings` | `created_at`, `updated_at` |
| `login_audit` | `created_at` |
| `rate_limit_logs` | `created_at` |
| `blocked_ips` | `created_at` |
| `rate_limit_settings` | `created_at`, `created_by`, `updated_at` |
| `security_events` | `created_at` |
| `user_devices` | `created_at` |
| `new_device_alerts` | `created_at` |
| `role_permissions` | `created_at`, `created_by`, `updated_at` |
| `login_lockouts` | `created_at`, `updated_at` |
| `chat_messages` | `created_at` |
| `pre_production_checklists` | `created_at` |
| `query_telemetry` | `created_at` |
| `audit_log` | `created_at` |
| `user_notification_settings` | `created_at`, `updated_at` |
| `tpm_notification_templates` | `created_at`, `updated_at` |
| `tpm_severity_configs` | `created_at`, `updated_at` |
| `tpm_notification_queue` | `created_at` |
| `tpm_executions` | `created_at`, `updated_at` |
| `tpm_execution_parts` | `created_at` |
| `tpm_execution_audit_logs` | `created_at` |
| `tpm_parameter_alerts` | `created_at` |
| `tpm_execution_supplies` | `created_at` |
| `tpm_execution_alerts` | `created_at` |
| `error_logs` | `created_at` |
| `technical_sheet_audit_logs` | `created_at` |
| `technical_sheet_audit` | `created_at` |
| `technical_sheet_favorites` | `created_at` |
| `inventory_items` | `created_at`, `updated_at` |
| `inventory_movements` | `created_at` |
| `dashboard_layouts` | `created_at`, `updated_at` |
| `gamification_rewards` | `created_at` |
| `reward_redemptions` | `created_at` |
| `report_templates` | `created_at`, `updated_at` |
| `technical_sheet_versions` | `created_at`, `created_by` |
| `operator_skills` | `created_at`, `updated_at` |
| `shipping_providers` | `created_at`, `updated_at` |
| `shipments` | `created_at`, `updated_at` |
| `production_losses` | `created_at` |
| `machine_downtime` | `created_at` |
| `job_status_history` | `created_at` |
| `rls_test_results` | `created_at` |
| `business_config` | `updated_at`, `updated_by` |
| `feature_flags` | `created_at`, `updated_at` |
| `telemetry_traces` | `created_at` |
| `webhook_logs` | `created_at` |
| `kpi_alerts` | `created_at` |
| `dashboard_presets` | `created_at`, `updated_at` |
| `erp_api_keys` | `created_at`, `created_by` |
| `packaging_tasks` | `created_at`, `updated_at` |
| `packaging_defects` | `created_at`, `updated_at` |
| `packaging_settings` | `created_at`, `updated_at` |
| `packaging_checklist_items` | `created_at`, `updated_at` |
| `packaging_task_checklist` | `created_at`, `updated_at` |
| `packaging_sla_overrides` | `created_at`, `created_by`, `updated_at` |
| `cron_health_history` | `created_at` |
| `cron_p95_daily` | `created_at`, `updated_at` |
| `edge_health_history` | `created_at` |
| `geo_blocking_settings` | `updated_at`, `updated_by` |
| `geo_blocking_rules` | `created_at`, `created_by`, `updated_at` |
| `geo_blocking_logs` | `created_at` |
| `csp_violation_reports` | `created_at` |
| `bitrix24_oauth_states` | `created_at` |
| `backup_logs` | `created_at` |
| `email_verification_tokens` | `created_at` |
| `gamification_settings` | `created_at`, `updated_at` |
| `packaging_equipment` | `created_at` |
| `packaging_waste` | `created_at` |
| `shipment_costs` | `created_at`, `updated_at` |
| `tpm_execution_checklist` | `created_at` |
| `webauthn_challenges` | `created_at` |
| `webauthn_credentials` | `created_at` |

## Dados pessoais / sensíveis (LGPD — cuidado em logs, exports, prompts de IA)

| Tabela | Coluna |
|---|---|
| `profiles` | `phone` |
| `ip_allowlist` | `ip_address` |
| `login_audit` | `ip_address` |
| `rate_limit_logs` | `ip_address` |
| `blocked_ips` | `ip_address` |
| `security_events` | `ip_address` |
| `user_devices` | `ip_address` |
| `new_device_alerts` | `ip_address` |
| `geo_blocking_logs` | `ip_address` |

## Colunas de dinheiro (tipo importa: numeric ✅ / float ❌)

| Tabela | Coluna | Tipo |
|---|---|---|
| `jobs` | `shipping_status` | `string` |
| `abc_activities` | `cost_driver` | `TEXT` |
| `abc_job_costs` | `total_cost` | `NUMERIC(12,2)` |
| `maintenance_records` | `total_cost` | `NUMERIC(10,2)` |
| `machine_health_metrics` | `total_jobs` | `INTEGER` |
| `machine_health_metrics` | `total_produced` | `INTEGER` |
| `machine_health_metrics` | `total_losses` | `INTEGER` |
| `machine_health_metrics` | `total_production_hours` | `NUMERIC(10,2)` |
| `operator_rankings` | `total_points` | `INTEGER` |
| `operator_rankings` | `total_produced` | `INTEGER` |
| `energy_consumption` | `cost_per_kwh` | `NUMERIC` |
| `energy_consumption` | `total_cost` | `NUMERIC` |
| `tpm_execution_parts` | `cost` | `DECIMAL` |
| `inventory_items` | `price_per_unit` | `NUMERIC` |
| `gamification_rewards` | `cost_points` | `INTEGER` |
| `shipments` | `cost_currency` | `string` |
| `shipments` | `tax_cost` | `number` |
| `packaging_tasks` | `total_weight_kg` | `NUMERIC(10,3)` |
| `shipment_costs` | `amount` | `number` |
| `shipment_costs` | `cost_type` | `string` |
