CREATE OR REPLACE FUNCTION public.audit_job_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_log (
            entity_type,
            entity_id,
            action,
            actor_id,
            old_values,
            new_values,
            changed_fields,
            metadata
        ) VALUES (
            'job',
            NEW.id,
            'status_change',
            auth.uid(),
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            ARRAY['status'],
            jsonb_build_object('order_number', NEW.order_number)
        );
    END IF;
    RETURN NEW;
END;
$function$
