CREATE TABLE IF NOT EXISTS public.edge_health_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pass','warn','fail')),
  checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  latency_ms INTEGER,
  source TEXT NOT NULL DEFAULT 'health-monitor',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.edge_health_history TO authenticated;
GRANT ALL ON public.edge_health_history TO service_role;

ALTER TABLE public.edge_health_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordinators and managers can view edge health"
ON public.edge_health_history
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')
);

CREATE INDEX IF NOT EXISTS idx_edge_health_history_captured_at
  ON public.edge_health_history (captured_at DESC);

-- Resumo consolidado agora inclui a saúde das funções de servidor.
DROP FUNCTION IF EXISTS public.get_system_status_summary();

CREATE OR REPLACE FUNCTION public.get_system_status_summary()
RETURNS TABLE(
  total_jobs integer,
  healthy_jobs integer,
  failing_jobs integer,
  stale_jobs integer,
  last_capture timestamp with time zone,
  edge_status text,
  edge_last_check timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_edge_status TEXT := 'unknown';
  v_edge_last TIMESTAMPTZ;
  v_last_status TEXT;
BEGIN
  IF NOT public.has_any_active_role() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  SELECT h.status, h.captured_at
    INTO v_last_status, v_edge_last
    FROM public.edge_health_history h
   ORDER BY h.captured_at DESC
   LIMIT 1;

  IF v_edge_last IS NULL OR v_edge_last < now() - INTERVAL '60 minutes' THEN
    v_edge_status := 'unknown';
  ELSIF v_last_status = 'pass' THEN
    v_edge_status := 'operational';
  ELSIF v_last_status = 'warn' THEN
    v_edge_status := 'degraded';
  ELSE
    v_edge_status := 'outage';
  END IF;

  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (h.jobid)
           h.jobid, h.consecutive_failures, h.is_stale, h.active, h.captured_at
      FROM public.cron_health_history h
     WHERE h.captured_at > now() - INTERVAL '24 hours'
     ORDER BY h.jobid, h.captured_at DESC
  )
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE COALESCE(l.consecutive_failures,0) = 0 AND NOT COALESCE(l.is_stale,false))::int,
    COUNT(*) FILTER (WHERE COALESCE(l.consecutive_failures,0) >= 3)::int,
    COUNT(*) FILTER (WHERE COALESCE(l.is_stale,false))::int,
    MAX(l.captured_at),
    v_edge_status,
    v_edge_last
  FROM latest l;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_system_status_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_system_status_summary() TO authenticated;

-- Retenção: limpar histórico de saúde das edge functions com mais de 30 dias.
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

  RETURN;
END;
$function$;