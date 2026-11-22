-- F-010 (finalização): RPC transacional e autorizada para registro de defeito.
-- Substitui a RPC increment_packaging_rejected (da #246) que era SECURITY DEFINER
-- SEM autorização (qualquer authenticated incrementava rejected_quantity de qualquer
-- task) e que mantinha o INSERT do defect fora da transação (retry duplicava defect
-- + ordem de rework quando a RPC falhava).

drop function if exists public.increment_packaging_rejected(uuid, integer);

create or replace function public.record_packaging_defect(
  p_task_id uuid,
  p_quantity integer,
  p_defect_type text,
  p_severity text default 'minor',
  p_decision text default 'discard',
  p_photo_url text default null,
  p_notes text default null,
  p_loss_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assigned_to uuid;
  v_loss_reason text := nullif(trim(coalesce(p_loss_reason, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  select assigned_to into v_assigned_to
    from public.packaging_tasks
   where id = p_task_id;

  if not found then
    raise exception 'Tarefa de embalagem não encontrada';
  end if;

  -- Autorização: espelha exatamente a policy RLS vigente
  -- "Authorized defect management" (2026-08-02): só o dono da tarefa
  -- (assigned_to) ou coordenador. Tarefa não atribuída também é negada.
  if v_assigned_to is null
     or (v_assigned_to <> auth.uid()
         and not public.has_role(auth.uid(), 'coordinator'))
  then
    raise exception 'Sem autorização para registrar defeito nesta tarefa';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade deve ser positiva';
  end if;

  update public.packaging_tasks
     set rejected_quantity = rejected_quantity + p_quantity,
         loss_reason = coalesce(v_loss_reason, loss_reason),
         updated_at = now()
   where id = p_task_id;

  insert into public.packaging_defects (
    packaging_task_id, quantity, defect_type, severity, decision,
    photo_url, reported_by, notes
  ) values (
    p_task_id, p_quantity, p_defect_type, p_severity, p_decision,
    p_photo_url, auth.uid(), p_notes
  );
end;
$$;

revoke all on function public.record_packaging_defect(uuid, integer, text, text, text, text, text, text) from public;
grant execute on function public.record_packaging_defect(uuid, integer, text, text, text, text, text, text) to authenticated;

comment on function public.record_packaging_defect(uuid, integer, text, text, text, text, text, text) is
  'Registra defeito de embalagem e incrementa rejected_quantity de forma atômica e autorizada.';
