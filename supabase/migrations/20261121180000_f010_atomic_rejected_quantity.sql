-- F-010: incremento atomico de rejected_quantity em packaging_tasks.
-- Substitui o read-modify-write do cliente (race quando dois operadores reportam
-- defeito no mesmo task) por um UPDATE atomicamente seguro.
create or replace function public.increment_packaging_rejected(
  p_task_id uuid,
  p_quantity integer
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.packaging_tasks
     set rejected_quantity = rejected_quantity + p_quantity
   where id = p_task_id
     and p_quantity > 0;
$$;

revoke all on function public.increment_packaging_rejected(uuid, integer) from public;
grant execute on function public.increment_packaging_rejected(uuid, integer) to authenticated;

comment on function public.increment_packaging_rejected(uuid, integer) is
  'Incremento atomico de rejected_quantity para evitar perda de atualizacao entre operadores.';