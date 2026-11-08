CREATE OR REPLACE FUNCTION public.log_role_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    actor_id uuid;
    actor_email text;
BEGIN
    actor_id := auth.uid();
    SELECT email INTO actor_email FROM auth.users WHERE id = actor_id;
    
    INSERT INTO public.audit_log (
        entity_type,
        entity_id,
        action,
        actor_id,
        actor_email,
        old_data,
        new_data,
        changed_fields
    ) VALUES (
        'user_role',
        NEW.user_id::text,
        CASE WHEN TG_OP = 'INSERT' THEN 'CREATE' ELSE 'UPDATE' END,
        actor_id,
        actor_email,
        CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
        row_to_json(NEW)::jsonb,
        CASE WHEN TG_OP = 'UPDATE' THEN ARRAY['role', 'is_active'] ELSE ARRAY['all'] END
    );
    RETURN NEW;
END;
$function$
