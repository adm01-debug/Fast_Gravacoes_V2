-- As policies de maintenance_schedules criadas em 2026-10-28 usam
-- public.has_role, cujo EXECUTE foi revogado de authenticated em
-- 2026-06-19 — manager/admin avaliavam a policy com erro de permissão.
DROP POLICY IF EXISTS "Managers can manage maintenance schedules" ON public.maintenance_schedules;
CREATE POLICY "Managers can manage maintenance schedules"
  ON public.maintenance_schedules FOR ALL
  USING (app_private.has_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'manager'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage maintenance schedules" ON public.maintenance_schedules;
CREATE POLICY "Admins can manage maintenance schedules"
  ON public.maintenance_schedules FOR ALL
  USING (app_private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (app_private.has_role(auth.uid(), 'admin'::public.app_role));

-- Arquivamento transacional por job:
-- 1) copia o job + filhos + netos (jsonb por tabela) p/ archived_jobs;
-- 2) jobs filhos (parent_job_id — retrabalho ativo) NÃO são deletados,
--    só registrados; o ON DELETE SET NULL desfaz o vínculo e a linhagem
--    fica preservada no jsonb;
-- 3) FKs de saída do job (ex.: shipment_id — ciclo jobs↔shipments) são
--    anuladas antes de deletar os filhos;
-- 4) netos são deletados antes dos filhos (ordem de dependência);
-- 5) qualquer falha reverte só aquele job e ele aparece em `skipped`.
CREATE OR REPLACE FUNCTION public.archive_finished_jobs(p_older_than timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_fk RECORD;
  v_fk2 RECORD;
  v_children jsonb;
  v_rows jsonb;
  v_archived integer := 0;
  v_skipped integer := 0;
BEGIN
  FOR v_job IN
    SELECT * FROM public.jobs
    WHERE status = 'finished' AND actual_end_time < p_older_than
  LOOP
    BEGIN
      -- 1) Pacote: filhos diretos e netos (tabelas com FK para a filha).
      v_children := '{}'::jsonb;
      FOR v_fk IN
        SELECT kcu.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_name = 'jobs'
          AND ccu.column_name = 'id'
      LOOP
        EXECUTE format(
          'SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM public.%I t WHERE t.%I = $1',
          v_fk.table_name, v_fk.column_name
        ) INTO v_rows USING v_job.id;
        -- Concatena: a mesma tabela pode ser filha direta e neta.
        v_children := jsonb_set(
          v_children, ARRAY[v_fk.table_name],
          COALESCE(v_children -> v_fk.table_name, '[]'::jsonb) || v_rows
        );

        -- Netos: linhas de tabelas que referenciam a tabela filha.
        FOR v_fk2 IN
          SELECT kcu.table_name, kcu.column_name, ccu.column_name AS ref_column
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
           AND tc.table_schema = ccu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND ccu.table_name = v_fk.table_name
        LOOP
          EXECUTE format(
            'SELECT COALESCE(jsonb_agg(to_jsonb(u)), ''[]''::jsonb) FROM public.%I u WHERE u.%I IN (SELECT t.%I FROM public.%I t WHERE t.%I = $1)',
            v_fk2.table_name, v_fk2.column_name, v_fk2.ref_column, v_fk.table_name, v_fk.column_name
          ) INTO v_rows USING v_job.id;
          v_children := jsonb_set(
            v_children, ARRAY[v_fk2.table_name],
            COALESCE(v_children -> v_fk2.table_name, '[]'::jsonb) || v_rows
          );
        END LOOP;
      END LOOP;

      INSERT INTO public.archived_jobs
        SELECT v_job.*, now(), v_children;

      -- 2) Quebra de ciclos: anula FKs de saída do job que apontam para
      -- tabelas filhas prestes a serem deletadas (ex.: shipment_id).
      FOR v_fk2 IN
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'jobs'
          AND ccu.table_name <> 'jobs'
      LOOP
        EXECUTE format('UPDATE public.jobs SET %I = NULL WHERE id = $1', v_fk2.column_name)
        USING v_job.id;
      END LOOP;

      -- 3) Netos antes dos filhos (ordem de dependência).
      FOR v_fk IN
        SELECT kcu.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_name = 'jobs'
          AND ccu.column_name = 'id'
          AND kcu.table_name <> 'jobs'  -- filhos jobs ficam (retrabalho ativo)
      LOOP
        FOR v_fk2 IN
          SELECT kcu.table_name, kcu.column_name, ccu.column_name AS ref_column
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
           AND tc.table_schema = ccu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND ccu.table_name = v_fk.table_name
        LOOP
          EXECUTE format(
            'DELETE FROM public.%I WHERE %I IN (SELECT t.%I FROM public.%I t WHERE t.%I = $1)',
            v_fk2.table_name, v_fk2.column_name, v_fk2.ref_column, v_fk.table_name, v_fk.column_name
          ) USING v_job.id;
        END LOOP;

        EXECUTE format('DELETE FROM public.%I WHERE %I = $1', v_fk.table_name, v_fk.column_name)
        USING v_job.id;
      END LOOP;

      DELETE FROM public.jobs WHERE id = v_job.id;
      v_archived := v_archived + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Falha num job não compromete o lote; ele permanece em jobs
      -- e entra na contagem de pulados (visível no log do cron).
      v_skipped := v_skipped + 1;
      RAISE WARNING 'archive_finished_jobs: job % pulado — %', v_job.id, SQLERRM;
    END;
  END LOOP;
  RETURN jsonb_build_object('archived', v_archived, 'skipped', v_skipped);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_finished_jobs(timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_finished_jobs(timestamptz) TO service_role;
