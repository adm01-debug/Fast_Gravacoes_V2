REVOKE ALL ON FUNCTION public.snapshot_cron_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_cron_health() TO service_role;

CREATE OR REPLACE FUNCTION public.snapshot_cron_health()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'cron'
AS $$
DECLARE
  j RECORD;
  r RECORD;
  fails INTEGER;
  inserted INTEGER := 0;
  already_alerted BOOLEAN;
BEGIN
  FOR j IN SELECT c.jobid, c.jobname, c.schedule, c.active FROM cron.job c LOOP
    SELECT d.status, d.start_time, d.end_time, d.return_message
      INTO r
      FROM cron.job_run_details d
     WHERE d.jobid = j.jobid
     ORDER BY d.start_time DESC
     LIMIT 1;

    SELECT COUNT(*) INTO fails
      FROM (
        SELECT d.status,
               SUM(CASE WHEN d.status = 'succeeded' THEN 1 ELSE 0 END)
                 OVER (ORDER BY d.start_time DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS ok_seen
          FROM cron.job_run_details d
         WHERE d.jobid = j.jobid
         ORDER BY d.start_time DESC
         LIMIT 50
      ) s
     WHERE s.ok_seen = 0 AND s.status <> 'succeeded';

    INSERT INTO public.cron_health_history (
      jobid, jobname, schedule, active, last_status, last_run,
      last_duration_ms, consecutive_failures, last_error
    ) VALUES (
      j.jobid, j.jobname, j.schedule, j.active,
      r.status,
      r.start_time,
      CASE WHEN r.start_time IS NULL THEN NULL
           ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(r.end_time, now()) - r.start_time)) * 1000)::int END,
      COALESCE(fails, 0),
      CASE WHEN r.status IS DISTINCT FROM 'succeeded' THEN left(COALESCE(r.return_message, ''), 500) ELSE NULL END
    );
    inserted := inserted + 1;

    IF COALESCE(fails, 0) >= 3 THEN
      SELECT EXISTS (
        SELECT 1 FROM public.push_notifications pn
        WHERE pn.created_at > now() - INTERVAL '6 hours'
          AND pn.data->>'type' = 'cron_failure'
          AND pn.data->>'jobid' = j.jobid::text
      ) INTO already_alerted;

      IF NOT already_alerted THEN
        INSERT INTO public.push_notifications (user_id, title, body, status, data)
        SELECT DISTINCT ur.user_id,
               'Rotina automática falhando',
               format('%s falhou %s ciclos consecutivos. Último erro: %s',
                      COALESCE(j.jobname, 'job ' || j.jobid::text),
                      COALESCE(fails, 0),
                      COALESCE(left(r.return_message, 160), 'sem detalhes')),
               'pending',
               jsonb_build_object(
                 'type', 'cron_failure',
                 'jobid', j.jobid,
                 'jobname', j.jobname,
                 'consecutive_failures', COALESCE(fails, 0),
                 'route', '/admin/monitoring',
                 'severity', 'critical'
               )
        FROM public.user_roles ur
        WHERE ur.role IN ('coordinator', 'manager')
          AND ur.is_active = true;
      END IF;
    END IF;
  END LOOP;

  DELETE FROM public.cron_health_history WHERE captured_at < now() - INTERVAL '90 days';

  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_cron_health() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_cron_health() TO service_role;