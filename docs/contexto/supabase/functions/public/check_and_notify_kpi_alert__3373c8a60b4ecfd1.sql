CREATE OR REPLACE FUNCTION public.check_and_notify_kpi_alert(p_machine_id uuid, p_metric_name text, p_metric_value double precision, p_threshold double precision, p_severity text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.kpi_alerts (machine_id, metric_name, metric_value, threshold, severity)
    VALUES (p_machine_id, p_metric_name, p_metric_value, p_threshold, p_severity);
END;
$function$
