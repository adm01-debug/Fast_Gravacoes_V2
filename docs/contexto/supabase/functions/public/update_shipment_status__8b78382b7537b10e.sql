CREATE OR REPLACE FUNCTION public.update_shipment_status(p_shipment_id uuid, p_status text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_job_id uuid;
  v_current_status text;
  v_blocked boolean := false;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  -- Só staff (coordenador/gerente/admin) altera envio; operador não.
  if not (
    public.has_role(v_uid, 'coordinator')
    or public.has_role(v_uid, 'manager')
    or public.has_role(v_uid, 'admin')
  ) then
    raise exception 'Sem permissão para alterar envio';
  end if;

  select job_id, status into v_job_id, v_current_status
    from public.shipments
   where id = p_shipment_id;
  if not found then
    raise exception 'Envio não encontrado';
  end if;

  -- Bloqueio de negócio (thread 12): despacho de job com embalagem em espera
  -- não pode seguir para in_transit. Regra vale mesmo se o job estiver
  -- cancelado (on_hold criado por cancelamento). A mesma retenção vale para
  -- avanço direto para delivered de um envio que ainda não despachou:
  -- entregar sem passar pelo despacho burlaria a espera da embalagem.
  -- Envios já despachados (in_transit) podem ser entregues normalmente.
  -- Pedidos que repetem o status atual são operações sem mudança (correção
  -- de rastreio/frete) e nunca são bloqueados, mesmo se a embalagem retiver.
  if v_job_id is not null
     and p_status is distinct from v_current_status
  then
    -- delivered: bloqueia apenas transição vinda de um status pré-despacho.
    if p_status = 'in_transit'
       or (p_status = 'delivered' and v_current_status <> 'in_transit')
    then
      if exists (
        select 1 from public.packaging_tasks
         where job_id = v_job_id
           and status = 'on_hold'
      ) then
        v_blocked := true;
      end if;
    end if;
  end if;

  if v_blocked then
    -- mantém o status atual (não muda envios já despachados); retorna blocked
    return 'blocked';
  end if;

  -- Flag para o trigger trg_prevent_hold_shipment_update não barrar a RPC.
  perform set_config('app.f010_shipment_rpc', 'on', true);
  update public.shipments set status = p_status where id = p_shipment_id;
  perform set_config('app.f010_shipment_rpc', 'off', true);
  return 'ok';
end;
$function$
