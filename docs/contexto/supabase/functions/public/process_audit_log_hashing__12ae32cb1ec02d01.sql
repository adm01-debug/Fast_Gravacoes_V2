CREATE OR REPLACE FUNCTION public.process_audit_log_hashing()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    last_hash text;
BEGIN
    -- Obter o hash do registro anterior para encadeamento
    SELECT hash INTO last_hash 
    FROM public.audit_log 
    ORDER BY created_at DESC, id DESC 
    LIMIT 1;
    
    NEW.previous_hash := COALESCE(last_hash, 'GENESIS');
    NEW.hash := public.calculate_audit_hash(NEW);
    
    RETURN NEW;
END;
$function$
