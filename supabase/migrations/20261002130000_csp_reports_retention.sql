-- Retenção para csp_violation_reports: o endpoint público aceita até 600
-- relatórios/min (rate limit da edge function), e purge_old_logs não cobria
-- a tabela — um atacante podia encher o banco com ~864k relatórios/dia.
-- 14 dias basta: o relatório só serve enquanto o CSP Report-Only está sendo
-- ajustado. Recria purge_old_logs com o DELETE adicional (mantém os demais).

CREATE OR REPLACE FUNCTION public.purge_old_logs()
RETURNS TABLE(table_name text, deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted BIGINT;
BEGIN
  DELETE FROM public.rate_limit_logs WHERE created_at < now() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'rate_limit_logs'; deleted_count := v_deleted; RETURN NEXT;

  DELETE FROM public.login_audit WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'login_audit'; deleted_count := v_deleted; RETURN NEXT;

  DELETE FROM public.security_events WHERE created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'security_events'; deleted_count := v_deleted; RETURN NEXT;

  DELETE FROM public.webhook_logs WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'webhook_logs'; deleted_count := v_deleted; RETURN NEXT;

  DELETE FROM public.error_logs WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'error_logs'; deleted_count := v_deleted; RETURN NEXT;

  DELETE FROM public.geo_blocking_logs WHERE created_at < now() - INTERVAL '60 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'geo_blocking_logs'; deleted_count := v_deleted; RETURN NEXT;

  DELETE FROM public.push_notifications
    WHERE created_at < now() - INTERVAL '60 days'
      AND status IN ('sent', 'delivered', 'failed');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'push_notifications'; deleted_count := v_deleted; RETURN NEXT;

  DELETE FROM public.query_telemetry WHERE created_at < now() - INTERVAL '14 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'query_telemetry'; deleted_count := v_deleted; RETURN NEXT;

  DELETE FROM public.telemetry_traces WHERE created_at < now() - INTERVAL '14 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'telemetry_traces'; deleted_count := v_deleted; RETURN NEXT;

  DELETE FROM public.edge_health_history WHERE captured_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  table_name := 'edge_health_history'; deleted_count := v_deleted; RETURN NEXT;

  -- tabela pode não existir em ambientes onde 20261001152000 ainda não rodou
  IF to_regclass('public.csp_violation_reports') IS NOT NULL THEN
    DELETE FROM public.csp_violation_reports WHERE created_at < now() - INTERVAL '14 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    table_name := 'csp_violation_reports'; deleted_count := v_deleted; RETURN NEXT;
  END IF;

  RETURN;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_old_logs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_old_logs() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_old_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_old_logs() TO service_role;
