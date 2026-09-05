CREATE TABLE public.cron_p95_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day DATE NOT NULL,
  jobid BIGINT NOT NULL,
  jobname TEXT,
  samples INTEGER NOT NULL DEFAULT 0,
  p95_ms INTEGER,
  avg_ms INTEGER,
  max_ms INTEGER,
  failure_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (jobid, day)
);

GRANT SELECT ON public.cron_p95_daily TO authenticated;
GRANT ALL ON public.cron_p95_daily TO service_role;

ALTER TABLE public.cron_p95_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coordenadores e gestores leem tendencia p95"
ON public.cron_p95_daily
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager'));

CREATE INDEX idx_cron_p95_daily_day ON public.cron_p95_daily (day DESC);

CREATE TRIGGER update_cron_p95_daily_updated_at
BEFORE UPDATE ON public.cron_p95_daily
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.rollup_cron_p95_daily(_days INTEGER DEFAULT 2)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rows INTEGER := 0;
BEGIN
  INSERT INTO public.cron_p95_daily (day, jobid, jobname, samples, p95_ms, avg_ms, max_ms, failure_rate_pct)
  SELECT
    (h.captured_at AT TIME ZONE 'UTC')::date AS day,
    h.jobid,
    MAX(h.jobname) AS jobname,
    COUNT(*)::int AS samples,
    ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY h.last_duration_ms))::int AS p95_ms,
    ROUND(AVG(h.last_duration_ms))::int AS avg_ms,
    MAX(h.last_duration_ms)::int AS max_ms,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE COALESCE(h.consecutive_failures, 0) > 0) / NULLIF(COUNT(*), 0),
      2
    ) AS failure_rate_pct
  FROM public.cron_health_history h
  WHERE h.captured_at >= (now() - make_interval(days => GREATEST(_days, 1)))
  GROUP BY 1, 2
  ON CONFLICT (jobid, day) DO UPDATE SET
    jobname = EXCLUDED.jobname,
    samples = EXCLUDED.samples,
    p95_ms = EXCLUDED.p95_ms,
    avg_ms = EXCLUDED.avg_ms,
    max_ms = EXCLUDED.max_ms,
    failure_rate_pct = EXCLUDED.failure_rate_pct,
    updated_at = now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  DELETE FROM public.cron_p95_daily WHERE day < (now() - INTERVAL '365 days')::date;

  RETURN v_rows;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rollup_cron_p95_daily(INTEGER) FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'rollup-cron-p95-daily',
  '20 * * * *',
  $$SELECT public.rollup_cron_p95_daily(2);$$
);