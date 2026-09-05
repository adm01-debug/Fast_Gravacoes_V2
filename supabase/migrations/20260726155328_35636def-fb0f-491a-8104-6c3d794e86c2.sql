CREATE OR REPLACE FUNCTION public.get_system_status_summary()
RETURNS TABLE(
  total_jobs integer,
  healthy_jobs integer,
  failing_jobs integer,
  stale_jobs integer,
  last_capture timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_any_active_role() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
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
    COUNT(*) FILTER (WHERE COALESCE(consecutive_failures,0) = 0 AND NOT COALESCE(is_stale,false))::int,
    COUNT(*) FILTER (WHERE COALESCE(consecutive_failures,0) >= 3)::int,
    COUNT(*) FILTER (WHERE COALESCE(is_stale,false))::int,
    MAX(captured_at)
  FROM latest;
END;
$$;

REVOKE ALL ON FUNCTION public.get_system_status_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_status_summary() TO authenticated;