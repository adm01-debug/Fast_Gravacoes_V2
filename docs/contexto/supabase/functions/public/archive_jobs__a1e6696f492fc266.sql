CREATE OR REPLACE FUNCTION public.archive_jobs(p_older_than timestamp with time zone DEFAULT NULL::timestamp with time zone, p_job_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- ProtectedRoute (src/components/auth/ProtectedRoute.tsx:107-132) exige
  -- sessao aal2 para papeis elevados; esta funcao roda como SECURITY DEFINER
  -- e apaga dado fora da RLS, entao repete a exigencia no banco. Sessao de
  -- cron/service_role nao tem auth.uid() e segue passando.
  IF auth.uid() IS NOT NULL
     AND coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION 'Arquivar OS exige sessao com MFA verificado (aal2).'
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
    -- Lote do cron: 200 OS por execucao, das mais antigas para as novas.
    -- Sem teto, o primeiro agendamento depois de meses sem arquivar
    -- (`archived_jobs` esta' com 0 linhas em producao) arrastaria a tabela
    -- `jobs` inteira numa unica transacao. A chamada individual (p_job_id)
    -- continua exatamente uma OS. NULLS FIRST garante que OS finished sem
    -- actual_end_time tambem progridem no lote.
    ORDER BY actual_end_time NULLS FIRST, id
    LIMIT CASE WHEN p_job_id IS NULL THEN 200 ELSE 1 END
  LOOP
    BEGIN
      -- Fecha a corrida com a logistica. O cadastro de remessa
      -- (CreateShipmentModal) insere em public.shipments e a FK exige FOR
      -- KEY SHARE na linha do job. Travar aqui serializa as duas
      -- transacoes: ou a remessa ja' commitou antes e entra no pacote
      -- abaixo, ou tenta depois e falha na FK porque o job saiu de
      -- public.jobs. Sem isto, a remessa criada entre a leitura dos filhos
      -- e o DELETE era apagada em cascata sem ficar no historico.
      PERFORM 1 FROM public.jobs WHERE id = v_job.id FOR UPDATE;

      -- Embalagem em andamento trava o arquivamento. O job nasce com
      -- packaging_tasks 'pending' ao finalizar a producao e o arquivamento
      -- levaria embora a tarefa que o operador ainda esta executando
      -- (packaging_tasks e' ON DELETE CASCADE). Job arquivado nao pode
      -- devolver a tarefa: por isso ele fica e aparece em `skipped`.
      IF to_regclass('public.packaging_tasks') IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.packaging_tasks pt
        WHERE pt.job_id = v_job.id
          AND NOT (pt.status = 'ready_to_ship' AND pt.completed_at IS NOT NULL)
      ) THEN
        RAISE EXCEPTION 'OS com embalagem em andamento nao pode ser arquivada.'
          USING ERRCODE = 'FG002';
      END IF;

              -- Remessa pendente ou em transito tambem trava. O pacote levaria a
              -- linha de public.shipments para archived_jobs.children e o DELETE a
              -- apagaria: a logistica perderia a remessa que ainda esta na rua e nao
              -- teria como registrar a entrega. O link publico continuaria abrindo
              -- (get_public_tracking le o arquivo), mas congelado em "em transito".
              IF to_regclass('public.shipments') IS NOT NULL AND EXISTS (
                SELECT 1
                FROM public.shipments s
                WHERE s.job_id = v_job.id
                  AND s.status IN ('pending', 'in_transit')
              ) THEN
                RAISE EXCEPTION 'OS com remessa em andamento nao pode ser arquivada.'
                  USING ERRCODE = 'FG003';
              END IF;

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
        SELECT kcu.table_name, kcu.column_name,
               COALESCE(rc.delete_rule, 'NO ACTION') AS delete_rule
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.referential_constraints rc
          ON rc.constraint_name = tc.constraint_name
         AND rc.constraint_schema = tc.table_schema
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
        -- ON DELETE SET NULL e' contrato do banco: a linha filha sobrevive,
        -- so' perde o vinculo. Apagar aqui levava embora o lote de producao
        -- (production_lots), que sustenta estoque e rastreabilidade — a copia
        -- em archived_jobs.children e' historico morto e nao serve ao app.
        -- O vinculo continua reconstruivel pelo pacote.
        IF v_fk.delete_rule = 'SET NULL' THEN
          EXECUTE format(
            'UPDATE public.%I SET %I = NULL WHERE %I = $1',
            v_fk.table_name, v_fk.column_name, v_fk.column_name
          ) USING v_job.id;
          CONTINUE;
        END IF;

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
      -- Chamada individual (botao "Arquivar") precisa do motivo real: sem
      -- isto o app so' ve {archived:0, skipped:1} e inventa a causa. No lote
      -- do cron a falha de um job nao compromete os outros, entao segue abaixo.
      IF p_job_id IS NOT NULL THEN
        RAISE;
      END IF;
      -- Falha num job nÃ£o compromete o lote; ele permanece em jobs
      -- e entra na contagem de pulados (visÃ­vel no log do cron).
      v_skipped := v_skipped + 1;
      RAISE WARNING 'archive_finished_jobs: job % pulado â€” %', v_job.id, SQLERRM;
    END;
  END LOOP;
  RETURN jsonb_build_object('archived', v_archived, 'skipped', v_skipped);
END;
$function$
