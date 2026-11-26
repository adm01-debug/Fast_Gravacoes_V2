CREATE OR REPLACE FUNCTION public.release_login_lockout(p_identifier text, p_identifier_type text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT (
        app_private.has_role(auth.uid(), 'admin'::app_role)
        OR app_private.has_role(auth.uid(), 'manager'::app_role)
    ) THEN
        RAISE EXCEPTION 'sem permissao para liberar contas bloqueadas'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.login_lockouts
       SET failed_attempts = 0,
           locked_until = NULL,
           updated_at = now()
     WHERE identifier = p_identifier
       AND identifier_type = p_identifier_type;

    RETURN FOUND;
END;
$function$
