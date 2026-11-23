CREATE OR REPLACE FUNCTION public.record_packaging_defect(p_task_id uuid, p_quantity integer, p_defect_type text, p_severity text DEFAULT 'minor'::text, p_decision text DEFAULT 'discard'::text, p_photo_url text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_loss_reason text DEFAULT NULL::text, p_request_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
