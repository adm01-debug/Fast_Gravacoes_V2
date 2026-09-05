
ALTER TABLE public.packaging_settings
  ADD COLUMN IF NOT EXISTS sla_triage_hours NUMERIC NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS sla_packaging_hours NUMERIC NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS sla_total_hours NUMERIC NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS warning_threshold_pct NUMERIC NOT NULL DEFAULT 75;

-- Helper: horas decorridas desde a criação da tarefa (ou início do estágio atual)
CREATE OR REPLACE FUNCTION public.packaging_task_sla_status(
  _created_at TIMESTAMPTZ,
  _started_at TIMESTAMPTZ,
  _status TEXT,
  _sla_triage NUMERIC,
  _sla_packaging NUMERIC,
  _sla_total NUMERIC,
  _warn_pct NUMERIC
) RETURNS TABLE (
  elapsed_hours NUMERIC,
  sla_hours NUMERIC,
  progress_pct NUMERIC,
  level TEXT
)
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_elapsed NUMERIC;
  v_sla NUMERIC;
  v_pct NUMERIC;
BEGIN
  -- SLA por estágio
  IF _status = 'pending' THEN
    v_sla := _sla_triage;
    v_elapsed := EXTRACT(EPOCH FROM (now() - _created_at)) / 3600.0;
  ELSIF _status = 'in_triage' THEN
    v_sla := _sla_triage;
    v_elapsed := EXTRACT(EPOCH FROM (now() - COALESCE(_started_at, _created_at))) / 3600.0;
  ELSIF _status = 'packaging' THEN
    v_sla := _sla_packaging;
    v_elapsed := EXTRACT(EPOCH FROM (now() - COALESCE(_started_at, _created_at))) / 3600.0;
  ELSE
    v_sla := _sla_total;
    v_elapsed := EXTRACT(EPOCH FROM (now() - _created_at)) / 3600.0;
  END IF;

  v_pct := CASE WHEN v_sla > 0 THEN (v_elapsed / v_sla) * 100 ELSE 0 END;

  elapsed_hours := ROUND(v_elapsed::numeric, 2);
  sla_hours := v_sla;
  progress_pct := ROUND(v_pct::numeric, 1);
  level := CASE
    WHEN _status IN ('ready_to_ship','on_hold') THEN 'ok'
    WHEN v_pct >= 100 THEN 'overdue'
    WHEN v_pct >= _warn_pct THEN 'warning'
    ELSE 'ok'
  END;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.packaging_task_sla_status(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated, service_role;
