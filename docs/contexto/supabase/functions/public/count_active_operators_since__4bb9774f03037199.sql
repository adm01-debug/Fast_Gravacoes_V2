CREATE OR REPLACE FUNCTION public.count_active_operators_since(p_since timestamp with time zone)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT COUNT(DISTINCT q.operator_id)
  FROM public.qr_scan_history q
  WHERE q.scanned_at >= p_since
    AND q.operator_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = q.operator_id
        AND ur.role = 'operator'
        AND ur.is_active = true
    );
$function$
