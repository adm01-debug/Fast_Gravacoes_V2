CREATE OR REPLACE FUNCTION public.get_cron_health()
RETURNS TABLE(
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  last_status text,
  last_run timestamptz,
  last_duration_ms integer,
  consecutive_failures integer,
  last_error text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  j RECORD;
  r RECORD;
  fails INTEGER;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  FOR j IN SELECT c.jobid, c.jobname, c.schedule, c.active FROM cron.job c LOOP
    jobid := j.jobid;
    jobname := j.jobname;
    schedule := j.schedule;
    active := j.active;
    last_status := NULL;
    last_run := NULL;
    last_duration_ms := NULL;
    last_error := NULL;
    fails := 0;

    SELECT d.status, d.start_time, d.end_time, d.return_message
      INTO r
      FROM cron.job_run_details d
     WHERE d.jobid = j.jobid
     ORDER BY d.start_time DESC
     LIMIT 1;

    IF FOUND THEN
      last_status := r.status;
      last_run := r.start_time;
      last_duration_ms := GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(r.end_time, now()) - r.start_time)) * 1000)::int;
      IF r.status <> 'succeeded' THEN
        last_error := left(COALESCE(r.return_message, ''), 500);
      END IF;
    END IF;

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

    consecutive_failures := COALESCE(fails, 0);
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_health() FROM public;
GRANT EXECUTE ON FUNCTION public.get_cron_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_health() TO service_role;