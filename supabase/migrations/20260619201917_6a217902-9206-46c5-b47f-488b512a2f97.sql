-- Fase 1: índices em FKs ausentes (CREATE INDEX IF NOT EXISTS, idempotente)
CREATE INDEX IF NOT EXISTS idx_technical_sheets_technique_id ON public.technical_sheets(technique_id);
CREATE INDEX IF NOT EXISTS idx_technical_sheets_updated_by   ON public.technical_sheets(updated_by);

CREATE INDEX IF NOT EXISTS idx_tpm_execution_alerts_execution_id      ON public.tpm_execution_alerts(execution_id);
CREATE INDEX IF NOT EXISTS idx_tpm_execution_audit_logs_changed_by    ON public.tpm_execution_audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_tpm_execution_audit_logs_execution_id  ON public.tpm_execution_audit_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_tpm_execution_checklist_execution_id   ON public.tpm_execution_checklist(execution_id);
CREATE INDEX IF NOT EXISTS idx_tpm_execution_parts_execution_id       ON public.tpm_execution_parts(execution_id);
CREATE INDEX IF NOT EXISTS idx_tpm_execution_supplies_execution_id    ON public.tpm_execution_supplies(execution_id);

CREATE INDEX IF NOT EXISTS idx_tpm_executions_machine_id         ON public.tpm_executions(machine_id);
CREATE INDEX IF NOT EXISTS idx_tpm_executions_schedule_id        ON public.tpm_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_tpm_executions_technical_sheet_id ON public.tpm_executions(technical_sheet_id);
CREATE INDEX IF NOT EXISTS idx_tpm_executions_technician_id      ON public.tpm_executions(technician_id);

CREATE INDEX IF NOT EXISTS idx_tpm_notification_logs_machine_id  ON public.tpm_notification_logs(machine_id);
CREATE INDEX IF NOT EXISTS idx_tpm_notification_logs_user_id     ON public.tpm_notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tpm_notification_queue_machine_id ON public.tpm_notification_queue(machine_id);
CREATE INDEX IF NOT EXISTS idx_tpm_notification_queue_template_id ON public.tpm_notification_queue(template_id);
CREATE INDEX IF NOT EXISTS idx_tpm_notification_templates_published_template_id ON public.tpm_notification_templates_published(template_id);
CREATE INDEX IF NOT EXISTS idx_tpm_parameter_alerts_execution_id ON public.tpm_parameter_alerts(execution_id);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id    ON public.webauthn_challenges(user_id);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id   ON public.reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id     ON public.reward_redemptions(user_id);

CREATE INDEX IF NOT EXISTS idx_report_templates_user_id       ON public.report_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_technical_sheet_versions_created_by ON public.technical_sheet_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_technical_sheet_versions_sheet_id   ON public.technical_sheet_versions(sheet_id);

CREATE INDEX IF NOT EXISTS idx_shipments_job_id      ON public.shipments(job_id);
CREATE INDEX IF NOT EXISTS idx_shipments_provider_id ON public.shipments(provider_id);

CREATE INDEX IF NOT EXISTS idx_production_losses_job_id      ON public.production_losses(job_id);
CREATE INDEX IF NOT EXISTS idx_production_losses_operator_id ON public.production_losses(operator_id);

CREATE INDEX IF NOT EXISTS idx_machine_downtime_job_id      ON public.machine_downtime(job_id);
CREATE INDEX IF NOT EXISTS idx_machine_downtime_machine_id  ON public.machine_downtime(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_downtime_operator_id ON public.machine_downtime(operator_id);

CREATE INDEX IF NOT EXISTS idx_job_status_history_changed_by ON public.job_status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id     ON public.job_status_history(job_id);

CREATE INDEX IF NOT EXISTS idx_shipment_costs_shipment_id    ON public.shipment_costs(shipment_id);

CREATE INDEX IF NOT EXISTS idx_business_config_updated_by    ON public.business_config(updated_by);

CREATE INDEX IF NOT EXISTS idx_kpi_alerts_machine_id         ON public.kpi_alerts(machine_id);

CREATE INDEX IF NOT EXISTS idx_job_status_audit_changed_by   ON public.job_status_audit(changed_by);
CREATE INDEX IF NOT EXISTS idx_job_status_audit_job_id       ON public.job_status_audit(job_id);

CREATE INDEX IF NOT EXISTS idx_machine_event_audit_machine_id  ON public.machine_event_audit(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_event_audit_performed_by ON public.machine_event_audit(performed_by);

CREATE INDEX IF NOT EXISTS idx_dashboard_presets_user_id     ON public.dashboard_presets(user_id);