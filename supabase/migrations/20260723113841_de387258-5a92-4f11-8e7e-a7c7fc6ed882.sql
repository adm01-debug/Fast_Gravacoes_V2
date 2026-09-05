
-- Retention policy: purge logs antigos para manter tabelas enxutas e performáticas.
-- rate_limit_logs: retenção de 7 dias (dado transacional de curta duração)
-- login_audit: retenção de 90 dias (compliance)
-- security_events: retenção de 180 dias (segurança)
-- webhook_logs: retenção de 30 dias
-- error_logs: retenção de 30 dias
-- audit_log: NÃO é purgado (append-only imutável, chain de hash)

CREATE OR REPLACE FUNCTION public.purge_old_logs()
RETURNS TABLE(
  table_name TEXT,
  deleted_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  -- rate_limit_logs: 7 dias
  DELETE FROM public.rate_limit_logs WHERE created_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'rate_limit_logs'; deleted_count := v_deleted; RETURN NEXT;

  -- login_audit: 90 dias
  DELETE FROM public.login_audit WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'login_audit'; deleted_count := v_deleted; RETURN NEXT;

  -- security_events: 180 dias
  DELETE FROM public.security_events WHERE created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'security_events'; deleted_count := v_deleted; RETURN NEXT;

  -- webhook_logs: 30 dias
  DELETE FROM public.webhook_logs WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'webhook_logs'; deleted_count := v_deleted; RETURN NEXT;

  -- error_logs: 30 dias
  DELETE FROM public.error_logs WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'error_logs'; deleted_count := v_deleted; RETURN NEXT;

  -- geo_blocking_logs: 60 dias
  DELETE FROM public.geo_blocking_logs WHERE created_at < now() - INTERVAL '60 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'geo_blocking_logs'; deleted_count := v_deleted; RETURN NEXT;

  -- push_notifications enviadas: 60 dias
  DELETE FROM public.push_notifications
    WHERE created_at < now() - INTERVAL '60 days'
      AND status IN ('sent', 'delivered', 'failed');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'push_notifications'; deleted_count := v_deleted; RETURN NEXT;

  -- query_telemetry: 14 dias
  DELETE FROM public.query_telemetry WHERE created_at < now() - INTERVAL '14 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'query_telemetry'; deleted_count := v_deleted; RETURN NEXT;

  -- telemetry_traces: 14 dias
  DELETE FROM public.telemetry_traces WHERE created_at < now() - INTERVAL '14 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'telemetry_traces'; deleted_count := v_deleted; RETURN NEXT;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_logs() TO service_role;

COMMENT ON FUNCTION public.purge_old_logs() IS
  'Purga logs antigos conforme política de retenção. Executar via cron diário (edge function cron-cleanup). audit_log NÃO é purgado (append-only imutável).';
