CREATE OR REPLACE FUNCTION public.refresh_machine_health_metrics(p_days integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_days integer := GREATEST(1, LEAST(365, COALESCE(p_days, 30)));
  v_fim date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_ini date := v_fim - (v_days - 1);
  v_ini_ts timestamptz := (v_ini::timestamp AT TIME ZONE 'America/Sao_Paulo');
  v_fim_ts timestamptz := ((v_fim + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo');
  v_planejado_dia numeric;
  v_total integer := 0;
BEGIN
  -- Janela sem nenhum job concluído (base histórica ou recém-instalada) não pode
  -- produzir zero linhas: sem linha, o painel executivo volta a exibir 0% como se
  -- fosse medição. Nesse caso agrega todo o histórico disponível da máquina.
  IF NOT EXISTS (
    SELECT 1 FROM public.jobs j
     WHERE j.status = 'finished'
       AND j.actual_end_time >= v_ini_ts
       AND j.actual_end_time < v_fim_ts
  ) THEN
    v_ini := COALESCE(
      (SELECT min((j.actual_end_time AT TIME ZONE 'America/Sao_Paulo')::date)
         FROM public.jobs j
        WHERE j.status = 'finished' AND j.actual_end_time IS NOT NULL),
      v_ini);
    v_ini_ts := (v_ini::timestamp AT TIME ZONE 'America/Sao_Paulo');
  END IF;

  -- Minutos planejados por dia: business_config.operating_hours (07:00-18:00 = 660),
  -- mesma fonte de useOEE.ts:185-192. O valor em produção está gravado como string
  -- JSON (duplamente codificado), então aceita os dois formatos.
  SELECT GREATEST(
           60,
           (split_part(horario ->> 'end', ':', 1)::int * 60 + split_part(horario ->> 'end', ':', 2)::int)
         - (split_part(horario ->> 'start', ':', 1)::int * 60 + split_part(horario ->> 'start', ':', 2)::int)
         )
    INTO v_planejado_dia
    FROM (
      SELECT CASE WHEN jsonb_typeof(value) = 'string' THEN (value #>> '{}')::jsonb ELSE value END AS horario
        FROM public.business_config
       WHERE key = 'operating_hours'
    ) h;

  v_planejado_dia := COALESCE(v_planejado_dia, 660);

  WITH jobs_periodo AS (
    SELECT j.machine_id,
           count(*) AS total_jobs,
           COALESCE(sum(j.produced_quantity), 0)::numeric AS produzido,
           COALESCE(sum(j.lost_pieces), 0)::numeric AS perdido,
           COALESCE(sum(
             CASE WHEN j.actual_start_time IS NOT NULL AND j.actual_end_time IS NOT NULL
                  THEN GREATEST(0, EXTRACT(EPOCH FROM (j.actual_end_time - j.actual_start_time)) / 60)
                  ELSE 0 END), 0) AS minutos_reais,
           COALESCE(sum(COALESCE(NULLIF(j.estimated_duration, 0), 60)), 0) AS minutos_estimados,
           count(DISTINCT (j.actual_end_time AT TIME ZONE 'America/Sao_Paulo')::date) AS dias
      FROM public.jobs j
     WHERE j.machine_id IS NOT NULL
       AND j.status = 'finished'
       AND j.actual_end_time >= v_ini_ts
       AND j.actual_end_time < v_fim_ts
     GROUP BY j.machine_id
  ),
  base AS (
    SELECT p.machine_id,
           p.total_jobs,
           p.produzido,
           p.perdido,
           p.minutos_reais,
           p.minutos_estimados,
           GREATEST(GREATEST(p.dias, 1) * v_planejado_dia, p.minutos_estimados) AS minutos_planejados
      FROM jobs_periodo p
  ),
  scores AS (
    SELECT b.*,
           CASE WHEN b.minutos_planejados > 0
                THEN LEAST(100, (b.minutos_reais / b.minutos_planejados) * 100)
                ELSE 100 END AS disponibilidade,
           CASE WHEN b.minutos_reais > 0
                THEN LEAST(100, (b.minutos_estimados / b.minutos_reais) * 100)
                ELSE 100 END AS performance,
           CASE WHEN b.produzido > 0
                THEN GREATEST(0, LEAST(100, ((b.produzido - b.perdido) / b.produzido) * 100))
                ELSE 100 END AS qualidade
      FROM base b
  ),
  manutencao AS (
    SELECT r.machine_id,
           count(*) AS total,
           count(*) FILTER (WHERE mt.name ILIKE '%corretiv%') AS corretivas,
           avg(EXTRACT(EPOCH FROM (r.completed_at - r.started_at)) / 3600)
             FILTER (WHERE mt.name ILIKE '%corretiv%'
                       AND r.started_at IS NOT NULL AND r.completed_at IS NOT NULL) AS mttr
      FROM public.maintenance_records r
      LEFT JOIN public.maintenance_types mt ON mt.id = r.maintenance_type_id
     WHERE r.machine_id IS NOT NULL
       AND r.created_at >= v_ini_ts
       AND r.created_at < v_fim_ts
     GROUP BY r.machine_id
  )
  INSERT INTO public.machine_health_metrics AS m (
    machine_id, period_start, period_end, total_jobs, total_produced, total_losses,
    total_production_hours, maintenance_count, corrective_maintenance_count,
    avg_time_between_failures, avg_repair_time, oee_score, calculated_at
  )
  SELECT s.machine_id,
         v_ini,
         v_fim,
         s.total_jobs,
         s.produzido::int,
         s.perdido::int,
         round(s.minutos_reais / 60.0, 2),
         COALESCE(mo.total, 0),
         COALESCE(mo.corretivas, 0),
         CASE WHEN COALESCE(mo.corretivas, 0) > 0
              THEN round((s.minutos_reais / 60.0) / mo.corretivas, 2) END,
         CASE WHEN mo.mttr IS NULL THEN NULL ELSE round(mo.mttr, 2) END,
         round((s.disponibilidade / 100) * (s.performance / 100) * (s.qualidade / 100) * 100, 2),
         now()
    FROM scores s
    LEFT JOIN manutencao mo ON mo.machine_id = s.machine_id
  ON CONFLICT (machine_id, period_start, period_end) DO UPDATE
     SET total_jobs = EXCLUDED.total_jobs,
         total_produced = EXCLUDED.total_produced,
         total_losses = EXCLUDED.total_losses,
         total_production_hours = EXCLUDED.total_production_hours,
         maintenance_count = EXCLUDED.maintenance_count,
         corrective_maintenance_count = EXCLUDED.corrective_maintenance_count,
         avg_time_between_failures = EXCLUDED.avg_time_between_failures,
         avg_repair_time = EXCLUDED.avg_repair_time,
         oee_score = EXCLUDED.oee_score,
         calculated_at = EXCLUDED.calculated_at;

  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END
$function$
