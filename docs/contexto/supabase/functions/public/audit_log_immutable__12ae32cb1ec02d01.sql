CREATE OR REPLACE FUNCTION public.audit_log_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only and cannot be modified or deleted (record %)', COALESCE(OLD.id::text, 'unknown')
    USING ERRCODE = '42501';
END;
$function$
