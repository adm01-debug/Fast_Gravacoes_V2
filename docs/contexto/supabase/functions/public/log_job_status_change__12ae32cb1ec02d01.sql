CREATE OR REPLACE FUNCTION public.log_job_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    actor_id UUID;
BEGIN
    -- Try to get current user ID from metadata or auth.uid()
    actor_id := auth.uid();

    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_log (
            entity_type,
            entity_id,
            action,
            old_values,
            new_values,
            actor_id,
            metadata
        ) VALUES (
            'job',
            NEW.id,
            'status_change',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            actor_id,
            jsonb_build_object(
                'job_code', NEW.code,
                'client', NEW.client,
                'product', NEW.product
            )
        );

        -- Also create a notification for relevant users (this is a simple version, 
        -- usually we would target specific roles or the job creator)
        -- For now, we notify the actor if they are not the one who changed it (realtime sync)
        -- Or just create a system notification record
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
            format('O job %s (%s) mudou de %s para %s', NEW.code, NEW.client, OLD.status, NEW.status),
            'pending',
            jsonb_build_object(
                'type', 'job_status_update',
                'job_id', NEW.id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'severity', 'info'
            )
        FROM public.user_roles p -- Simple way to broadcast to admins/managers
        WHERE p.role IN ('admin', 'manager');
    END IF;
    RETURN NEW;
END;
$function$
