-- Public tracking RPC: expõe SOMENTE os campos de rastreio de um job
-- (sem reabrir SELECT anon em jobs). Consulta por id OU order_number.
-- SECURITY DEFINER + SET search_path priva acesso a colunas sensíveis
-- (cost, notas internas, operador, lotes, etc.).

create or replace function public.get_public_tracking(
  p_job_id uuid default null,
  p_order_number text default null
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', j.id,
        'order_number', j.order_number,
        'status', j.status,
        'client', j.client,
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
$$;

revoke all on function public.get_public_tracking(uuid, text) from public;
grant execute on function public.get_public_tracking(uuid, text) to anon, authenticated;

comment on function public.get_public_tracking(uuid, text) is
  'Tracking público mínimo: id/status/produto/prazo/fotos/entrega. Nunca expõe custo, notas, operador, técnica ou lotes.';
