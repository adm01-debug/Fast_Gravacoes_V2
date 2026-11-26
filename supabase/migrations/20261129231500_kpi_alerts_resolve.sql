-- A tabela public.kpi_alerts recebe os alertas de limiar do motor de KPI
-- (public.check_and_notify_kpi_alert) e nao tinha nenhuma superficie de leitura
-- nem forma de marcar um alerta como resolvido: os 7.234 alertas abertos em
-- producao ficariam para sempre "abertos".
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
$function$;

GRANT EXECUTE ON FUNCTION public.resolve_kpi_alert(uuid) TO authenticated;

-- anon nao tem papel no sistema: nada de resolver alerta sem sessao.
REVOKE EXECUTE ON FUNCTION public.resolve_kpi_alert(uuid) FROM anon, PUBLIC;
