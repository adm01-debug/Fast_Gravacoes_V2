-- F-010 (finalização): RPC transacional, idempotente e autorizada para registro de defeito.
-- Substitui a RPC increment_packaging_rejected (da #246) que era SECURITY DEFINER
-- SEM autorização (qualquer authenticated incrementava rejected_quantity de qualquer
-- task) e que mantinha o INSERT do defect fora da transação (retry duplicava defect).

drop function if exists public.increment_packaging_rejected(uuid, integer);

-- Idempotência: chave opcional por envio de operação; repetir a mesma operação não duplica.
alter table public.packaging_defects
  add column if not exists request_id uuid;

create unique index if not exists packaging_defects_request_id_key
  on public.packaging_defects(request_id)
  where request_id is not null;

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

  -- UPDATE com a mesma condição de autorização das policies ativas de packaging_tasks:
  -- staff sempre; operador apenas se dono ou tarefa não atribuída. O re-check no WHERE
  -- fecha o TOCTOU de reatribuição concorrente (linha reatribuída -> 0 rows -> erro).
  update public.packaging_tasks
     set rejected_quantity = rejected_quantity + p_quantity,
         loss_reason = coalesce(v_loss_reason, loss_reason),
         status = case
           when p_severity = 'critical'
                and status in ('pending','in_triage','packaging')
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
$$;

revoke all on function public.record_packaging_defect(uuid, integer, text, text, text, text, text, text, uuid) from public;
grant execute on function public.record_packaging_defect(uuid, integer, text, text, text, text, text, text, uuid) to authenticated;

comment on function public.record_packaging_defect(uuid, integer, text, text, text, text, text, text, uuid) is
  'Registra defeito de embalagem e incrementa rejected_quantity de forma atômica, idempotente e autorizada.';