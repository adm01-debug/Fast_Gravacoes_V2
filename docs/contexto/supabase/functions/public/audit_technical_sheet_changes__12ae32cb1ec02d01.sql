CREATE OR REPLACE FUNCTION public.audit_technical_sheet_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_action TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF (TG_OP = 'INSERT') THEN
        v_action := 'CREATE';
        INSERT INTO public.technical_sheet_audit (technical_sheet_id, user_id, action, new_data)
        VALUES (NEW.id, v_user_id, v_action, to_jsonb(NEW));
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'UPDATE';
        INSERT INTO public.technical_sheet_audit (technical_sheet_id, user_id, action, previous_data, new_data)
        VALUES (NEW.id, v_user_id, v_action, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF (TG_OP = 'DELETE') THEN
        v_action := 'DELETE';
        INSERT INTO public.technical_sheet_audit (technical_sheet_id, user_id, action, previous_data)
        VALUES (OLD.id, v_user_id, v_action, to_jsonb(OLD));
    END IF;
    
    RETURN NEW;
END;
$function$
