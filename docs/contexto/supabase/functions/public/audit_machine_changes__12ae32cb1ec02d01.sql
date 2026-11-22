CREATE OR REPLACE FUNCTION public.audit_machine_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
        INSERT INTO public.machine_event_audit (
            machine_id,
            event_type,
            old_value,
            new_value,
            performed_by
        ) VALUES (
            NEW.id,
            CASE WHEN NEW.is_active THEN 'activation' ELSE 'deactivation' END,
            OLD.is_active::text,
            NEW.is_active::text,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$function$
