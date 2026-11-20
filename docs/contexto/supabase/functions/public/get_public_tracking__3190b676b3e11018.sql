CREATE OR REPLACE FUNCTION public.get_public_tracking(p_job_id uuid DEFAULT NULL::uuid, p_order_number text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', j.id,
        'order_number', j.order_number,
        'status', j.status,
        'product', j.product,
        'scheduled_date', j.scheduled_date,
        'production_photos', j.production_photos,
        'shipment', case when s.id is not null then
          jsonb_build_object(
            'tracking_code', s.tracking_code,
            'status', s.status,
            'estimated_delivery', s.estimated_delivery,
            'actual_delivery', s.actual_delivery,
            'provider', case when p.id is not null then
              jsonb_build_object('name', p.name)
            else null end
          )
        else null end
      )
    ),
    '[]'::jsonb
  )
  from public.jobs j
  left join public.shipments s on s.id = j.shipment_id
  left join public.shipping_providers p on p.id = s.provider_id
  where (p_job_id is not null and j.id = p_job_id)
     or (p_job_id is null and p_order_number is not null and j.order_number = p_order_number);
$function$
