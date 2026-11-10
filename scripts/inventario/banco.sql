-- Inventario do banco oficial (so leitura) para inventario/estado/banco.json.
--
-- Uso (credencial viva):   node scripts/inventario/gerar-banco.mjs
-- Uso (agente com MCP):     rodar este arquivo no MCP do projeto uoujzvpecohinketylud, salvar a
--                           resposta e node scripts/inventario/gerar-banco.mjs --entrada <arquivo.json>
--
-- Imprime UMA linha com UM JSON. So SELECT em catalogo e em tabelas de estado; nada de texto
-- livre que possa carregar segredo:
--   * de cron.job sai so o nome das funcoes chamadas (nome seguido de "("), NUNCA o command
--     inteiro -- no banco deste projeto o command de varios jobs tem URL e cabecalho x-cron-secret;
--   * de cron_health_history nao sai last_error (pode ecoar a URL chamada com o cabecalho);
--   * de edge_health_history nao sai o jsonb checks (texto livre do health-monitor).
-- Ordem de toda lista e explicita para o diff ser estavel.

WITH
-- Linhas: count(*) exato quando a estimativa do planner (reltuples, persiste entre reinicios)
-- fica abaixo de 200 mil; acima disso, a estimativa. NAO usar pg_stat_user_tables.n_live_tup:
-- zera quando o servidor reinicia.
base AS (
  SELECT c.oid, c.relname AS nome, c.relrowsecurity AS rls, c.relforcerowsecurity AS rls_forcado,
         c.reltuples, pg_total_relation_size(c.oid)::bigint AS bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
),
tabelas AS (
  SELECT b.oid, b.nome, b.rls, b.rls_forcado, b.bytes,
         b.reltuples < 200000 AS linhas_exatas,
         CASE WHEN b.reltuples < 200000
              THEN (xpath('/row/n/text()',
                          query_to_xml(format('SELECT count(*) AS n FROM public.%I', b.nome), false, true, '')))[1]::text::bigint
              ELSE b.reltuples::bigint END AS linhas
    FROM base b
),
corpos AS (  -- tudo no banco que pode citar uma tabela: funcoes e views do public
  SELECT p.prosrc AS txt FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
  UNION ALL
  SELECT pg_get_viewdef(c.oid) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
),
policies AS (
  SELECT tablename AS nome, count(*)::int AS n FROM pg_policies WHERE schemaname = 'public' GROUP BY 1
),
gatilhos AS (
  SELECT t.tgrelid AS oid, count(*)::int AS n FROM pg_trigger t WHERE NOT t.tgisinternal GROUP BY 1
),
execucoes AS (
  SELECT d.jobid, d.status, d.return_message, d.start_time, d.end_time
    FROM cron.job_run_details d
   WHERE d.start_time > now() - interval '7 days'
),
por_job AS (
  SELECT e.jobid,
         count(*) FILTER (WHERE e.start_time > now() - interval '24 hours')::int AS exec_24h,
         count(*) FILTER (WHERE e.start_time > now() - interval '24 hours' AND e.status = 'failed')::int AS falhas_24h,
         count(*)::int AS exec_7d,
         count(*) FILTER (WHERE e.status = 'failed')::int AS falhas_7d,
         count(*) FILTER (WHERE e.status = 'failed' AND e.return_message LIKE 'job startup timeout%')::int AS startup_timeout_7d,
         max(e.start_time) FILTER (WHERE e.status = 'failed') AS ultima_falha,
         round(max(extract(epoch FROM e.end_time - e.start_time)) FILTER (WHERE e.status = 'succeeded'))::int AS duracao_max_s_7d
    FROM execucoes e GROUP BY e.jobid
),
por_hora AS (
  SELECT date_trunc('hour', e.start_time) AS hora, count(*)::int AS execucoes,
         count(*) FILTER (WHERE e.status = 'failed')::int AS falhas
    FROM execucoes e GROUP BY 1
),
-- Ultima leitura do health-monitor por origem (edge_health_history.source).
saude_ultima AS (
  SELECT DISTINCT ON (h.source) h.source, h.status, h.latency_ms, h.captured_at
    FROM public.edge_health_history h
   ORDER BY h.source, h.captured_at DESC
),
saude_7d AS (
  SELECT h.source, count(*)::int AS leituras_7d,
         count(*) FILTER (WHERE h.status = 'fail')::int AS falhas_7d,
         count(*) FILTER (WHERE h.status = 'warn')::int AS avisos_7d
    FROM public.edge_health_history h
   WHERE h.captured_at > now() - interval '7 days'
   GROUP BY h.source
)
SELECT jsonb_build_object(
  'format_version', 1,
  'medido_em', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),

  'resumo', jsonb_build_object(
    'postgres', current_setting('server_version'),
    'tabelas_public', (SELECT count(*) FROM tabelas),
    'tabelas_sem_rls', (SELECT count(*) FROM tabelas WHERE NOT rls),
    'policies', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'),
    'funcoes_public', (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                        WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')),
    'views_public', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                      WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')),
    'triggers_public', (SELECT coalesce(sum(g.n), 0) FROM gatilhos g JOIN tabelas t ON t.oid = g.oid),
    'cron_jobs', (SELECT count(*) FROM cron.job),
    'cron_ativos', (SELECT count(*) FROM cron.job WHERE active),
    'ledger_registros', (SELECT count(*) FROM supabase_migrations.schema_migrations),
    'ledger_versao_max', (SELECT max(version) FROM supabase_migrations.schema_migrations),
    'max_connections', current_setting('max_connections')::int,
    'tamanho_bytes', pg_database_size(current_database())
  ),

  'tabelas', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'nome', t.nome,
             'rls', t.rls,
             'rls_forcado', t.rls_forcado,
             'policies', coalesce(p.n, 0),
             'triggers', coalesce(g.n, 0),
             'linhas', t.linhas,
             'linhas_exatas', t.linhas_exatas,
             'bytes', t.bytes,
             'citada_no_banco', EXISTS (SELECT 1 FROM corpos c WHERE c.txt ~ ('\m' || t.nome || '\M'))
           ) ORDER BY t.nome), '[]'::jsonb)
      FROM tabelas t
      LEFT JOIN policies p ON p.nome = t.nome
      LEFT JOIN gatilhos g ON g.oid = t.oid
  ),

  'cron', jsonb_build_object(
    'config', (SELECT jsonb_object_agg(name, setting ORDER BY name) FROM pg_settings
                WHERE name IN ('cron.use_background_workers', 'cron.max_running_jobs', 'max_worker_processes')),
    'jobs', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'nome', j.jobname,
               'agenda', j.schedule,
               'ativo', j.active,
               -- So o NOME das funcoes chamadas. O command inteiro tem URL e x-cron-secret.
               'chama', (SELECT coalesce(jsonb_agg(DISTINCT m[1] ORDER BY m[1]), '[]'::jsonb)
                           FROM regexp_matches(j.command, '((?:public|net|cron)\.[a-z_0-9]+)\s*\(', 'g') AS m),
               'execucoes_24h', coalesce(pj.exec_24h, 0),
               'falhas_24h', coalesce(pj.falhas_24h, 0),
               'execucoes_7d', coalesce(pj.exec_7d, 0),
               'falhas_7d', coalesce(pj.falhas_7d, 0),
               'startup_timeout_7d', coalesce(pj.startup_timeout_7d, 0),
               'taxa_falha_7d_pct', CASE WHEN coalesce(pj.exec_7d, 0) = 0 THEN 0
                                         ELSE round(100.0 * pj.falhas_7d / pj.exec_7d, 1) END,
               'ultima_falha', to_char(pj.ultima_falha AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
               'duracao_max_s_7d', pj.duracao_max_s_7d
             ) ORDER BY j.jobname), '[]'::jsonb)
        FROM cron.job j LEFT JOIN por_job pj ON pj.jobid = j.jobid
    ),
    -- Hora com mais da metade das execucoes falhando: o cron ficou parado naquela hora.
    'horas_paradas_7d', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'hora', to_char(h.hora AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24":00Z"'),
               'execucoes', h.execucoes, 'falhas', h.falhas) ORDER BY h.hora), '[]'::jsonb)
        FROM por_hora h WHERE h.falhas * 2 > h.execucoes
    ),
    'historico', jsonb_build_object(
      'linhas', (SELECT count(*) FROM cron.job_run_details),
      'mais_de_7_dias', (SELECT count(*) FROM cron.job_run_details WHERE start_time <= now() - interval '7 days'),
      'mais_antigo', (SELECT to_char(min(start_time) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') FROM cron.job_run_details),
      'bytes', pg_total_relation_size('cron.job_run_details')
    ),
    -- Visao que o proprio banco grava (snapshot_cron_health): jobs parados ou com falha em sequencia.
    -- last_error fica de fora de proposito: pode ecoar a URL chamada com o cabecalho do segredo.
    'saude_gravada', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'nome', c.jobname,
               'ativo', c.active,
               'ultimo_status', c.last_status,
               'falhas_em_sequencia', c.consecutive_failures,
               'parado', c.is_stale
             ) ORDER BY c.jobname), '[]'::jsonb)
        FROM (
          SELECT DISTINCT ON (h.jobname) h.jobname, h.active, h.last_status, h.consecutive_failures, h.is_stale
            FROM public.cron_health_history h
           ORDER BY h.jobname, h.captured_at DESC
        ) c
       WHERE c.is_stale OR coalesce(c.consecutive_failures, 0) > 0
    )
  ),

  'operacao', jsonb_build_object(
    -- Saude das edge functions pelo health-monitor (public.edge_health_history). O jsonb `checks`
    -- fica de fora: e texto livre vindo da edge.
    'saude_edges', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
               'origem', u.source,
               'status', u.status,
               'latencia_ms', u.latency_ms,
               'medido_em', to_char(u.captured_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
               'leituras_7d', coalesce(s.leituras_7d, 0),
               'falhas_7d', coalesce(s.falhas_7d, 0),
               'avisos_7d', coalesce(s.avisos_7d, 0)
             ) ORDER BY u.source), '[]'::jsonb)
        FROM saude_ultima u LEFT JOIN saude_7d s ON s.source = u.source
    ),
    -- Pulso da producao: o sistema recebeu trabalho na ultima semana?
    'jobs_7d', (SELECT count(*) FROM public.jobs WHERE created_at > now() - interval '7 days'),
    'jobs_por_status', (
      SELECT coalesce(jsonb_object_agg(s.status, s.n ORDER BY s.status), '{}'::jsonb)
        FROM (SELECT j.status, count(*)::int AS n FROM public.jobs j GROUP BY j.status) s
    )
  )
) AS inventario;
