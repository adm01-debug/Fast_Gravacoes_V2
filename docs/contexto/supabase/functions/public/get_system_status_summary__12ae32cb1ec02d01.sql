CREATE OR REPLACE FUNCTION public.get_system_status_summary()
 RETURNS TABLE(total_jobs integer, healthy_jobs integer, failing_jobs integer, stale_jobs integer, last_capture timestamp with time zone, edge_status text, edge_last_check timestamp with time zone)
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
$function$
