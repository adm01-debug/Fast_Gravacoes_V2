-- Etapa 038 (RN-04): arquivar OS concluida em vez de apagar.
--
-- Duas coisas nesta migration:
--
-- 1) BUG EM PRODUCAO: public.archived_jobs esta com 0 linhas porque
--    public.archive_finished_jobs inseria por posicao (SELECT v_job.*, now(),
--    v_children). public.jobs tem 33 colunas e archived_jobs tem 33 — porem
--    duas diferentes: jobs ganhou cancel_reason e external_ref depois da funcao
--    ter sido escrita (migrations 20261108000001 e 20261125130000). A insercao
--    passava 35 valores para 33 colunas, estourava, caia no EXCEPTION interno e
--    o job entrava em `skipped`. O cron rodava e nao arquivava nada.
--    Correcao: casar colunas por nome com jsonb_populate_record.
--
-- 2) O caminho que faltava no aplicativo: arquivar UMA OS concluida. A funcao
--    passa a ser public.archive_jobs(p_older_than, p_job_id), atendendo o lote
--    do cron (p_older_than) e o botao "Arquivar" da tela de OS (p_job_id).
--    p_older_than e p_job_id sao opcionais; so OS com status 'finished' entram,
--    e a copia dos filhos/neteos para archived_jobs.children continua igual.
--
-- Seguranca: SECURITY DEFINER + apaga dado. EXECUTE so' para authenticated
-- (com checagem de papel admin/manager dentro da funcao) e service_role.
-- A marcacao app.archiving_job e o que libera o trigger BEFORE DELETE da
-- etapa 036 (migration 20261128100000_block_delete_job_with_production.sql).
CREATE OR REPLACE FUNCTION public.archive_jobs(
  p_older_than timestamptz DEFAULT NULL,
  p_job_id uuid DEFAULT NULL
)
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
  -- SECURITY DEFINER que apaga dado: so gerente ou admin. Chamada por
  -- service_role (cron) passa, porque nao ha auth.uid() na sessao.
  IF auth.uid() IS NOT NULL
     AND NOT (app_private.has_role(auth.uid(), 'admin'::public.app_role)
              OR app_private.has_role(auth.uid(), 'manager'::public.app_role)) THEN
    RAISE EXCEPTION 'Apenas gerentes e administradores podem arquivar uma OS.'
      USING ERRCODE = '42501';
  END IF;

  -- O trigger BEFORE DELETE da etapa 036 recusa apagar OS concluida com
  -- producao ou fora de queue/scheduled/cancelled. O arquivamento e
  -- intencional e auditado (o pacote vai inteiro para archived_jobs), entao
  -- marca a sessao; nenhum outro caminho de escrita define esta marcacao.
  PERFORM set_config('app.archiving_job', 'on', true);

  FOR v_job IN
    SELECT * FROM public.jobs
    WHERE status = 'finished'
      AND (p_job_id IS NULL OR id = p_job_id)
      AND (p_older_than IS NULL OR actual_end_time < p_older_than)
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
        -- Pulado para a self-FK jobsâ†’jobs: os filhos (retrabalho ativo)
        -- ficam vivos, entÃ£o seus dependentes nÃ£o sÃ£o "netos" a limpar.
        IF v_fk.table_name <> 'jobs' THEN
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
        END IF;
      END LOOP;

      -- Colunas por nome, nao por posicao: archived_jobs tem 2 colunas a mais
      -- que jobs (archived_at, children) e jobs ganhou cancel_reason e
      -- external_ref depois desta funcao ser escrita. O SELECT v_job.*
      -- posicional errava por contagem de colunas, o job caia no EXCEPTION
      -- interno e ia para `skipped` — por isso archived_jobs estava com 0
      -- linhas mesmo com o cron rodando desde outubro.
      INSERT INTO public.archived_jobs
        SELECT (jsonb_populate_record(
          NULL::public.archived_jobs,
          to_jsonb(v_job) || jsonb_build_object('archived_at', now(), 'children', v_children)
        )).*;

      -- 2) Quebra de ciclos: anula sÃ³ FKs NULLABLE do job que apontam
      -- para tabelas filhas prestes a serem deletadas (ex.: shipment_id
      -- no ciclo jobsâ†”shipments). FKs obrigatÃ³rias para tabelas de
      -- domÃ­nio (technique_id etc.) nÃ£o sÃ£o tocadas.
      FOR v_fk2 IN
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = ccu.table_schema
        JOIN information_schema.columns col
          ON col.table_schema = kcu.table_schema
         AND col.table_name = kcu.table_name
         AND col.column_name = kcu.column_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'jobs'
          AND ccu.table_name <> 'jobs'
          AND col.is_nullable = 'YES'
          AND ccu.table_name IN (
            SELECT kcu2.table_name
            FROM information_schema.table_constraints tc2
            JOIN information_schema.key_column_usage kcu2
              ON tc2.constraint_name = kcu2.constraint_name
             AND tc2.table_schema = kcu2.table_schema
            JOIN information_schema.constraint_column_usage ccu2
              ON tc2.constraint_name = ccu2.constraint_name
             AND tc2.table_schema = ccu2.table_schema
            WHERE tc2.constraint_type = 'FOREIGN KEY'
              AND tc2.table_schema = 'public'
              AND ccu2.table_name = 'jobs'
              AND ccu2.column_name = 'id'
          )
      LOOP
        EXECUTE format('UPDATE public.jobs SET %I = NULL WHERE id = $1', v_fk2.column_name)
        USING v_job.id;
      END LOOP;

      -- 3) Netos antes dos filhos (ordem de dependÃªncia).
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
        -- Netos bloqueantes: sÃ³ os que impediriam o delete do filho
        -- (NO ACTION/RESTRICT). SET NULL/CASCADE o banco resolve ao
        -- deletar o pai â€” ex.: packaging_waste fica com task_id NULL
        -- no livro de desperdÃ­cios em vez de ser apagado.
        FOR v_fk2 IN
          SELECT kcu.table_name, kcu.column_name, ccu.column_name AS ref_column
          FROM information_schema.table_constraints tc
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
           AND tc.table_schema = rc.constraint_schema
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
           AND tc.table_schema = ccu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND ccu.table_name = v_fk.table_name
            AND rc.delete_rule IN ('NO ACTION', 'RESTRICT')
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
      -- Falha num job nÃ£o compromete o lote; ele permanece em jobs
      -- e entra na contagem de pulados (visÃ­vel no log do cron).
      v_skipped := v_skipped + 1;
      RAISE WARNING 'archive_finished_jobs: job % pulado â€” %', v_job.id, SQLERRM;
    END;
  END LOOP;
  RETURN jsonb_build_object('archived', v_archived, 'skipped', v_skipped);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_jobs(timestamptz, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.archive_jobs(timestamptz, uuid) TO authenticated, service_role;

-- archive_finished_jobs continua existindo como porta fina para a mesma
-- implementacao: supabase/functions/cron-cleanup/index.ts:42 chama por esse
-- nome e nao precisa ser reimplantado junto com a migration.
CREATE OR REPLACE FUNCTION public.archive_finished_jobs(p_older_than timestamptz)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.archive_jobs(p_older_than => p_older_than);
$$;

REVOKE EXECUTE ON FUNCTION public.archive_finished_jobs(timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_finished_jobs(timestamptz) TO service_role;