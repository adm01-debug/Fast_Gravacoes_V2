-- 1) Painel de segurança não recebia evento nenhum: `useRealtimeSecurityEvents` e
--    `useRealtimeBlockedIPs` (src/features/admin/hooks/useSecurityEvents.ts:12,36)
--    assinam security_events e blocked_ips, mas a publicação supabase_realtime
--    tinha só packaging_defects, packaging_tasks e push_notifications (verificado
--    em produção). Sem a tabela na publicação o Supabase não emite nada — o
--    bloqueio de login gravado por check-login-lockout nunca chegava ao painel.
DO $$
DECLARE
  v_tabela text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE WARNING 'publicação supabase_realtime inexistente — nada a publicar';
    RETURN;
  END IF;

  FOREACH v_tabela IN ARRAY ARRAY['security_events', 'blocked_ips'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = v_tabela
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_tabela);
      RAISE NOTICE 'tabela % adicionada à publicação supabase_realtime', v_tabela;
    END IF;
  END LOOP;
END $$;

-- 2) Os crons de edge function só eram agendados quando `functions_base_url`
--    estava configurada explicitamente. `app_private.functions_base_url()` já
--    deriva a URL do ref embutido na service_role_key, então num ambiente com
--    chave válida e sem URL explícita os jobs ficavam sem agendar (metrics
--    collector sem coleta, alertas e health-monitor parados).
DO $$
DECLARE
  v_base_url text;
  v_novo record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE WARNING 'pg_cron indisponível — crons de edge function não reagendados';
    RETURN;
  END IF;

  v_base_url := app_private.functions_base_url();
  IF v_base_url IS NULL OR btrim(v_base_url) = '' THEN
    RAISE WARNING 'sem URL de functions (nem configurada, nem derivável da service_role_key) — crons não reagendados';
    RETURN;
  END IF;

  IF coalesce((SELECT value FROM app_private.runtime_config WHERE key = 'service_role_key'), '') = '' THEN
    RAISE WARNING 'service_role_key ausente — jobs reagendados, mas as chamadas sairão sem Authorization';
  END IF;

  FOR v_novo IN
    SELECT * FROM (VALUES
      ('cron-alert-email-every-30min', '*/30 * * * *', '/cron-alert-email'),
      ('health-monitor-every-5min',    '*/5 * * * *',  '/health-monitor'),
      ('metrics-collector-every-5min', '*/5 * * * *',  '/metrics-collector')
    ) AS t(jobname, schedule, path)
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_novo.jobname) THEN
      PERFORM cron.unschedule(v_novo.jobname);
    END IF;

    PERFORM cron.schedule(
      v_novo.jobname,
      v_novo.schedule,
      format(
        'SELECT net.http_post(url := app_private.functions_base_url() || %L, headers := jsonb_build_object('
        '''Content-Type'', ''application/json'', '
        '''x-cron-secret'', coalesce((SELECT value FROM app_private.runtime_config WHERE key = ''cron_secret''), ''''), '
        '''Authorization'', ''Bearer '' || coalesce((SELECT value FROM app_private.runtime_config WHERE key = ''service_role_key''), '''')'
        '), body := ''{}''::jsonb)',
        v_novo.path
      )
    );
  END LOOP;
END $$;