CREATE OR REPLACE FUNCTION public.get_finished_jobs_for_evolution(p_since timestamp with time zone, p_limit integer DEFAULT 1000, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, machine_id uuid, operator_id uuid, quantity integer, produced_quantity integer, lost_pieces integer, estimated_duration integer, actual_start_time timestamp with time zone, actual_end_time timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (app_private.has_role(auth.uid(), 'manager'::public.app_role)
              OR app_private.has_role(auth.uid(), 'admin'::public.app_role)
              OR app_private.has_role(auth.uid(), 'coordinator'::public.app_role)) THEN
    RAISE EXCEPTION 'Apenas gerentes, administradores e coordenadores podem ver a evolucao da producao.'
      USING ERRCODE = '42501';
  END IF;

  -- Mesma exigencia do ProtectedRoute (linhas 107-132): papel elevado com
  -- sessao so' de senha (aal1) nao le o historico. A RPC e' SECURITY DEFINER
  -- e le archived_jobs com privilegios do owner, fora da RLS.
  IF auth.uid() IS NOT NULL
     AND coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Historico arquivado exige sessao com MFA verificado (aal2).'
      USING ERRCODE = '42501';
  END IF;

  -- Ordem estavel (actual_end_time, id) e' o que garante paginacao sem
  -- repetir ou perder linha entre uma pagina e a seguinte.
  RETURN QUERY
  SELECT t.id, t.machine_id, t.operator_id, t.quantity, t.produced_quantity,
         t.lost_pieces, t.estimated_duration, t.actual_start_time, t.actual_end_time
  FROM (
    SELECT j.id, j.machine_id, j.operator_id, j.quantity, j.produced_quantity,
           j.lost_pieces, j.estimated_duration, j.actual_start_time, j.actual_end_time
    FROM public.jobs j
    WHERE j.status = 'finished'
      AND j.actual_end_time >= p_since
    UNION ALL
    SELECT a.id, a.machine_id, a.operator_id, a.quantity, a.produced_quantity,
           a.lost_pieces, a.estimated_duration, a.actual_start_time, a.actual_end_time
    FROM public.archived_jobs a
    WHERE a.status = 'finished'
      AND a.actual_end_time >= p_since
  ) t
  ORDER BY t.actual_end_time, t.id
  LIMIT GREATEST(COALESCE(p_limit, 1000), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$function$
