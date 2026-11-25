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
-- Sem isto o arquivo perderia coluna nova em silencio: `archived_jobs` nasceu
-- com LIKE public.jobs em 2026-10-29 e ficou para tras quando jobs ganhou
-- cancel_reason (20261108000001) e external_ref (20261125130000). O
-- jsonb_populate_record casa coluna por nome — coluna ausente no destino e'
-- simplesmente descartada, entao o motivo do cancelamento e a referencia do
-- ERP sumiriam do historico. Sincroniza nomes/tipos/defaults que faltam.
-- (Sem constraints: o arquivo nao deve bloquear nada por indice unico.)
DO $$
DECLARE
  v_col RECORD;
BEGIN
  FOR v_col IN
    SELECT a.attname AS column_name,
           format_type(a.atttypid, a.atttypmod) AS column_type,
           pg_get_expr(d.adbin, d.adrelid) AS column_default
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = 'public.jobs'::regclass
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND a.attname NOT IN (
        SELECT attname
        FROM pg_attribute
        WHERE attrelid = 'public.archived_jobs'::regclass
          AND attnum > 0
          AND NOT attisdropped
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.archived_jobs ADD COLUMN IF NOT EXISTS %I %s%s',
      v_col.column_name,
      v_col.column_type,
      CASE WHEN v_col.column_default IS NOT NULL
           THEN ' DEFAULT ' || v_col.column_default ELSE '' END
    );
  END LOOP;
END;
$$;

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

-- Arquivo coerente tambem para quem esta fora do sistema: o link de
-- rastreamento ja entregue ao cliente nao pode voltar vazio depois de a OS ser
-- arquivada (ela sai de public.jobs). Le public.archived_jobs e usa
-- archived_jobs.children -> 'shipments' quando o vinculo foi desligado.
-- Continua sem expor client, custo, notas, operador, tecnica ou lotes.
CREATE OR REPLACE FUNCTION public.get_public_tracking(
  p_job_id uuid DEFAULT NULL,
  p_order_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH fonte AS (
    SELECT j.id, j.order_number, j.status, j.product, j.scheduled_date,
           j.production_photos, j.shipment_id, NULL::jsonb AS children
    FROM public.jobs j
    UNION ALL
    SELECT a.id, a.order_number, a.status, a.product, a.scheduled_date,
           a.production_photos, a.shipment_id, a.children
    FROM public.archived_jobs a
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'order_number', f.order_number,
        'status', f.status,
        'product', f.product,
        'scheduled_date', f.scheduled_date,
        'production_photos', f.production_photos,
        'shipment', CASE
          WHEN s.id IS NOT NULL THEN
            jsonb_build_object(
              'tracking_code', s.tracking_code,
              'status', s.status,
              'estimated_delivery', s.estimated_delivery,
              'actual_delivery', s.actual_delivery,
              'provider', CASE WHEN p.id IS NOT NULL THEN
                jsonb_build_object('name', p.name)
              ELSE NULL END
            )
          WHEN f.children -> 'shipments' -> 0 IS NOT NULL THEN
            jsonb_build_object(
              'tracking_code', f.children -> 'shipments' -> 0 ->> 'tracking_code',
              'status', f.children -> 'shipments' -> 0 ->> 'status',
              'estimated_delivery', f.children -> 'shipments' -> 0 ->> 'estimated_delivery',
              'actual_delivery', f.children -> 'shipments' -> 0 ->> 'actual_delivery',
              'provider', NULL
            )
          ELSE NULL
        END
      )
    ),
    '[]'::jsonb
  )
  FROM fonte f
  LEFT JOIN public.shipments s ON s.id = f.shipment_id
  LEFT JOIN public.shipping_providers p ON p.id = s.provider_id
  WHERE (p_job_id IS NOT NULL AND f.id = p_job_id)
     OR (p_job_id IS NULL AND p_order_number IS NOT NULL AND f.order_number = p_order_number);
$$;

REVOKE ALL ON FUNCTION public.get_public_tracking(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_tracking(uuid, text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_tracking(uuid, text) IS
  'Tracking publico minimo: id/status/produto/prazo/fotos/entrega. Nunca expoe client, custo, notas, operador, tecnica ou lotes. Inclui OS arquivadas (archived_jobs) para nao invalidar link ja entregue.';

-- Indicador de produtividade (tela Evolucao da Producao) precisa somar jobs e
-- archived_jobs. A policy de archived_jobs libera leitura so' para
-- manager/admin, mas a tela e' do coordenador tambem: em vez de abrir a tabela
-- (o `children` guarda o pacote inteiro do arquivamento), esta RPC devolve
-- apenas as colunas do calculo para os mesmos papeis que ja enxergam a tela.
CREATE OR REPLACE FUNCTION public.get_finished_jobs_for_evolution(
  p_since timestamptz,
  p_limit integer DEFAULT 1000,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  machine_id uuid,
  operator_id uuid,
  quantity integer,
  produced_quantity integer,
  lost_pieces integer,
  estimated_duration integer,
  actual_start_time timestamptz,
  actual_end_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.get_finished_jobs_for_evolution(timestamptz, integer, integer)
  FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_finished_jobs_for_evolution(timestamptz, integer, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_finished_jobs_for_evolution(timestamptz, integer, integer) IS
  'Jobs finalizadas (jobs + archived_jobs) do periodo, so com as colunas do calculo de produtividade. Coordenador le sem acesso direto a archived_jobs.children.';

-- Arquivamento periodico versionado. Sem isto o unico caminho era a edge
-- function cron-cleanup (supabase/functions/cron-cleanup/index.ts:42), que nao
-- tem agendamento em nenhum lugar do repositorio: publicado o banco, a rotina
-- descrita na etapa 038 nunca comeca. Producao (uoujzvpecohinketylud) tem 7
-- jobs em cron.job e nenhum deles arquiva. O horario 04:07 UTC nao colide com
-- purge-old-logs-daily (03:15), rollup-cron-p95-daily (03:20) nem com os jobs
-- de 5/15/30 minutos. O lote de 200 OS por execucao (acima) mantem a duracao
-- previsivel mesmo na primeira rodada.
-- Verificacao: SELECT jobname, schedule, active FROM cron.job
--              WHERE jobname = 'archive-finished-jobs-daily';
DO $$
BEGIN
  IF to_regprocedure('cron.schedule(text,text,text)') IS NULL THEN
    RAISE WARNING 'pg_cron ausente: agendamento do arquivamento (etapa 038) nao foi criado.';
  ELSE
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'archive-finished-jobs-daily') THEN
      PERFORM cron.unschedule('archive-finished-jobs-daily');
    END IF;
    PERFORM cron.schedule(
      'archive-finished-jobs-daily',
      '7 4 * * *',
      $cron$SELECT public.archive_finished_jobs(now() - interval '180 days')$cron$
    );
  END IF;
END;
$$;