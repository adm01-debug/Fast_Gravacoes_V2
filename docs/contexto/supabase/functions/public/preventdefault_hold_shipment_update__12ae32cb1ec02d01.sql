CREATE OR REPLACE FUNCTION public.preventdefault_hold_shipment_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_job_id uuid;
begin
  -- A RPC update_shipment_status seta a flag antes do update e a limpa depois.
  -- Compara como texto: após o commit, a flag volta ao default (lido como
  -- texto vazio); cast para boolean quebraria o próximo UPDATE na sessão.
  if current_setting('app.f010_shipment_rpc', true) = 'on' then
    return new;
  end if;

  if new.status is distinct from old.status then
    select job_id into v_job_id from public.shipments where id = new.id;
    if v_job_id is not null then
      if exists (
        select 1 from public.packaging_tasks
         where job_id = v_job_id
           and status = 'on_hold'
      ) then
        -- Mantém o status anterior; a escrita fora da RPC não vale.
        new.status := old.status;
        raise exception 'Envio retido pela embalagem em espera; use update_shipment_status';
      end if;
    end if;
  end if;
  return new;
end;
$function$
