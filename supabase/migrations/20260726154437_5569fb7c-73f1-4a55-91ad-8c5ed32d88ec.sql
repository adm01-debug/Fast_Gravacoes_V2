ALTER TABLE public.cron_health_history
  ADD COLUMN IF NOT EXISTS is_stale BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expected_interval_minutes INTEGER;

-- Estima o intervalo esperado (minutos) a partir da expressão cron.
CREATE OR REPLACE FUNCTION public.cron_expected_interval_minutes(_schedule TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  m TEXT;
  h TEXT;
  n INTEGER;
BEGIN
  IF _schedule IS NULL THEN RETURN NULL; END IF;

  IF _schedule ~ '^@hourly' THEN RETURN 60; END IF;
  IF _schedule ~ '^@daily|^@midnight' THEN RETURN 1440; END IF;
  IF _schedule ~ '^@weekly' THEN RETURN 10080; END IF;

  m := split_part(_schedule, ' ', 1);
  h := split_part(_schedule, ' ', 2);

  -- */N * * * *  -> a cada N minutos
  IF m ~ '^\*/[0-9]+$' THEN
    n := substring(m from 3)::int;
    RETURN GREATEST(n, 1);
  END IF;

  -- * * * * * -> a cada minuto
  IF m = '*' THEN RETURN 1; END IF;

  -- N */H * * * -> a cada H horas
  IF h ~ '^\*/[0-9]+$' THEN
    n := substring(h from 3)::int;
    RETURN GREATEST(n, 1) * 60;
  END IF;

  -- N * * * * -> de hora em hora
  IF h = '*' THEN RETURN 60; END IF;

  -- caso geral: diário
  RETURN 1440;
END;
$$;

-- snapshot com detecção de rotinas silenciosas (sem execução no prazo esperado)
CREATE OR REPLACE FUNCTION public.snapshot_cron_health()
RETURNS integer
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
  v_expected INTEGER;
  v_stale BOOLEAN;
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

    v_expected := public.cron_expected_interval_minutes(j.schedule);

    -- Silenciosa: rotina ativa que não executa há mais de 3x o intervalo esperado
    -- (mínimo de 30 min de tolerância para evitar falsos positivos).
    v_stale := COALESCE(j.active, false)
      AND v_expected IS NOT NULL
      AND (
        r.start_time IS NULL
        OR r.start_time < now() - make_interval(mins => GREATEST(v_expected * 3, 30))
      );

    INSERT INTO public.cron_health_history (
      jobid, jobname, schedule, active, last_status, last_run,
      last_duration_ms, consecutive_failures, last_error,
      is_stale, expected_interval_minutes
    ) VALUES (
      j.jobid, j.jobname, j.schedule, j.active,
      r.status,
      r.start_time,
      CASE WHEN r.start_time IS NULL THEN NULL
           ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(r.end_time, now()) - r.start_time)) * 1000)::int END,
      COALESCE(fails, 0),
      CASE WHEN r.status IS DISTINCT FROM 'succeeded' THEN left(COALESCE(r.return_message, ''), 500) ELSE NULL END,
      COALESCE(v_stale, false),
      v_expected
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

    IF v_stale THEN
      SELECT EXISTS (
        SELECT 1 FROM public.push_notifications pn
        WHERE pn.created_at > now() - INTERVAL '12 hours'
          AND pn.data->>'type' = 'cron_stale'
          AND pn.data->>'jobid' = j.jobid::text
      ) INTO already_alerted;

      IF NOT already_alerted THEN
        INSERT INTO public.push_notifications (user_id, title, body, status, data)
        SELECT DISTINCT ur.user_id,
               'Rotina automática silenciosa',
               format('%s não executa desde %s (esperado a cada %s min).',
                      COALESCE(j.jobname, 'job ' || j.jobid::text),
                      COALESCE(to_char(r.start_time, 'DD/MM HH24:MI'), 'nunca'),
                      v_expected),
               'pending',
               jsonb_build_object(
                 'type', 'cron_stale',
                 'jobid', j.jobid,
                 'jobname', j.jobname,
                 'expected_interval_minutes', v_expected,
                 'route', '/admin/monitoring',
                 'severity', 'warning'
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