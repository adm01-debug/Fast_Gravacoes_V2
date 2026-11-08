CREATE OR REPLACE FUNCTION public.audit_tpm_execution_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.notes IS DISTINCT FROM NEW.notes) THEN
        INSERT INTO public.tpm_execution_audit_logs (execution_id, changed_by, field_name, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'notes', OLD.notes, NEW.notes);
    END IF;
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.tpm_execution_audit_logs (execution_id, changed_by, field_name, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status);
    END IF;
    -- Adicionar outros campos conforme necessário
    RETURN NEW;
END;
$function$
