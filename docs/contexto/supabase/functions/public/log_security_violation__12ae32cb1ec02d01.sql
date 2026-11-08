CREATE OR REPLACE FUNCTION public.log_security_violation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.security_events (event_type, description, metadata)
    VALUES ('RLS_VIOLATION', 'Tentativa de operação não autorizada na tabela ' || TG_TABLE_NAME, 
            jsonb_build_object('user_id', auth.uid(), 'operation', TG_OP));
    RETURN NULL;
END;
$function$
