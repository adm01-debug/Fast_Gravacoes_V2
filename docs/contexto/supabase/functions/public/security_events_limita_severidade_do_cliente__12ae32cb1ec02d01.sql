CREATE OR REPLACE FUNCTION public.security_events_limita_severidade_do_cliente()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.severity NOT IN ('info', 'warning') THEN
    NEW.severity := 'warning';
  END IF;
  RETURN NEW;
END;
$function$
