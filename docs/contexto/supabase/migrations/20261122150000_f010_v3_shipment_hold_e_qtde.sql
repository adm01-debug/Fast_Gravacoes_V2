-- ============================================================================
-- F-010 (v3): threads 12 e 14 do Devin Review na PR #249
--  - Thread 12: impedir que logística despache (in_transit) shipment cujo job
--    tenha packaging_task em on_hold (defeito crítico/cancelamento). A regra
--    vive no banco: qualquer caminho (UI do modal, menu rápido) converge para
--    a RPC. Não altera retroativamente envios já despachados.
--  - Thread 14: ao registrar defeito crítico DEPOIS da liberação, o saldo de
--    approved_quantity ocupava todo o received (default do form) e a
--    constraint packaging_tasks_qty_sum tornava a rejeição impossível. A RPC
--    de defeito agora subtrai o excedente de approved_quantity para manter a
--    regra de negócio (approved + rejected <= received).
-- ============================================================================

-- Atualiza status de shipment com holds e ajuste de quantidades.
create or replace function public.update_shipment_status(
  p_shipment_id uuid,
  p_status text
)
returns text  -- 'ok' | 'blocked' | erro (exception)
language plpgsql
security definer
set search_path = public
as $$
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
$$

grant execute on function public.update_shipment_status(uuid, text) to authenticated

-- Barreira de política (thread SEC): a RPC autoriza a escrita do status via
-- set_config; qualquer outra escrita direta em shipments com mudança de
-- status para um envio retido é barrada aqui, inclusive se vier por fora da
-- RPC (REST/menu). Atualizações que NÃO mudam status (metadados) passam.
create or replace function public.preventDefault_hold_shipment_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$

drop trigger if exists trg_prevent_hold_shipment_update on public.shipments

create trigger trg_prevent_hold_shipment_update
before update on public.shipments
for each row
execute function public.preventDefault_hold_shipment_update()

-- ---------------------------------------------------------------------------
-- Ajuste da RPC de defeito: subtrai approved_quantity excedente no caso
-- crítico após liberação (thread 14) e valida rejeição contra o recebido
-- antes de registrar (evita request_id queimado e erro de constraint obscuro).
-- ---------------------------------------------------------------------------
create or replace function public.record_packaging_defect(
  p_task_id uuid,
  p_quantity integer,
  p_defect_type text,
  p_severity text default 'minor',
  p_decision text default 'discard',
  p_photo_url text default null,
  p_notes text default null,
  p_loss_reason text default null,
  p_request_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_loss_reason text := nullif(btrim(coalesce(p_loss_reason,''), E' \t\r\n'), '');
  v_is_staff boolean;
  v_is_operator boolean;
  v_processed boolean := false;
  v_new_approved integer;
  v_rejected_quantity integer;
  v_received_quantity integer;
  v_over_rejection boolean := false;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade deve ser positiva';
  end if;

  -- Papéis ativos: has_any_active_role() rejeita usuário desativado/removido.
  if not public.has_any_active_role() then
    raise exception 'Usuário sem papel ativo';
  end if;
  v_is_staff := public.has_role(v_uid, 'coordinator')
             or public.has_role(v_uid, 'manager')
             or public.has_role(v_uid, 'admin');
  v_is_operator := public.has_role(v_uid, 'operator');

  -- Já processado (retry de rede / React Query com o mesmo p_request_id)? Retorna sem efeito.
  if p_request_id is not null then
    select true into v_processed
      from public.packaging_defects
     where request_id = p_request_id;
    if v_processed then
      return;
    end if;
  end if;

  -- Validação de autorização + saldos antes de tocar nas tabelas: evita
  -- request_id queimado por operação inválida e erro de constraint obscuro.
  select approved_quantity, rejected_quantity, received_quantity
    into v_new_approved, v_rejected_quantity, v_received_quantity
  from public.packaging_tasks
  where id = p_task_id
    and (
      v_is_staff
      or (v_is_operator and (assigned_to is null or assigned_to = v_uid))
    )
  for update;
  if not found then
    raise exception 'Sem autorização para registrar defeito nesta tarefa';
  end if;

  -- Rejeição não pode ultrapassar o recebido (constraint packaging_tasks_qty_sum).
  if v_rejected_quantity + p_quantity > v_received_quantity then
    raise exception 'Rejeição excede a quantidade recebida (restante: %)',
      v_received_quantity - v_rejected_quantity;
  end if;

  -- INSERT primeiro: o índice único (request_id) faz o ON CONFLICT ser a barreira
  -- contra corrida entre requisições concorrentes com o mesmo idempotency key.
  insert into public.packaging_defects (
    packaging_task_id, quantity, defect_type, severity, decision,
    photo_url, reported_by, notes, request_id
  ) values (
    p_task_id, p_quantity, p_defect_type, p_severity, p_decision,
    p_photo_url, v_uid, p_notes, p_request_id
  )
  on conflict (request_id) where request_id is not null do nothing;

  if not found and p_request_id is not null then
    -- concorrente venceu: operação já registrada, sem incremento
    return;
  end if;

  -- Ajuste de approved_quantity para defeito após liberação (thread 14):
  -- garante que a soma approved + rejected nunca exceda received, mas sem
  -- "pagar" a rejeição com peças aprovadas quando ainda há peças não
  -- classificadas (approved + rejected < received): o teto é o espaço restante.
  v_new_approved := least(
    v_new_approved,
    v_received_quantity - v_rejected_quantity - p_quantity
  );
  if v_new_approved < 0 then
    -- rejeição além do aprovado + restante: aprovado não pode ficar negativo
    -- (CHECK constraints)
    v_new_approved := 0;
    v_over_rejection := true;
  end if;

  -- UPDATE com a mesma condição de autorização das policies ativas de packaging_tasks:
  -- staff sempre; operador apenas se dono ou tarefa não atribuída. O re-check no WHERE
  -- fecha o TOCTOU de reatribuição concorrente (linha reatribuída -> 0 rows -> erro).
  update public.packaging_tasks
     set rejected_quantity = rejected_quantity + p_quantity,
         approved_quantity = v_new_approved,
         loss_reason = coalesce(v_loss_reason, loss_reason),
         status = case
           when p_severity = 'critical'
                and status in ('pending','in_triage','packaging','ready_to_ship')
             then 'on_hold'
           else status
         end,
         updated_at = now()
   where id = p_task_id
     and (
       v_is_staff
       or (v_is_operator and (assigned_to is null or assigned_to = v_uid))
     );

  if not found then
    raise exception 'Sem autorização para registrar defeito nesta tarefa';
  end if;
end;
$$

grant execute on function public.record_packaging_defect(uuid, integer, text, text, text, text, text, text, uuid) to authenticated
