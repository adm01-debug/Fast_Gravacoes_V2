CREATE OR REPLACE FUNCTION public.get_public_tracking(p_job_id uuid DEFAULT NULL::uuid, p_order_number text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH fonte AS (
    SELECT j.id, j.order_number, j.status, j.product, j.scheduled_date,
           j.production_photos, j.shipment_id, NULL::jsonb AS children
    FROM public.jobs j
    UNION ALL
    SELECT a.id, a.order_number, a.status, a.product, a.scheduled_date,
           a.production_photos, a.shipment_id, a.children
    FROM public.archived_jobs a
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'order_number', f.order_number,
        'status', f.status,
        'product', f.product,
        'scheduled_date', f.scheduled_date,
        'production_photos', f.production_photos,
        'shipment', CASE
          WHEN s.id IS NOT NULL THEN
            jsonb_build_object(
              'tracking_code', s.tracking_code,
              'status', s.status,
              'estimated_delivery', s.estimated_delivery,
              'actual_delivery', s.actual_delivery,
              'provider', CASE WHEN p.id IS NOT NULL THEN
                jsonb_build_object('name', p.name)
              ELSE NULL END
            )
          WHEN f.children -> 'shipments' -> 0 IS NOT NULL THEN
            jsonb_build_object(
              'tracking_code', f.children -> 'shipments' -> 0 ->> 'tracking_code',
              'status', f.children -> 'shipments' -> 0 ->> 'status',
              'estimated_delivery', f.children -> 'shipments' -> 0 ->> 'estimated_delivery',
              'actual_delivery', f.children -> 'shipments' -> 0 ->> 'actual_delivery',
              'provider', NULL
            )
          ELSE NULL
        END
      )
    ),
    '[]'::jsonb
  )
  FROM fonte f
  LEFT JOIN public.shipments s ON s.id = f.shipment_id
  LEFT JOIN public.shipping_providers p ON p.id = s.provider_id
  WHERE (p_job_id IS NOT NULL AND f.id = p_job_id)
     OR (p_job_id IS NULL AND p_order_number IS NOT NULL AND f.order_number = p_order_number);
$function$
