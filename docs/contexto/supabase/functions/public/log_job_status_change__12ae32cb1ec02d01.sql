CREATE OR REPLACE FUNCTION public.log_job_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    actor_id UUID;
BEGIN
    actor_id := auth.uid();

    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.push_notifications (
            user_id,
            title,
            body,
            status,
            data
        )
        SELECT
            p.user_id,
            'Status de Job Alterado',
            format('O job %s (%s) mudou de %s para %s', NEW.order_number, NEW.client, OLD.status, NEW.status),
            'pending',
            jsonb_build_object(
                'type', 'job_status_update',
                'job_id', NEW.id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'severity', 'info',
                'actor_id', actor_id
            )
        FROM public.user_roles p
        WHERE p.role IN ('admin', 'manager');
    END IF;
    RETURN NEW;
END;
$function$
