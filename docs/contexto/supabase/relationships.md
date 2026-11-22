# Relacionamentos (chaves estrangeiras)


| de | colunas | para | colunas | on delete | on update |
|---|---|---|---|---|---|
| public.abc_activities | technique_id | public.techniques | id | NO ACTION | NO ACTION |
| public.abc_activity_rates | activity_id | public.abc_activities | id | CASCADE | NO ACTION |
| public.abc_activity_rates | cost_pool_id | public.abc_cost_pools | id | CASCADE | NO ACTION |
| public.abc_job_costs | activity_id | public.abc_activities | id | NO ACTION | NO ACTION |
| public.abc_job_costs | cost_pool_id | public.abc_cost_pools | id | NO ACTION | NO ACTION |
| public.abc_job_costs | job_id | public.jobs | id | CASCADE | NO ACTION |
| public.blocked_ips | blocked_by | auth.users | id | SET NULL | NO ACTION |
| public.blocked_ips | unblocked_by | auth.users | id | SET NULL | NO ACTION |
| public.business_config | updated_by | auth.users | id | NO ACTION | NO ACTION |
| public.dashboard_presets | user_id | auth.users | id | CASCADE | NO ACTION |
| public.document_versions | document_id | public.technical_documents | id | CASCADE | NO ACTION |
| public.efficiency_alert_history | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.energy_alerts | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.energy_consumption | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.energy_targets | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.geo_blocking_rules | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.geo_blocking_settings | updated_by | auth.users | id | NO ACTION | NO ACTION |
| public.inventory_movements | item_id | public.inventory_items | id | CASCADE | NO ACTION |
| public.inventory_movements | job_id | public.jobs | id | SET NULL | NO ACTION |
| public.inventory_movements | user_id | public.profiles | id | SET NULL | NO ACTION |
| public.ip_allowlist | user_id | auth.users | id | CASCADE | NO ACTION |
| public.job_status_audit | changed_by | auth.users | id | NO ACTION | NO ACTION |
| public.job_status_audit | job_id | public.jobs | id | CASCADE | NO ACTION |
| public.job_status_history | changed_by | auth.users | id | NO ACTION | NO ACTION |
| public.job_status_history | job_id | public.jobs | id | CASCADE | NO ACTION |
| public.jobs | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.jobs | operator_id | auth.users | id | NO ACTION | NO ACTION |
| public.jobs | parent_job_id | public.jobs | id | SET NULL | NO ACTION |
| public.jobs | product_category_id | public.product_categories | id | NO ACTION | NO ACTION |
| public.jobs | shipment_id | public.shipments | id | NO ACTION | NO ACTION |
| public.jobs | technique_id | public.techniques | id | NO ACTION | NO ACTION |
| public.kpi_alerts | machine_id | public.machines | id | CASCADE | NO ACTION |
| public.login_audit | user_id | auth.users | id | CASCADE | NO ACTION |
| public.lot_components | component_lot_id | public.production_lots | id | SET NULL | NO ACTION |
| public.lot_components | lot_id | public.production_lots | id | CASCADE | NO ACTION |
| public.lot_components | material_id | public.materials | id | SET NULL | NO ACTION |
| public.lot_movements | job_id | public.jobs | id | SET NULL | NO ACTION |
| public.lot_movements | lot_id | public.production_lots | id | CASCADE | NO ACTION |
| public.lot_quality_inspections | lot_id | public.production_lots | id | CASCADE | NO ACTION |
| public.machine_downtime | job_id | public.jobs | id | NO ACTION | NO ACTION |
| public.machine_downtime | machine_id | public.machines | id | CASCADE | NO ACTION |
| public.machine_downtime | operator_id | auth.users | id | NO ACTION | NO ACTION |
| public.machine_event_audit | machine_id | public.machines | id | CASCADE | NO ACTION |
| public.machine_event_audit | performed_by | auth.users | id | NO ACTION | NO ACTION |
| public.machine_health_metrics | machine_id | public.machines | id | CASCADE | NO ACTION |
| public.machine_predictions | machine_id | public.machines | id | CASCADE | NO ACTION |
| public.machines | technique_id | public.techniques | id | NO ACTION | NO ACTION |
| public.maintenance_alerts | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.maintenance_alerts | schedule_id | public.maintenance_schedules | id | CASCADE | NO ACTION |
| public.maintenance_checklist_items | checklist_id | public.maintenance_checklists | id | CASCADE | NO ACTION |
| public.maintenance_checklists | maintenance_type_id | public.maintenance_types | id | NO ACTION | NO ACTION |
| public.maintenance_checklists | technique_id | public.techniques | id | NO ACTION | NO ACTION |
| public.maintenance_item_responses | checklist_item_id | public.maintenance_checklist_items | id | NO ACTION | NO ACTION |
| public.maintenance_item_responses | record_id | public.maintenance_records | id | CASCADE | NO ACTION |
| public.maintenance_records | approver_id | auth.users | id | NO ACTION | NO ACTION |
| public.maintenance_records | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.maintenance_records | maintenance_type_id | public.maintenance_types | id | NO ACTION | NO ACTION |
| public.maintenance_records | override_by | auth.users | id | NO ACTION | NO ACTION |
| public.maintenance_records | schedule_id | public.maintenance_schedules | id | CASCADE | NO ACTION |
| public.maintenance_records | technical_sheet_id | public.technical_sheets | id | NO ACTION | NO ACTION |
| public.maintenance_schedules | machine_id | public.machines | id | CASCADE | NO ACTION |
| public.maintenance_schedules | maintenance_type_id | public.maintenance_types | id | NO ACTION | NO ACTION |
| public.new_device_alerts | device_id | public.user_devices | id | NO ACTION | NO ACTION |
| public.operator_machines | assigned_by | auth.users | id | NO ACTION | NO ACTION |
| public.operator_machines | machine_id | public.machines | id | CASCADE | NO ACTION |
| public.operator_machines | operator_id | auth.users | id | CASCADE | NO ACTION |
| public.operator_skills | operator_id | auth.users | id | CASCADE | NO ACTION |
| public.packaging_defects | packaging_task_id | public.packaging_tasks | id | CASCADE | NO ACTION |
| public.packaging_defects | reported_by | auth.users | id | SET NULL | NO ACTION |
| public.packaging_sla_overrides | technique_id | public.techniques | id | CASCADE | NO ACTION |
| public.packaging_task_checklist | checked_by | auth.users | id | SET NULL | NO ACTION |
| public.packaging_task_checklist | item_id | public.packaging_checklist_items | id | CASCADE | NO ACTION |
| public.packaging_task_checklist | packaging_task_id | public.packaging_tasks | id | CASCADE | NO ACTION |
| public.packaging_tasks | assigned_to | auth.users | id | SET NULL | NO ACTION |
| public.packaging_tasks | job_id | public.jobs | id | CASCADE | NO ACTION |
| public.password_reset_requests | reviewed_by | auth.users | id | NO ACTION | NO ACTION |
| public.pre_production_checklists | job_id | public.jobs | id | CASCADE | NO ACTION |
| public.prediction_history | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.prediction_history | prediction_id | public.machine_predictions | id | CASCADE | NO ACTION |
| public.production_losses | job_id | public.jobs | id | CASCADE | NO ACTION |
| public.production_losses | operator_id | auth.users | id | NO ACTION | NO ACTION |
| public.production_lots | job_id | public.jobs | id | SET NULL | NO ACTION |
| public.profiles | id | auth.users | id | CASCADE | NO ACTION |
| public.push_notifications | user_id | auth.users | id | CASCADE | NO ACTION |
| public.push_subscriptions | user_id | auth.users | id | CASCADE | NO ACTION |
| public.qr_scan_history | job_id | public.jobs | id | CASCADE | NO ACTION |
| public.qr_scan_history | operator_id | auth.users | id | CASCADE | NO ACTION |
| public.rate_limit_logs | user_id | auth.users | id | SET NULL | NO ACTION |
| public.rate_limit_settings | created_by | auth.users | id | SET NULL | NO ACTION |
| public.report_templates | user_id | auth.users | id | CASCADE | NO ACTION |
| public.reward_redemptions | reward_id | public.gamification_rewards | id | NO ACTION | NO ACTION |
| public.reward_redemptions | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.role_permissions | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.security_events | user_id | auth.users | id | SET NULL | NO ACTION |
| public.shift_checklist_templates | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.shift_handover_checklist | handover_id | public.shift_handovers | id | CASCADE | NO ACTION |
| public.shift_handovers | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.shift_occurrences | handover_id | public.shift_handovers | id | CASCADE | NO ACTION |
| public.shift_occurrences | job_id | public.jobs | id | NO ACTION | NO ACTION |
| public.shift_occurrences | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.shift_pending_tasks | handover_id | public.shift_handovers | id | CASCADE | NO ACTION |
| public.shift_pending_tasks | job_id | public.jobs | id | NO ACTION | NO ACTION |
| public.shift_pending_tasks | machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.shipments | job_id | public.jobs | id | CASCADE | NO ACTION |
| public.shipments | provider_id | public.shipping_providers | id | NO ACTION | NO ACTION |
| public.spc_alerts | measurement_id | public.spc_measurements | id | SET NULL | NO ACTION |
| public.spc_alerts | parameter_id | public.spc_control_parameters | id | CASCADE | NO ACTION |
| public.spc_capability_history | parameter_id | public.spc_control_parameters | id | CASCADE | NO ACTION |
| public.spc_control_parameters | machine_id | public.machines | id | SET NULL | NO ACTION |
| public.spc_measurements | job_id | public.jobs | id | SET NULL | NO ACTION |
| public.spc_measurements | lot_id | public.production_lots | id | SET NULL | NO ACTION |
| public.spc_measurements | parameter_id | public.spc_control_parameters | id | CASCADE | NO ACTION |
| public.technical_documents | technical_sheet_id | public.technical_sheets | id | CASCADE | NO ACTION |
| public.technical_messages | conversation_id | public.technical_conversations | id | CASCADE | NO ACTION |
| public.technical_sheet_audit | technical_sheet_id | public.technical_sheets | id | CASCADE | NO ACTION |
| public.technical_sheet_audit | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.technical_sheet_audit_logs | technical_sheet_id | public.technical_sheets | id | CASCADE | NO ACTION |
| public.technical_sheet_audit_logs | user_id | auth.users | id | NO ACTION | NO ACTION |
| public.technical_sheet_favorites | technical_sheet_id | public.technical_sheets | id | CASCADE | NO ACTION |
| public.technical_sheet_favorites | user_id | auth.users | id | CASCADE | NO ACTION |
| public.technical_sheet_materials | inventory_item_id | public.inventory_items | id | SET NULL | NO ACTION |
| public.technical_sheet_materials | technical_sheet_id | public.technical_sheets | id | CASCADE | NO ACTION |
| public.technical_sheet_steps | technical_sheet_id | public.technical_sheets | id | CASCADE | NO ACTION |
| public.technical_sheet_tips | technical_sheet_id | public.technical_sheets | id | CASCADE | NO ACTION |
| public.technical_sheet_versions | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.technical_sheet_versions | sheet_id | public.technical_sheets | id | CASCADE | NO ACTION |
| public.technical_sheets | created_by | auth.users | id | NO ACTION | NO ACTION |
| public.technical_sheets | material_id | public.materials | id | NO ACTION | NO ACTION |
| public.technical_sheets | product_category_id | public.product_categories | id | NO ACTION | NO ACTION |
| public.technical_sheets | recommended_machine_id | public.machines | id | NO ACTION | NO ACTION |
| public.technical_sheets | technique_id | public.techniques | id | NO ACTION | NO ACTION |
| public.technical_sheets | updated_by | auth.users | id | NO ACTION | NO ACTION |
| public.tpm_execution_alerts | execution_id | public.maintenance_records | id | CASCADE | NO ACTION |
| public.tpm_execution_audit_logs | changed_by | auth.users | id | NO ACTION | NO ACTION |
| public.tpm_execution_audit_logs | execution_id | public.maintenance_records | id | CASCADE | NO ACTION |
| public.tpm_execution_parts | execution_id | public.maintenance_records | id | CASCADE | NO ACTION |
| public.tpm_execution_supplies | execution_id | public.maintenance_records | id | CASCADE | NO ACTION |
| public.tpm_executions | machine_id | public.machines | id | CASCADE | NO ACTION |
| public.tpm_executions | schedule_id | public.maintenance_schedules | id | CASCADE | NO ACTION |
| public.tpm_executions | technical_sheet_id | public.technical_sheets | id | NO ACTION | NO ACTION |
| public.tpm_executions | technician_id | auth.users | id | NO ACTION | NO ACTION |
| public.tpm_notification_logs | machine_id | public.machines | id | SET NULL | NO ACTION |
| public.tpm_notification_logs | user_id | auth.users | id | SET NULL | NO ACTION |
| public.tpm_notification_queue | machine_id | public.machines | id | CASCADE | NO ACTION |
| public.tpm_notification_queue | template_id | public.tpm_notification_templates_published | id | NO ACTION | NO ACTION |
| public.tpm_notification_templates_published | template_id | public.tpm_notification_templates | id | CASCADE | NO ACTION |
| public.tpm_parameter_alerts | execution_id | public.maintenance_records | id | CASCADE | NO ACTION |
| public.tpm_severity_configs | machine_id | public.machines | id | CASCADE | NO ACTION |
| public.user_favorites | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_mfa_settings | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_notification_settings | user_id | auth.users | id | CASCADE | NO ACTION |
| public.user_roles | user_id | public.profiles | id | CASCADE | NO ACTION |


_Diagrama omitido: mais de 120 tabelas._
