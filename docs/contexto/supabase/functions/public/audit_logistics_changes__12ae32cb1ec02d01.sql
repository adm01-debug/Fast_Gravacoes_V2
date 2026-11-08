CREATE OR REPLACE FUNCTION public.audit_logistics_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_actor_id UUID;
    v_actor_email TEXT;
    v_changed_fields TEXT[];
BEGIN
    -- Try to get the current user ID and email from Supabase context
    v_actor_id := auth.uid();
    -- Email might not be directly available in some contexts, but we'll try to get it
    SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor_id;

    -- Calculate changed fields for updates
    IF (TG_OP = 'UPDATE') THEN
        v_changed_fields := ARRAY(
            SELECT key 
            FROM jsonb_each(to_jsonb(OLD)) 
            WHERE to_jsonb(OLD)->key IS DISTINCT FROM to_jsonb(NEW)->key
        );
    END IF;

    -- Insert into audit_log
    INSERT INTO public.audit_log (
        entity_type,
        entity_id,
        action,
        actor_id,
        actor_email,
        old_data,
        new_data,
        changed_fields,
        metadata
    ) VALUES (
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
        TG_OP,
        v_actor_id,
        v_actor_email,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
        v_changed_fields,
        jsonb_build_object('client_addr', inet_client_addr(), 'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent')
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$
