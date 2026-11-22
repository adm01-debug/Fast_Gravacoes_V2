CREATE OR REPLACE FUNCTION public.audit_profile_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF OLD.full_name IS DISTINCT FROM NEW.full_name OR OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
        INSERT INTO public.operator_status_audit (operator_id, previous_data, new_data, changed_by, reason)
        VALUES (
            NEW.id, 
            jsonb_build_object('full_name', OLD.full_name, 'avatar_url', OLD.avatar_url),
            jsonb_build_object('full_name', NEW.full_name, 'avatar_url', NEW.avatar_url),
            auth.uid(), 
            'Profile update'
        );
    END IF;
    RETURN NEW;
END;
$function$
