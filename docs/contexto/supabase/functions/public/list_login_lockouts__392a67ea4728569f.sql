CREATE OR REPLACE FUNCTION public.list_login_lockouts(p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, identifier text, identifier_type text, failed_attempts integer, last_failed_at timestamp with time zone, locked_until timestamp with time zone, lockout_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT (
        app_private.has_role(auth.uid(), 'admin'::app_role)
        OR app_private.has_role(auth.uid(), 'manager'::app_role)
    ) THEN
        RAISE EXCEPTION 'sem permissao para consultar bloqueios de login'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT l.id,
           l.identifier,
           l.identifier_type,
           l.failed_attempts,
           l.last_failed_at,
           l.locked_until,
           l.lockout_count
      FROM public.login_lockouts l
     ORDER BY (l.locked_until > now()) DESC, l.last_failed_at DESC NULLS LAST
     LIMIT greatest(1, least(coalesce(p_limit, 50), 200));
END;
$function$
