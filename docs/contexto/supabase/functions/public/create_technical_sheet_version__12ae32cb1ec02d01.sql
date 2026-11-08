CREATE OR REPLACE FUNCTION public.create_technical_sheet_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT count(*) INTO v_count FROM public.technical_sheet_versions WHERE sheet_id = NEW.id;
    
    INSERT INTO public.technical_sheet_versions (sheet_id, version_number, data, created_by)
    VALUES (NEW.id, v_count + 1, row_to_json(NEW)::jsonb, auth.uid());
    
    RETURN NEW;
END;
$function$
