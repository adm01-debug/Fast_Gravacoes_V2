-- Revoke execute from public for sensitive functions
REVOKE EXECUTE ON FUNCTION public.validate_stock_before_movement() FROM public

REVOKE EXECUTE ON FUNCTION public.log_job_status_change() FROM public

REVOKE EXECUTE ON FUNCTION public.check_and_notify_kpi_alert(uuid, text, double precision, double precision, text) FROM public

REVOKE EXECUTE ON FUNCTION public.audit_machine_changes() FROM public

REVOKE EXECUTE ON FUNCTION public.audit_job_changes() FROM public

REVOKE EXECUTE ON FUNCTION public.rollback_inventory_stock() FROM public

REVOKE EXECUTE ON FUNCTION public.audit_log_immutable() FROM public

REVOKE EXECUTE ON FUNCTION public.log_security_violation() FROM public

REVOKE EXECUTE ON FUNCTION public.compute_audit_hash(text, text, text, uuid, jsonb, jsonb, text, timestamp with time zone) FROM public

REVOKE EXECUTE ON FUNCTION public.process_audit_log_hashing() FROM public

REVOKE EXECUTE ON FUNCTION public.calculate_audit_hash(audit_log) FROM public

-- Ensure only authenticated users can execute them if needed, or leave restricted to service_role/triggers
-- Most of these are trigger functions, so they don't need public execute at all.
