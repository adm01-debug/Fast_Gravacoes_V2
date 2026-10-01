-- Corrige URLs de projeto Supabase legadas (whnnzdreuwxczxelvqjh e
-- xxroejpvloldkmqdydar) apontando para o self-hosted canônico
-- (supabase.atomicabr.com.br). Dois pontos afetados:
--   1. public.trigger_send_tpm_email(): hardcoded na função (o trigger que a
--      chama está comentado, mas a função fica incorreta no banco).
--   2. Cron 'auto-promote-jobs-fallback' (*/5 * * * *): batia em host morto.

-- 1. Reescreve a função com a URL canônica.
CREATE OR REPLACE FUNCTION public.trigger_send_tpm_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://supabase.atomicabr.com.br/functions/v1/send-tpm-email',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)),
      body := jsonb_build_object(
        'event_type', 'INSERT',
        'record', row_to_json(NEW)
      )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Reagenda o cron de fallback do auto-promote-jobs com a URL canônica.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('auto-promote-jobs-fallback');
    PERFORM cron.schedule(
      'auto-promote-jobs-fallback',
      '*/5 * * * *',
      'SELECT net.http_post(
        url := ''https://supabase.atomicabr.com.br/functions/v1/auto-promote-jobs'',
        headers := jsonb_build_object(
          ''Content-Type'', ''application/json'',
          ''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key'', true)
        ),
        body := ''{}''::jsonb
      )'
    );
  END IF;
END $$;
