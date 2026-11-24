-- F-011: aplica o sequenciamento de jobs por RPC transacional.
--
-- Causa raiz: o painel de eficiencia aplicava a sugestao com
--   upsert([{ id, start_time, end_time }], { onConflict: 'id' })
-- que o PostgREST traduz para INSERT ... ON CONFLICT (id) DO UPDATE. O
-- PostgreSQL valida as restricoes NOT NULL da linha candidata ANTES de resolver
-- o conflito, e jobs exige order_number, client, product, quantity e
-- technique_id (sem default). Resultado: not_null_violation e nenhum horario
-- persistido - a sugestao nunca era aplicada.
--
-- A funcao abaixo so atualiza linhas existentes, na mesma transacao, e valida o
-- resultado final por maquina/data. SECURITY INVOKER preserva as policies de
-- UPDATE de public.jobs (nenhuma autorizacao nova e concedida aqui).

create or replace function public.apply_job_sequence(p_slots jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ids uuid[];
  v_expected integer;
  v_updated integer := 0;
  v_lost integer := 0;
  v_conflicts integer := 0;
begin
  if p_slots is null or jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) = 0 then
    return 0;
  end if;

  select array_agg(distinct (slot ->> 'job_id')::uuid)
    into v_ids
    from jsonb_array_elements(p_slots) as slot;

  v_expected := coalesce(array_length(v_ids, 1), 0);

  -- Solta o agendamento do lote: check_job_overlap ignora linhas sem horario,
  -- o que permite trocar horarios entre jobs da mesma maquina sem falso conflito.
  update public.jobs
     set start_time = null,
         end_time = null
   where id = any(v_ids);

  -- Reaplica os novos horarios em uma unica instrucao.
  update public.jobs j
     set start_time = slot.start_time,
         end_time = slot.end_time
    from (
      select (s ->> 'job_id')::uuid as id,
             (s ->> 'start_time')::time as start_time,
             (s ->> 'end_time')::time as end_time
        from jsonb_array_elements(p_slots) as s
    ) as slot
   where j.id = slot.id
     and slot.start_time is not null
     and slot.end_time is not null;

  get diagnostics v_updated = row_count;

  select count(*)
    into v_lost
    from public.jobs
   where id = any(v_ids)
     and (start_time is null or end_time is null);

  if v_updated <> v_expected or v_lost > 0 then
    raise exception using
      errcode = 'insufficient_privilege',
      message = format('Nao foi possivel reagendar todos os jobs do lote (%s de %s atualizados).', v_updated, v_expected),
      hint = 'Verifique permissao de edicao dos jobs e se eles ainda existem.';
  end if;

  -- Valida o estado final (inclusive conflitos dentro do proprio lote, que o
  -- trigger por linha nao consegue ver) antes de concluir a transacao.
  select count(*)
    into v_conflicts
    from (
      select j.start_time,
             lag(j.end_time) over (
               partition by j.machine_id, j.scheduled_date
               order by j.start_time, j.end_time
             ) as previous_end
        from public.jobs j
        join (
          select distinct t.machine_id, t.scheduled_date
            from public.jobs t
           where t.id = any(v_ids)
        ) as touched
          on touched.machine_id is not distinct from j.machine_id
         and touched.scheduled_date is not distinct from j.scheduled_date
       where j.status <> 'cancelled'
         and j.start_time is not null
         and j.end_time is not null
    ) as ordered
   where ordered.previous_end is not null
     and ordered.start_time < ordered.previous_end;

  if v_conflicts > 0 then
    raise exception using
      errcode = 'check_violation',
      message = 'Conflito de agendamento: a sequencia informada sobrepoe jobs na mesma maquina e data.',
      hint = 'Reordene novamente ou ajuste manualmente os horarios em conflito.';
  end if;

  return v_updated;
end;
$$;

grant execute on function public.apply_job_sequence(jsonb) to authenticated;

comment on function public.apply_job_sequence(jsonb) is
  'Aplica horarios de jobs existentes de forma atomica, preservando RLS, e valida sobreposicao por maquina/data ao final.';