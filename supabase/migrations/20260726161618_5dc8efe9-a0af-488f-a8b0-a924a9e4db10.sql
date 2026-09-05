CREATE OR REPLACE FUNCTION public.rollup_cron_p95_daily(_days INTEGER DEFAULT 2)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rows INTEGER := 0;
  r RECORD;
  v_baseline NUMERIC;
  v_drift NUMERIC;
  v_days INTEGER;
  v_already BOOLEAN;
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

  -- Detecção de degradação sustentada: p95 do dia corrente vs. mediana histórica.
  FOR r IN
    SELECT * FROM public.cron_p95_daily
    WHERE day = (now() AT TIME ZONE 'UTC')::date
      AND p95_ms IS NOT NULL
      AND samples >= 3
  LOOP
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY p95_ms), COUNT(*)
      INTO v_baseline, v_days
      FROM public.cron_p95_daily
     WHERE jobid = r.jobid
       AND day < r.day
       AND p95_ms IS NOT NULL;

    CONTINUE WHEN v_days IS NULL OR v_days < 3 OR v_baseline IS NULL OR v_baseline <= 0;

    v_drift := ROUND(((r.p95_ms - v_baseline) / v_baseline) * 100, 0);
    CONTINUE WHEN v_drift < 50;

    SELECT EXISTS (
      SELECT 1 FROM public.push_notifications pn
      WHERE pn.created_at > now() - INTERVAL '24 hours'
        AND pn.data->>'type' = 'cron_p95_degradation'
        AND pn.data->>'jobid' = r.jobid::text
    ) INTO v_already;

    CONTINUE WHEN v_already;

    INSERT INTO public.push_notifications (user_id, title, body, status, data)
    SELECT DISTINCT ur.user_id,
           'Rotina automática mais lenta que o normal',
           format('%s está %s%% mais lenta hoje (p95 %sms vs. mediana histórica %sms).',
                  COALESCE(r.jobname, 'job ' || r.jobid::text),
                  v_drift::int, r.p95_ms, ROUND(v_baseline)::int),
           'pending',
           jsonb_build_object(
             'type', 'cron_p95_degradation',
             'jobid', r.jobid,
             'jobname', r.jobname,
             'drift_pct', v_drift,
             'p95_ms', r.p95_ms,
             'baseline_ms', ROUND(v_baseline)::int,
             'route', '/admin/monitoring',
             'severity', 'warning'
           )
    FROM public.user_roles ur
    WHERE ur.role IN ('coordinator', 'manager')
      AND ur.is_active = true;
  END LOOP;

  RETURN v_rows;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rollup_cron_p95_daily(INTEGER) FROM PUBLIC, anon, authenticated;