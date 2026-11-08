# Índices

Uso e tamanho em `stats.md`.

| tabela | índice | método | colunas | único | válido | predicado |
|---|---|---|---|---|---|---|
| app_private.runtime_config | runtime_config_pkey | btree | key | sim | sim |  |
| public.abc_activities | abc_activities_pkey | btree | id | sim | sim |  |
| public.abc_activities | idx_abc_activities_technique_id | btree | technique_id | não | sim |  |
| public.abc_activity_rates | abc_activity_rates_activity_id_cost_pool_id_period_start_key | btree | activity_id, cost_pool_id, period_start | sim | sim |  |
| public.abc_activity_rates | abc_activity_rates_pkey | btree | id | sim | sim |  |
| public.abc_activity_rates | idx_abc_activity_rates_cost_pool_id | btree | cost_pool_id | não | sim |  |
| public.abc_cost_pools | abc_cost_pools_pkey | btree | id | sim | sim |  |
| public.abc_job_costs | abc_job_costs_pkey | btree | id | sim | sim |  |
| public.abc_job_costs | idx_abc_job_costs_activity_id | btree | activity_id | não | sim |  |
| public.abc_job_costs | idx_abc_job_costs_cost_pool_id | btree | cost_pool_id | não | sim |  |
| public.abc_job_costs | idx_abc_job_costs_job_id | btree | job_id | não | sim |  |
| public.archived_jobs | archived_jobs_created_at_idx | btree | created_at | não | sim |  |
| public.archived_jobs | archived_jobs_machine_id_idx | btree | machine_id | não | sim |  |
| public.archived_jobs | archived_jobs_operator_id_idx | btree | operator_id | não | sim |  |
| public.archived_jobs | archived_jobs_order_number_key | btree | order_number | sim | sim |  |
| public.archived_jobs | archived_jobs_parent_job_id_idx | btree | parent_job_id | não | sim |  |
| public.archived_jobs | archived_jobs_pkey | btree | id | sim | sim |  |
| public.archived_jobs | archived_jobs_product_category_id_idx | btree | product_category_id | não | sim |  |
| public.archived_jobs | archived_jobs_scheduled_date_status_idx | btree | scheduled_date, status | não | sim |  |
| public.archived_jobs | archived_jobs_shipment_id_idx | btree | shipment_id | não | sim |  |
| public.archived_jobs | archived_jobs_status_machine_id_idx | btree | status, machine_id | não | sim |  |
| public.archived_jobs | archived_jobs_status_scheduled_date_idx | btree | status, scheduled_date | não | sim |  |
| public.archived_jobs | archived_jobs_status_sort_order_idx | btree | status, sort_order | não | sim |  |
| public.archived_jobs | archived_jobs_status_technique_id_priority_created_at_idx | btree | status, technique_id, priority, created_at | não | sim |  |
| public.archived_jobs | archived_jobs_status_updated_at_idx | btree | status, updated_at | não | sim |  |
| public.archived_jobs | archived_jobs_technique_id_idx | btree | technique_id | não | sim |  |
| public.audit_log | audit_log_actor_idx | btree | actor_id, created_at | não | sim |  |
| public.audit_log | audit_log_created_idx | btree | created_at | não | sim |  |
| public.audit_log | audit_log_entity_idx | btree | entity_type, entity_id, created_at | não | sim |  |
| public.audit_log | audit_log_pkey | btree | id | sim | sim |  |
| public.audit_log | idx_audit_log_entity | btree | entity_type, entity_id, created_at | não | sim |  |
| public.audit_log | idx_audit_log_entity_created | btree | entity_type, entity_id, created_at | não | sim |  |
| public.backup_logs | backup_logs_pkey | btree | id | sim | sim |  |
| public.bitrix24_field_mappings | bitrix24_field_mappings_mapping_type_source_key_target_key_key | btree | mapping_type, source_key, target_key | sim | sim |  |
| public.bitrix24_field_mappings | bitrix24_field_mappings_pkey | btree | id | sim | sim |  |
| public.bitrix24_oauth_states | bitrix24_oauth_states_pkey | btree | state | sim | sim |  |
| public.bitrix24_oauth_tokens | bitrix24_oauth_tokens_pkey | btree | id | sim | sim |  |
| public.bitrix24_sync_history | bitrix24_sync_history_pkey | btree | id | sim | sim |  |
| public.bitrix24_sync_history | idx_sync_history_started_at | btree | started_at | não | sim |  |
| public.bitrix24_sync_history | idx_sync_history_status | btree | status | não | sim |  |
| public.blocked_ips | blocked_ips_pkey | btree | id | sim | sim |  |
| public.blocked_ips | idx_blocked_ips_active | btree | ip_address | não | sim | `(unblocked_at IS NULL)` |
| public.blocked_ips | idx_blocked_ips_blocked_by | btree | blocked_by | não | sim |  |
| public.blocked_ips | idx_blocked_ips_ip | btree | ip_address | não | sim |  |
| public.blocked_ips | idx_blocked_ips_unblocked_by | btree | unblocked_by | não | sim |  |
| public.business_config | business_config_pkey | btree | key | sim | sim |  |
| public.business_config | idx_business_config_updated_by | btree | updated_by | não | sim |  |
| public.chat_messages | chat_messages_pkey | btree | id | sim | sim |  |
| public.cron_health_history | cron_health_history_pkey | btree | id | sim | sim |  |
| public.cron_health_history | idx_cron_health_history_captured_at | btree | captured_at | não | sim |  |
| public.cron_health_history | idx_cron_health_history_job_time | btree | jobid, captured_at | não | sim |  |
| public.cron_p95_daily | cron_p95_daily_jobid_day_key | btree | jobid, day | sim | sim |  |
| public.cron_p95_daily | cron_p95_daily_pkey | btree | id | sim | sim |  |
| public.cron_p95_daily | idx_cron_p95_daily_day | btree | day | não | sim |  |
| public.csp_violation_reports | csp_violation_reports_pkey | btree | id | sim | sim |  |
| public.csp_violation_reports | idx_csp_violation_reports_created_at | btree | created_at | não | sim |  |
| public.csp_violation_reports | idx_csp_violation_reports_directive | btree | violated_directive | não | sim |  |
| public.daily_summaries | daily_summaries_pkey | btree | id | sim | sim |  |
| public.daily_summaries | idx_daily_summaries_date_type | btree | date, summary_type | sim | sim |  |
| public.dashboard_layouts | dashboard_layouts_pkey | btree | id | sim | sim |  |
| public.dashboard_layouts | dashboard_layouts_user_id_key | btree | user_id | sim | sim |  |
| public.dashboard_presets | dashboard_presets_pkey | btree | id | sim | sim |  |
| public.dashboard_presets | idx_dashboard_presets_user_id | btree | user_id | não | sim |  |
| public.document_versions | document_versions_pkey | btree | id | sim | sim |  |
| public.document_versions | idx_document_versions_document_id | btree | document_id | não | sim |  |
| public.edge_health_history | edge_health_history_pkey | btree | id | sim | sim |  |
| public.edge_health_history | idx_edge_health_history_captured_at | btree | captured_at | não | sim |  |
| public.efficiency_alert_history | efficiency_alert_history_pkey | btree | id | sim | sim |  |
| public.efficiency_alert_history | idx_efficiency_alert_history_machine_id | btree | machine_id | não | sim |  |
| public.efficiency_alert_history | idx_efficiency_alerts_detected | btree | detected_at | não | sim |  |
| public.efficiency_alert_history | idx_efficiency_alerts_resolved | btree | resolved_at | não | sim |  |
| public.efficiency_alert_history | idx_efficiency_alerts_type | btree | alert_type | não | sim |  |
| public.energy_alerts | energy_alerts_pkey | btree | id | sim | sim |  |
| public.energy_alerts | idx_energy_alerts_machine | btree | machine_id | não | sim |  |
| public.energy_alerts | idx_energy_alerts_resolved | btree | is_resolved | não | sim |  |
| public.energy_consumption | energy_consumption_pkey | btree | id | sim | sim |  |
| public.energy_consumption | idx_energy_consumption_machine | btree | machine_id | não | sim |  |
| public.energy_consumption | idx_energy_consumption_recorded_at | btree | recorded_at | não | sim |  |
| public.energy_targets | energy_targets_pkey | btree | id | sim | sim |  |
| public.energy_targets | idx_energy_targets_machine_id | btree | machine_id | não | sim |  |
| public.error_logs | error_logs_pkey | btree | id | sim | sim |  |
| public.error_logs | idx_error_logs_created_at_desc | btree | created_at | não | sim |  |
| public.feature_flags | feature_flags_name_key | btree | name | sim | sim |  |
| public.feature_flags | feature_flags_pkey | btree | id | sim | sim |  |
| public.gamification_rewards | gamification_rewards_pkey | btree | id | sim | sim |  |
| public.geo_blocking_logs | geo_blocking_logs_pkey | btree | id | sim | sim |  |
| public.geo_blocking_logs | idx_geo_blocking_logs_country | btree | country_code | não | sim |  |
| public.geo_blocking_logs | idx_geo_blocking_logs_created | btree | created_at | não | sim |  |
| public.geo_blocking_rules | geo_blocking_rules_country_code_key | btree | country_code | sim | sim |  |
| public.geo_blocking_rules | geo_blocking_rules_pkey | btree | id | sim | sim |  |
| public.geo_blocking_rules | idx_geo_blocking_rules_created_by | btree | created_by | não | sim |  |
| public.geo_blocking_settings | geo_blocking_settings_pkey | btree | id | sim | sim |  |
| public.geo_blocking_settings | geo_blocking_settings_singleton | btree |  | sim | sim |  |
| public.geo_blocking_settings | idx_geo_blocking_settings_updated_by | btree | updated_by | não | sim |  |
| public.inventory_items | inventory_items_pkey | btree | id | sim | sim |  |
| public.inventory_movements | idx_inventory_movements_item_id | btree | item_id | não | sim |  |
| public.inventory_movements | idx_inventory_movements_job_id | btree | job_id | não | sim |  |
| public.inventory_movements | idx_inventory_movements_user_id | btree | user_id | não | sim |  |
| public.inventory_movements | inventory_movements_pkey | btree | id | sim | sim |  |
| public.ip_allowlist | idx_ip_allowlist_ip | btree | ip_address | não | sim |  |
| public.ip_allowlist | idx_ip_allowlist_user | btree | user_id | não | sim | `(user_id IS NOT NULL)` |
| public.ip_allowlist | ip_allowlist_pkey | btree | id | sim | sim |  |
| public.job_status_audit | idx_job_status_audit_changed_by | btree | changed_by | não | sim |  |
| public.job_status_audit | idx_job_status_audit_job_id | btree | job_id | não | sim |  |
| public.job_status_audit | job_status_audit_pkey | btree | id | sim | sim |  |
| public.job_status_history | idx_job_status_history_changed_by | btree | changed_by | não | sim |  |
| public.job_status_history | idx_job_status_history_job_id | btree | job_id | não | sim |  |
| public.job_status_history | job_status_history_pkey | btree | id | sim | sim |  |
| public.jobs | idx_jobs_created_at_desc | btree | created_at | não | sim |  |
| public.jobs | idx_jobs_machine_id | btree | machine_id | não | sim |  |
| public.jobs | idx_jobs_operator_id | btree | operator_id | não | sim |  |
| public.jobs | idx_jobs_parent_job_id | btree | parent_job_id | não | sim |  |
| public.jobs | idx_jobs_product_category_id | btree | product_category_id | não | sim |  |
| public.jobs | idx_jobs_scheduled_date_status | btree | scheduled_date, status | não | sim |  |
| public.jobs | idx_jobs_shipment_id | btree | shipment_id | não | sim |  |
| public.jobs | idx_jobs_status_machine | btree | status, machine_id | não | sim |  |
| public.jobs | idx_jobs_status_scheduled | btree | status, scheduled_date | não | sim |  |
| public.jobs | idx_jobs_status_sort_order | btree | status, sort_order | não | sim |  |
| public.jobs | idx_jobs_status_technique_priority | btree | status, technique_id, priority, created_at | não | sim |  |
| public.jobs | idx_jobs_status_updated_at | btree | status, updated_at | não | sim |  |
| public.jobs | idx_jobs_technique_id | btree | technique_id | não | sim |  |
| public.jobs | jobs_order_number_key | btree | order_number | sim | sim |  |
| public.jobs | jobs_pkey | btree | id | sim | sim |  |
| public.kpi_alerts | idx_kpi_alerts_machine_id | btree | machine_id | não | sim |  |
| public.kpi_alerts | kpi_alerts_pkey | btree | id | sim | sim |  |
| public.login_audit | idx_login_audit_created | btree | created_at | não | sim |  |
| public.login_audit | idx_login_audit_user | btree | user_id | não | sim |  |
| public.login_audit | login_audit_pkey | btree | id | sim | sim |  |
| public.login_lockouts | idx_login_lockouts_locked_until | btree | locked_until | não | sim | `(locked_until IS NOT NULL)` |
| public.login_lockouts | login_lockouts_identifier_identifier_type_key | btree | identifier, identifier_type | sim | sim |  |
| public.login_lockouts | login_lockouts_pkey | btree | id | sim | sim |  |
| public.lot_components | idx_lot_components_component_lot_id | btree | component_lot_id | não | sim |  |
| public.lot_components | idx_lot_components_lot_id | btree | lot_id | não | sim |  |
| public.lot_components | idx_lot_components_material_id | btree | material_id | não | sim |  |
| public.lot_components | lot_components_pkey | btree | id | sim | sim |  |
| public.lot_movements | idx_lot_movements_job_id | btree | job_id | não | sim |  |
| public.lot_movements | idx_lot_movements_lot_id | btree | lot_id | não | sim |  |
| public.lot_movements | lot_movements_pkey | btree | id | sim | sim |  |
| public.lot_quality_inspections | idx_lot_quality_inspections_lot_id | btree | lot_id | não | sim |  |
| public.lot_quality_inspections | lot_quality_inspections_pkey | btree | id | sim | sim |  |
| public.machine_downtime | idx_machine_downtime_job_id | btree | job_id | não | sim |  |
| public.machine_downtime | idx_machine_downtime_machine_id | btree | machine_id | não | sim |  |
| public.machine_downtime | idx_machine_downtime_operator_id | btree | operator_id | não | sim |  |
| public.machine_downtime | machine_downtime_pkey | btree | id | sim | sim |  |
| public.machine_event_audit | idx_machine_event_audit_machine_id | btree | machine_id | não | sim |  |
| public.machine_event_audit | idx_machine_event_audit_performed_by | btree | performed_by | não | sim |  |
| public.machine_event_audit | machine_event_audit_pkey | btree | id | sim | sim |  |
| public.machine_health_metrics | idx_machine_health_calc_at | btree | calculated_at | não | sim |  |
| public.machine_health_metrics | machine_health_metrics_machine_id_period_start_period_end_key | btree | machine_id, period_start, period_end | sim | sim |  |
| public.machine_health_metrics | machine_health_metrics_pkey | btree | id | sim | sim |  |
| public.machine_predictions | idx_machine_predictions_machine_id | btree | machine_id | não | sim |  |
| public.machine_predictions | machine_predictions_pkey | btree | id | sim | sim |  |
| public.machines | idx_machines_technique_id | btree | technique_id | não | sim |  |
| public.machines | machines_code_key | btree | code | sim | sim |  |
| public.machines | machines_pkey | btree | id | sim | sim |  |
| public.maintenance_alerts | idx_maintenance_alerts_machine_id | btree | machine_id | não | sim |  |
| public.maintenance_alerts | idx_maintenance_alerts_schedule_id | btree | schedule_id | não | sim |  |
| public.maintenance_alerts | maintenance_alerts_pkey | btree | id | sim | sim |  |
| public.maintenance_checklist_items | idx_maintenance_checklist_items_checklist_id | btree | checklist_id | não | sim |  |
| public.maintenance_checklist_items | maintenance_checklist_items_pkey | btree | id | sim | sim |  |
| public.maintenance_checklists | idx_checklists_technique | btree | technique_id | não | sim |  |
| public.maintenance_checklists | idx_maintenance_checklists_maintenance_type_id | btree | maintenance_type_id | não | sim |  |
| public.maintenance_checklists | maintenance_checklists_pkey | btree | id | sim | sim |  |
| public.maintenance_item_responses | idx_maintenance_item_responses_checklist_item_id | btree | checklist_item_id | não | sim |  |
| public.maintenance_item_responses | idx_maintenance_item_responses_record_id | btree | record_id | não | sim |  |
| public.maintenance_item_responses | maintenance_item_responses_pkey | btree | id | sim | sim |  |
| public.maintenance_records | idx_maintenance_records_approver_id | btree | approver_id | não | sim |  |
| public.maintenance_records | idx_maintenance_records_machine_id | btree | machine_id | não | sim |  |
| public.maintenance_records | idx_maintenance_records_maintenance_type_id | btree | maintenance_type_id | não | sim |  |
| public.maintenance_records | idx_maintenance_records_override_by | btree | override_by | não | sim |  |
| public.maintenance_records | idx_maintenance_records_schedule_id | btree | schedule_id | não | sim |  |
| public.maintenance_records | idx_maintenance_records_technical_sheet_id | btree | technical_sheet_id | não | sim |  |
| public.maintenance_records | maintenance_records_pkey | btree | id | sim | sim |  |
| public.maintenance_schedules | idx_maintenance_schedules_machine_id | btree | machine_id | não | sim |  |
| public.maintenance_schedules | idx_maintenance_schedules_maintenance_type_id | btree | maintenance_type_id | não | sim |  |
| public.maintenance_schedules | maintenance_schedules_pkey | btree | id | sim | sim |  |
| public.maintenance_types | maintenance_types_pkey | btree | id | sim | sim |  |
| public.materials | materials_pkey | btree | id | sim | sim |  |
| public.new_device_alerts | idx_new_device_alerts_device_id | btree | device_id | não | sim |  |
| public.new_device_alerts | new_device_alerts_pkey | btree | id | sim | sim |  |
| public.operator_achievements | operator_achievements_pkey | btree | id | sim | sim |  |
| public.operator_goals | idx_operator_goals_operator_period | btree | operator_id, period_start, period_end | não | sim |  |
| public.operator_goals | operator_goals_pkey | btree | id | sim | sim |  |
| public.operator_machines | idx_operator_machines_assigned_by | btree | assigned_by | não | sim |  |
| public.operator_machines | idx_operator_machines_machine_id | btree | machine_id | não | sim |  |
| public.operator_machines | operator_machines_operator_id_machine_id_key | btree | operator_id, machine_id | sim | sim |  |
| public.operator_machines | operator_machines_pkey | btree | id | sim | sim |  |
| public.operator_rankings | operator_rankings_operator_id_ranking_type_period_start_per_key | btree | operator_id, ranking_type, period_start, period_end | sim | sim |  |
| public.operator_rankings | operator_rankings_pkey | btree | id | sim | sim |  |
| public.operator_skills | operator_skills_operator_id_technique_id_key | btree | operator_id, technique_id | sim | sim |  |
| public.operator_skills | operator_skills_pkey | btree | id | sim | sim |  |
| public.operator_status_audit | idx_operator_status_audit_created_at | btree | created_at | não | sim |  |
| public.operator_status_audit | idx_operator_status_audit_operator_id | btree | operator_id | não | sim |  |
| public.operator_status_audit | operator_status_audit_pkey | btree | id | sim | sim |  |
| public.packaging_checklist_items | packaging_checklist_items_pkey | btree | id | sim | sim |  |
| public.packaging_defects | idx_packaging_defects_created_at | btree | created_at | não | sim |  |
| public.packaging_defects | idx_packaging_defects_task | btree | packaging_task_id | não | sim |  |
| public.packaging_defects | packaging_defects_pkey | btree | id | sim | sim |  |
| public.packaging_settings | packaging_settings_pkey | btree | id | sim | sim |  |
| public.packaging_sla_overrides | packaging_sla_overrides_client_idx | btree |  | não | sim |  |
| public.packaging_sla_overrides | packaging_sla_overrides_pkey | btree | id | sim | sim |  |
| public.packaging_sla_overrides | packaging_sla_overrides_scope_uidx | btree |  | sim | sim |  |
| public.packaging_sla_overrides | packaging_sla_overrides_technique_idx | btree | technique_id | não | sim |  |
| public.packaging_task_checklist | idx_pkg_task_checklist_task | btree | packaging_task_id | não | sim |  |
| public.packaging_task_checklist | packaging_task_checklist_packaging_task_id_item_id_key | btree | packaging_task_id, item_id | sim | sim |  |
| public.packaging_task_checklist | packaging_task_checklist_pkey | btree | id | sim | sim |  |
| public.packaging_tasks | idx_packaging_tasks_assigned_to | btree | assigned_to | não | sim |  |
| public.packaging_tasks | idx_packaging_tasks_created_at | btree | created_at | não | sim |  |
| public.packaging_tasks | idx_packaging_tasks_delay_category | btree | delay_category | não | sim | `(delay_category IS NOT NULL)` |
| public.packaging_tasks | idx_packaging_tasks_status | btree | status | não | sim |  |
| public.packaging_tasks | packaging_tasks_job_id_key | btree | job_id | sim | sim |  |
| public.packaging_tasks | packaging_tasks_pkey | btree | id | sim | sim |  |
| public.password_reset_requests | idx_password_reset_requests_email | btree | user_email | não | sim |  |
| public.password_reset_requests | idx_password_reset_requests_reviewed_by | btree | reviewed_by | não | sim |  |
| public.password_reset_requests | idx_password_reset_requests_status | btree | status | não | sim |  |
| public.password_reset_requests | password_reset_requests_pkey | btree | id | sim | sim |  |
| public.pre_production_checklists | idx_pre_production_checklists_job_id | btree | job_id | não | sim |  |
| public.pre_production_checklists | pre_production_checklists_pkey | btree | id | sim | sim |  |
| public.prediction_history | idx_prediction_history_machine_id | btree | machine_id | não | sim |  |
| public.prediction_history | idx_prediction_history_prediction_id | btree | prediction_id | não | sim |  |
| public.prediction_history | prediction_history_pkey | btree | id | sim | sim |  |
| public.product_categories | product_categories_pkey | btree | id | sim | sim |  |
| public.production_losses | idx_production_losses_job_id | btree | job_id | não | sim |  |
| public.production_losses | idx_production_losses_operator_id | btree | operator_id | não | sim |  |
| public.production_losses | production_losses_pkey | btree | id | sim | sim |  |
| public.production_lots | idx_production_lots_job_id | btree | job_id | não | sim |  |
| public.production_lots | production_lots_lot_number_key | btree | lot_number | sim | sim |  |
| public.production_lots | production_lots_pkey | btree | id | sim | sim |  |
| public.profiles | profiles_pkey | btree | id | sim | sim |  |
| public.push_notifications | idx_push_notifications_status_created | btree | status, created_at | não | sim | `(status = 'pending'::text)` |
| public.push_notifications | idx_push_notifications_user_created | btree | user_id, created_at | não | sim |  |
| public.push_notifications | idx_push_notifications_user_id | btree | user_id | não | sim |  |
| public.push_notifications | push_notifications_pkey | btree | id | sim | sim |  |
| public.push_subscriptions | idx_push_subscriptions_user_id | btree | user_id | não | sim |  |
| public.push_subscriptions | push_subscriptions_pkey | btree | id | sim | sim |  |
| public.push_subscriptions | push_subscriptions_user_id_endpoint_key | btree | user_id, endpoint | sim | sim |  |
| public.qr_scan_history | idx_qr_scan_history_job_id | btree | job_id | não | sim |  |
| public.qr_scan_history | idx_qr_scan_history_operator_id | btree | operator_id | não | sim |  |
| public.qr_scan_history | idx_qr_scan_history_scanned_at_desc | btree | scanned_at | não | sim |  |
| public.qr_scan_history | qr_scan_history_pkey | btree | id | sim | sim |  |
| public.query_telemetry | idx_query_telemetry_created_at | btree | created_at | não | sim |  |
| public.query_telemetry | idx_query_telemetry_severity | btree | severity | não | sim |  |
| public.query_telemetry | query_telemetry_pkey | btree | id | sim | sim |  |
| public.rate_limit_logs | idx_rate_limit_logs_created | btree | created_at | não | sim |  |
| public.rate_limit_logs | idx_rate_limit_logs_ip | btree | ip_address | não | sim |  |
| public.rate_limit_logs | idx_rate_limit_logs_user_id | btree | user_id | não | sim |  |
| public.rate_limit_logs | rate_limit_logs_pkey | btree | id | sim | sim |  |
| public.rate_limit_settings | idx_rate_limit_settings_created_by | btree | created_by | não | sim |  |
| public.rate_limit_settings | rate_limit_settings_pkey | btree | id | sim | sim |  |
| public.report_templates | idx_report_templates_user_id | btree | user_id | não | sim |  |
| public.report_templates | report_templates_pkey | btree | id | sim | sim |  |
| public.reward_redemptions | idx_reward_redemptions_reward_id | btree | reward_id | não | sim |  |
| public.reward_redemptions | idx_reward_redemptions_user_id | btree | user_id | não | sim |  |
| public.reward_redemptions | reward_redemptions_pkey | btree | id | sim | sim |  |
| public.rls_test_results | rls_test_results_pkey | btree | id | sim | sim |  |
| public.role_permissions | idx_role_permissions_created_by | btree | created_by | não | sim |  |
| public.role_permissions | idx_role_permissions_permission | btree | permission | não | sim |  |
| public.role_permissions | idx_role_permissions_role | btree | role | não | sim |  |
| public.role_permissions | role_permissions_pkey | btree | id | sim | sim |  |
| public.role_permissions | role_permissions_role_permission_key | btree | role, permission | sim | sim |  |
| public.security_events | idx_security_events_created | btree | created_at | não | sim |  |
| public.security_events | idx_security_events_type | btree | event_type | não | sim |  |
| public.security_events | idx_security_events_type_created | btree | event_type, created_at | não | sim |  |
| public.security_events | idx_security_events_type_user | btree | event_type, user_id | não | sim |  |
| public.security_events | idx_security_events_user | btree | user_id | não | sim |  |
| public.security_events | security_events_pkey | btree | id | sim | sim |  |
| public.shift_checklist_templates | idx_shift_checklist_templates_machine_id | btree | machine_id | não | sim |  |
| public.shift_checklist_templates | shift_checklist_templates_pkey | btree | id | sim | sim |  |
| public.shift_handover_checklist | idx_shift_handover_checklist_handover_id | btree | handover_id | não | sim |  |
| public.shift_handover_checklist | shift_handover_checklist_pkey | btree | id | sim | sim |  |
| public.shift_handovers | idx_shift_handovers_machine_id | btree | machine_id | não | sim |  |
| public.shift_handovers | shift_handovers_pkey | btree | id | sim | sim |  |
| public.shift_occurrences | idx_shift_occurrences_handover_id | btree | handover_id | não | sim |  |
| public.shift_occurrences | idx_shift_occurrences_job_id | btree | job_id | não | sim |  |
| public.shift_occurrences | idx_shift_occurrences_machine_id | btree | machine_id | não | sim |  |
| public.shift_occurrences | shift_occurrences_pkey | btree | id | sim | sim |  |
| public.shift_pending_tasks | idx_shift_pending_tasks_handover_id | btree | handover_id | não | sim |  |
| public.shift_pending_tasks | idx_shift_pending_tasks_job_id | btree | job_id | não | sim |  |
| public.shift_pending_tasks | idx_shift_pending_tasks_machine_id | btree | machine_id | não | sim |  |
| public.shift_pending_tasks | shift_pending_tasks_pkey | btree | id | sim | sim |  |
| public.shipments | idx_shipments_job_id | btree | job_id | não | sim |  |
| public.shipments | idx_shipments_provider_id | btree | provider_id | não | sim |  |
| public.shipments | shipments_pkey | btree | id | sim | sim |  |
| public.shipping_providers | shipping_providers_pkey | btree | id | sim | sim |  |
| public.spc_alerts | idx_spc_alerts_measurement_id | btree | measurement_id | não | sim |  |
| public.spc_alerts | idx_spc_alerts_parameter_id | btree | parameter_id | não | sim |  |
| public.spc_alerts | spc_alerts_pkey | btree | id | sim | sim |  |
| public.spc_capability_history | idx_spc_capability_history_parameter_id | btree | parameter_id | não | sim |  |
| public.spc_capability_history | spc_capability_history_pkey | btree | id | sim | sim |  |
| public.spc_control_parameters | idx_spc_control_parameters_machine_id | btree | machine_id | não | sim |  |
| public.spc_control_parameters | spc_control_parameters_pkey | btree | id | sim | sim |  |
| public.spc_measurements | idx_spc_measurements_job_id | btree | job_id | não | sim |  |
| public.spc_measurements | idx_spc_measurements_lot_id | btree | lot_id | não | sim |  |
| public.spc_measurements | idx_spc_measurements_parameter_id | btree | parameter_id | não | sim |  |
| public.spc_measurements | spc_measurements_pkey | btree | id | sim | sim |  |
| public.system_metrics | system_metrics_pkey | btree | id | sim | sim |  |
| public.technical_conversations | idx_technical_conversations_user | btree | user_id | não | sim |  |
| public.technical_conversations | technical_conversations_pkey | btree | id | sim | sim |  |
| public.technical_documents | idx_technical_documents_technical_sheet_id | btree | technical_sheet_id | não | sim |  |
| public.technical_documents | technical_documents_pkey | btree | id | sim | sim |  |
| public.technical_messages | idx_technical_messages_conversation | btree | conversation_id | não | sim |  |
| public.technical_messages | technical_messages_pkey | btree | id | sim | sim |  |
| public.technical_sheet_audit | idx_technical_sheet_audit_technical_sheet_id | btree | technical_sheet_id | não | sim |  |
| public.technical_sheet_audit | idx_technical_sheet_audit_user_id | btree | user_id | não | sim |  |
| public.technical_sheet_audit | technical_sheet_audit_pkey | btree | id | sim | sim |  |
| public.technical_sheet_audit_logs | idx_technical_sheet_audit_logs_technical_sheet_id | btree | technical_sheet_id | não | sim |  |
| public.technical_sheet_audit_logs | idx_technical_sheet_audit_logs_user_id | btree | user_id | não | sim |  |
| public.technical_sheet_audit_logs | technical_sheet_audit_logs_pkey | btree | id | sim | sim |  |
| public.technical_sheet_favorites | idx_technical_sheet_favorites_technical_sheet_id | btree | technical_sheet_id | não | sim |  |
| public.technical_sheet_favorites | technical_sheet_favorites_pkey | btree | id | sim | sim |  |
| public.technical_sheet_favorites | technical_sheet_favorites_user_id_technical_sheet_id_key | btree | user_id, technical_sheet_id | sim | sim |  |
| public.technical_sheet_materials | idx_technical_sheet_materials_inventory_item_id | btree | inventory_item_id | não | sim |  |
| public.technical_sheet_materials | idx_technical_sheet_materials_technical_sheet_id | btree | technical_sheet_id | não | sim |  |
| public.technical_sheet_materials | technical_sheet_materials_pkey | btree | id | sim | sim |  |
| public.technical_sheet_steps | idx_technical_sheet_steps_technical_sheet_id | btree | technical_sheet_id | não | sim |  |
| public.technical_sheet_steps | technical_sheet_steps_pkey | btree | id | sim | sim |  |
| public.technical_sheet_tips | idx_technical_sheet_tips_technical_sheet_id | btree | technical_sheet_id | não | sim |  |
| public.technical_sheet_tips | technical_sheet_tips_pkey | btree | id | sim | sim |  |
| public.technical_sheet_versions | idx_technical_sheet_versions_created_by | btree | created_by | não | sim |  |
| public.technical_sheet_versions | idx_technical_sheet_versions_sheet_id | btree | sheet_id | não | sim |  |
| public.technical_sheet_versions | technical_sheet_versions_pkey | btree | id | sim | sim |  |
| public.technical_sheets | idx_technical_sheets_created_by | btree | created_by | não | sim |  |
| public.technical_sheets | idx_technical_sheets_material_id | btree | material_id | não | sim |  |
| public.technical_sheets | idx_technical_sheets_product_category_id | btree | product_category_id | não | sim |  |
| public.technical_sheets | idx_technical_sheets_recommended_machine_id | btree | recommended_machine_id | não | sim |  |
| public.technical_sheets | idx_technical_sheets_technique_id | btree | technique_id | não | sim |  |
| public.technical_sheets | idx_technical_sheets_updated_by | btree | updated_by | não | sim |  |
| public.technical_sheets | technical_sheets_pkey | btree | id | sim | sim |  |
| public.techniques | techniques_pkey | btree | id | sim | sim |  |
| public.telemetry_traces | idx_telemetry_traces_created_at | btree | created_at | não | sim |  |
| public.telemetry_traces | idx_telemetry_traces_service_created | btree | service_name, created_at | não | sim |  |
| public.telemetry_traces | idx_telemetry_traces_trace_id | btree | trace_id | não | sim |  |
| public.telemetry_traces | telemetry_traces_pkey | btree | id | sim | sim |  |
| public.tpm_execution_alerts | idx_tpm_execution_alerts_execution_id | btree | execution_id | não | sim |  |
| public.tpm_execution_alerts | tpm_execution_alerts_pkey | btree | id | sim | sim |  |
| public.tpm_execution_audit_logs | idx_tpm_execution_audit_logs_changed_by | btree | changed_by | não | sim |  |
| public.tpm_execution_audit_logs | idx_tpm_execution_audit_logs_execution_id | btree | execution_id | não | sim |  |
| public.tpm_execution_audit_logs | tpm_execution_audit_logs_pkey | btree | id | sim | sim |  |
| public.tpm_execution_parts | idx_tpm_execution_parts_execution_id | btree | execution_id | não | sim |  |
| public.tpm_execution_parts | tpm_execution_parts_pkey | btree | id | sim | sim |  |
| public.tpm_execution_supplies | idx_tpm_execution_supplies_execution_id | btree | execution_id | não | sim |  |
| public.tpm_execution_supplies | tpm_execution_supplies_pkey | btree | id | sim | sim |  |
| public.tpm_executions | idx_tpm_executions_machine_id | btree | machine_id | não | sim |  |
| public.tpm_executions | idx_tpm_executions_schedule_id | btree | schedule_id | não | sim |  |
| public.tpm_executions | idx_tpm_executions_technical_sheet_id | btree | technical_sheet_id | não | sim |  |
| public.tpm_executions | idx_tpm_executions_technician_id | btree | technician_id | não | sim |  |
| public.tpm_executions | tpm_executions_pkey | btree | id | sim | sim |  |
| public.tpm_notification_logs | idx_tpm_notification_logs_machine_id | btree | machine_id | não | sim |  |
| public.tpm_notification_logs | idx_tpm_notification_logs_user_id | btree | user_id | não | sim |  |
| public.tpm_notification_logs | tpm_notification_logs_pkey | btree | id | sim | sim |  |
| public.tpm_notification_queue | idx_tpm_notification_queue_machine_id | btree | machine_id | não | sim |  |
| public.tpm_notification_queue | idx_tpm_notification_queue_template_id | btree | template_id | não | sim |  |
| public.tpm_notification_queue | idx_tpm_queue_pending | btree | status, next_retry_at | não | sim | `((status = ANY (ARRAY['pending'::text, 'failed'::text])) AND (retry_count < max_retries))` |
| public.tpm_notification_queue | tpm_notification_queue_pkey | btree | id | sim | sim |  |
| public.tpm_notification_templates | tpm_notification_templates_pkey | btree | id | sim | sim |  |
| public.tpm_notification_templates_published | idx_tpm_notification_templates_published_template_id | btree | template_id | não | sim |  |
| public.tpm_notification_templates_published | tpm_notification_templates_published_pkey | btree | id | sim | sim |  |
| public.tpm_parameter_alerts | idx_tpm_parameter_alerts_execution_id | btree | execution_id | não | sim |  |
| public.tpm_parameter_alerts | tpm_parameter_alerts_pkey | btree | id | sim | sim |  |
| public.tpm_severity_configs | tpm_severity_configs_machine_id_severity_key | btree | machine_id, severity | sim | sim |  |
| public.tpm_severity_configs | tpm_severity_configs_pkey | btree | id | sim | sim |  |
| public.user_devices | user_devices_pkey | btree | id | sim | sim |  |
| public.user_devices | user_devices_unique_fingerprint | btree | user_id, device_fingerprint | sim | sim |  |
| public.user_devices | user_devices_user_id_idx | btree | user_id | não | sim |  |
| public.user_favorites | user_favorites_pkey | btree | id | sim | sim |  |
| public.user_favorites | user_favorites_user_id_key | btree | user_id | sim | sim |  |
| public.user_mfa_settings | user_mfa_settings_pkey | btree | id | sim | sim |  |
| public.user_mfa_settings | user_mfa_settings_user_id_key | btree | user_id | sim | sim |  |
| public.user_notification_settings | user_notification_settings_pkey | btree | id | sim | sim |  |
| public.user_notification_settings | user_notification_settings_user_id_key | btree | user_id | sim | sim |  |
| public.user_roles | idx_user_roles_is_active | btree | is_active | não | sim |  |
| public.user_roles | idx_user_roles_role | btree | role | não | sim |  |
| public.user_roles | idx_user_roles_user_id | btree | user_id | não | sim |  |
| public.user_roles | user_roles_pkey | btree | id | sim | sim |  |
| public.user_roles | user_roles_user_id_role_key | btree | user_id, role | sim | sim |  |
| public.webhook_logs | idx_webhook_logs_created_at | btree | created_at | não | sim |  |
| public.webhook_logs | idx_webhook_logs_source | btree | source | não | sim |  |
| public.webhook_logs | webhook_logs_pkey | btree | id | sim | sim |  |
