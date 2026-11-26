-- As tentativas de login falhas sao registradas pelo edge function
-- check-login-lockout em public.login_lockouts, mas a tabela so aceita
-- service_role (policy 'Service role only'). Resultado: ninguem no app
-- consegue ver quem esta bloqueado nem liberar uma conta. O bloqueio so
-- sai sozinho quando expira (ate 24h, com backoff exponencial crescente),
-- porque o reset por login bem sucedido exige justamente entrar.
--
-- Estas duas funcoes abrem a superficie administrativa minima, sempre
-- com checagem de papel no banco.
CREATE OR REPLACE FUNCTION public.list_login_lockouts(p_limit integer DEFAULT 50)
RETURNS TABLE (
    id uuid,
    identifier text,
    identifier_type text,
    failed_attempts integer,
    last_failed_at timestamp with time zone,
    locked_until timestamp with time zone,
    lockout_count integer
)
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
$function$;

CREATE OR REPLACE FUNCTION public.release_login_lockout(
    p_identifier text,
    p_identifier_type text
)
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
$function$;

GRANT EXECUTE ON FUNCTION public.list_login_lockouts(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_login_lockout(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_login_lockouts(integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_login_lockout(text, text) FROM anon, PUBLIC;
