CREATE OR REPLACE FUNCTION public.packaging_task_sla_status(_created_at timestamp with time zone, _started_at timestamp with time zone, _status text, _sla_triage numeric, _sla_packaging numeric, _sla_total numeric, _warn_pct numeric)
 RETURNS TABLE(elapsed_hours numeric, sla_hours numeric, progress_pct numeric, level text)
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
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
$function$
