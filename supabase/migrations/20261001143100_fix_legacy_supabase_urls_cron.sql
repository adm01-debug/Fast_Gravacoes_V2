-- Corrige URLs de projeto Supabase legadas (whnnzdreuwxczxelvqjh e
-- xxroejpvloldkmqdydar) apontando para o self-hosted canônico
-- (supabase.atomicabr.com.br). Dois pontos afetados:
--   1. public.trigger_send_tpm_email(): hardcoded na função (o trigger que a
--      chama está comentado, mas a função fica incorreta no banco).
--   2. Cron 'auto-promote-jobs-fallback' (*/5 * * * *): batia em host morto.
--
-- Requer no banco (três GUCs — ver supabase/ENVIRONMENTS.md):
--   ALTER DATABASE postgres SET app.settings.functions_base_url = 'https://supabase.atomicabr.com.br/functions/v1';
--   ALTER DATABASE postgres SET app.settings.cron_secret = '<mesmo CRON_SECRET das edge functions>';
--   ALTER DATABASE postgres SET app.settings.service_role_key = '<service_role JWT do projeto>';
-- O service_role_key é o JWT que passa no gateway (verify_jwt = true): sem ele
-- o request morre com 401 antes de chegar no handler — o x-cron-secret sozinho
-- não basta.
CREATE OR REPLACE FUNCTION public.trigger_send_tpm_email()
RETURNS TRIGGER AS $$
DECLARE
  v_base_url text := current_setting('app.settings.functions_base_url', true);
BEGIN
  IF coalesce(v_base_url, '') = '' THEN
    RAISE WARNING 'app.settings.functions_base_url não configurado — webhook TPM ignorado neste ambiente';
    RETURN NEW;
  END IF;
  PERFORM
    net.http_post(
      url := v_base_url || '/send-tpm-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', coalesce(current_setting('app.settings.cron_secret', true), ''),
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'event_type', 'INSERT',
        'record', row_to_json(NEW)
      )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Reagenda o cron de fallback do auto-promote-jobs com a URL do GUC de
-- ambiente. Remove o job legado SEMPRE (mesmo sem functions_base_url
-- configurado) — senão ambientes que herdaram o cron antigo continuam
-- batendo no host morto a cada 5 minutos. Reinstala só quando o GUC de
-- ambiente está presente (staging não deve apontar para produção).
DO $$
DECLARE
  v_base_url text := current_setting('app.settings.functions_base_url', true);
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('auto-promote-jobs-fallback');
    EXCEPTION WHEN OTHERS THEN
      -- job pode não existir neste ambiente
      NULL;
    END;

    IF coalesce(v_base_url, '') <> '' THEN
      PERFORM cron.schedule(
        'auto-promote-jobs-fallback',
        '*/5 * * * *',
        format(
          'SELECT net.http_post(url := %L || ''/auto-promote-jobs'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || coalesce(current_setting(''app.settings.service_role_key'', true), ''''), ''x-cron-secret'', coalesce(current_setting(''app.settings.cron_secret'', true), '''')), body := ''{}''::jsonb)',
          v_base_url
        )
      );
    END IF;
  END IF;
END $$;
