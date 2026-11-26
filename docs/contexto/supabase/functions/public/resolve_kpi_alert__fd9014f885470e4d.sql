CREATE OR REPLACE FUNCTION public.resolve_kpi_alert(p_alert_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_autorizado boolean;
BEGIN
    SELECT app_private.has_role(auth.uid(), 'admin'::app_role)
        OR app_private.has_role(auth.uid(), 'manager'::app_role)
      INTO v_autorizado;

    IF coalesce(v_autorizado, false) = false THEN
        RAISE EXCEPTION 'sem permissao para resolver alertas de KPI'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.kpi_alerts
       SET is_resolved = true
     WHERE id = p_alert_id
       AND is_resolved IS DISTINCT FROM true;

    RETURN FOUND;
END;
$function$
