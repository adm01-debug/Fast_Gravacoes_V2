CREATE OR REPLACE FUNCTION public.audit_job_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) OR 
       (OLD.produced_quantity IS DISTINCT FROM NEW.produced_quantity) OR
       (OLD.lost_pieces IS DISTINCT FROM NEW.lost_pieces) THEN
        INSERT INTO public.job_status_audit (
            job_id,
            old_status,
            new_status,
            old_produced_quantity,
            new_produced_quantity,
            old_lost_pieces,
            new_lost_pieces,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            OLD.produced_quantity,
            NEW.produced_quantity,
            OLD.lost_pieces,
            NEW.lost_pieces,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$function$
