CREATE OR REPLACE FUNCTION public.increment_sheet_view_count(sheet_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.technical_sheets 
    SET view_count = view_count + 1 
    WHERE id = sheet_id;
END;
$function$
