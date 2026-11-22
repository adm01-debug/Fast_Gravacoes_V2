CREATE OR REPLACE FUNCTION public.log_technical_sheet_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.technical_sheet_audit_logs (technical_sheet_id, user_id, action, changes)
    VALUES (
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        TG_OP,
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        )
    );
    RETURN NEW;
END;
$function$
