CREATE TABLE public.cron_health_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jobid BIGINT NOT NULL,
  jobname TEXT,
  schedule TEXT,
  active BOOLEAN,
  last_status TEXT,
  last_run TIMESTAMPTZ,
  last_duration_ms INTEGER,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cron_health_history TO authenticated;
GRANT ALL ON public.cron_health_history TO service_role;

ALTER TABLE public.cron_health_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordenadores e gestores leem historico de cron"
  ON public.cron_health_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager'));

CREATE INDEX idx_cron_health_history_job_time
  ON public.cron_health_history (jobid, captured_at DESC);
CREATE INDEX idx_cron_health_history_captured_at
  ON public.cron_health_history (captured_at DESC);

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
  END LOOP;

  DELETE FROM public.cron_health_history WHERE captured_at < now() - INTERVAL '90 days';

  RETURN inserted;
END;
$$;