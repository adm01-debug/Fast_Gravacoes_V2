CREATE OR REPLACE FUNCTION public.assign_packaging_task(p_task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_is_staff boolean;
  v_is_operator boolean;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if not public.has_any_active_role() then
    raise exception 'Usuário sem papel ativo';
  end if;
  v_is_staff := public.has_role(v_uid, 'coordinator')
             or public.has_role(v_uid, 'manager')
             or public.has_role(v_uid, 'admin');
  v_is_operator := public.has_role(v_uid, 'operator');

  update public.packaging_tasks
     set assigned_to = v_uid,
         started_at = coalesce(started_at, now()),
         status = case
           when status = 'on_hold' then 'on_hold'
           else 'in_triage'
         end,
         updated_at = now()
   where id = p_task_id
     and (
       v_is_staff
       or (v_is_operator and (assigned_to is null or assigned_to = v_uid))
     );

  if not found then
    raise exception 'Sem autorização para assumir esta tarefa';
  end if;
end;
$function$
