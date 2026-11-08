CREATE OR REPLACE FUNCTION public.get_packaging_manifest(p_task_ids uuid[])
 RETURNS TABLE(order_number text, client_name text, package_type text, packages_count integer, total_weight numeric, shipping_address text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        j.order_number,
        j.client,
        t.package_type,
        t.packages_count,
        t.total_weight_kg,
        'Consultar Bitrix24'::text
    FROM public.packaging_tasks t
    JOIN public.jobs j ON t.job_id = j.id
    WHERE t.id = ANY(p_task_ids);
END;
$function$
