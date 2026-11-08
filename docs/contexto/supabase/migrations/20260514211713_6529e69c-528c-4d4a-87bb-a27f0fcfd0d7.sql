-- 1. Reforço de RLS na error_logs
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON public.error_logs

CREATE POLICY "Users can insert error logs" 
ON public.error_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL)

-- 2. Restrição de funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.audit_logistics_changes() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.audit_technical_sheet_changes() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.audit_tpm_execution_changes() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.check_job_overlap() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.create_technical_sheet_version() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.log_role_changes() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.log_security_violation() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.log_technical_sheet_change() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.notify_loss_risk() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.notify_tpm_email() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.trigger_auto_promotion() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.update_inventory_stock() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.validate_inventory_stock() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.verify_audit_chain() FROM PUBLIC

REVOKE EXECUTE ON FUNCTION public.verify_audit_chain(integer) FROM PUBLIC

GRANT EXECUTE ON FUNCTION public.audit_logistics_changes() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.audit_technical_sheet_changes() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.audit_tpm_execution_changes() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.check_job_overlap() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.create_technical_sheet_version() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.log_role_changes() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.log_security_violation() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.log_technical_sheet_change() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.notify_loss_risk() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.notify_tpm_email() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.trigger_auto_promotion() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.update_inventory_stock() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.validate_inventory_stock() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.verify_audit_chain() TO authenticated, service_role

GRANT EXECUTE ON FUNCTION public.verify_audit_chain(integer) TO authenticated, service_role

-- 3. Constraints de integridade
DO $$ 
BEGIN
    -- Validar horários dos Jobs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_job_times') THEN
        ALTER TABLE public.jobs ADD CONSTRAINT check_job_times CHECK (end_time >= start_time);
    END IF;

    -- Validar estoque positivo em inventory_items (current_stock)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_positive_stock') THEN
        ALTER TABLE public.inventory_items ADD CONSTRAINT check_positive_stock CHECK (current_stock >= 0);
    END IF;
END $$

-- 4. Otimização de Performance e Auditoria
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at_desc ON public.audit_log(created_at DESC)

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at_desc ON public.error_logs(created_at DESC)

CREATE INDEX IF NOT EXISTS idx_jobs_status_scheduled ON public.jobs(status, scheduled_date)

CREATE INDEX IF NOT EXISTS idx_security_events_type_user ON public.security_events(event_type, user_id)

CREATE INDEX IF NOT EXISTS idx_qr_scan_history_scanned_at_desc ON public.qr_scan_history(scanned_at DESC)
