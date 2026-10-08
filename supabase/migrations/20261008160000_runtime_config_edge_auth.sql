-- Migra as credenciais DB→edge de GUCs (app.settings.*) para a tabela
-- app_private.runtime_config.
--
-- Por quê: no Supabase hospedado o usuário postgres não é superuser —
-- ALTER DATABASE e ALTER ROLE ... SET são negados (verificado no workflow
-- db-admin), então os GUCs nunca chegam às sessões pg_cron nem às
-- PostgREST (authenticator). Os cron jobs já foram apontados para a tabela
-- pelo db-admin; esta migration faz o mesmo nas trigger functions, que são
-- SECURITY DEFINER e rodam como o owner (postgres), que lê app_private.
--
-- A tabela é criada pelo workflow db-admin; o CREATE IF NOT EXISTS aqui
-- mantém a migration auto-suficiente em ambientes novos (staging/preview).

CREATE SCHEMA IF NOT EXISTS app_private;
CREATE TABLE IF NOT EXISTS app_private.runtime_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- Helper de leitura: retorna NULL quando a key não existe — mesmo
-- comportamento de current_setting(..., true) com GUC ausente.
CREATE OR REPLACE FUNCTION app_private.runtime_config_get(p_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT value FROM app_private.runtime_config WHERE key = p_key;
$$;

REVOKE ALL ON FUNCTION app_private.runtime_config_get(text) FROM PUBLIC;

-- 1) trigger_send_tpm_email(): mesmo corpo de 20261001143100, trocando
-- current_setting('app.settings.*') por runtime_config_get.
CREATE OR REPLACE FUNCTION public.trigger_send_tpm_email()
RETURNS TRIGGER AS $$
DECLARE
  v_base_url text := app_private.runtime_config_get('functions_base_url');
BEGIN
  IF coalesce(v_base_url, '') = '' THEN
    RAISE WARNING 'runtime_config.functions_base_url não configurado — webhook TPM ignorado neste ambiente';
    RETURN NEW;
  END IF;
  PERFORM
    net.http_post(
      url := v_base_url || '/send-tpm-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', coalesce(app_private.runtime_config_get('cron_secret'), ''),
        'Authorization', 'Bearer ' || coalesce(app_private.runtime_config_get('service_role_key'), '')
      ),
      body := jsonb_build_object(
        'event_type', 'INSERT',
        'record', row_to_json(NEW)
      )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) notify_loss_risk(): mesmo corpo de 20261002120000, mesma troca.
CREATE OR REPLACE FUNCTION public.notify_loss_risk()
RETURNS TRIGGER AS $$
DECLARE
  v_base_url text := app_private.runtime_config_get('functions_base_url');
BEGIN
  IF (NEW.severity = 'critical' OR NEW.alert_type = 'out_of_range') THEN
    IF coalesce(v_base_url, '') = '' THEN
      RAISE WARNING 'runtime_config.functions_base_url não configurado — alerta de risco de perda não notificado';
    ELSE
      BEGIN
        PERFORM
          net.http_post(
            url := v_base_url || '/send-loss-risk-alert',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-cron-secret', coalesce(app_private.runtime_config_get('cron_secret'), ''),
              'Authorization', 'Bearer ' || coalesce(app_private.runtime_config_get('service_role_key'), '')
            ),
            body := jsonb_build_object(
              'record', row_to_json(NEW),
              'event_type', 'INSERT'
            )
          );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_loss_risk: falha ao notificar (%)', SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) trigger_auto_promotion(): além da troca para runtime_config, corrige
-- dois bugs do original (20260512110942): a URL vinha de
-- request.headers::json->>'host' (host do PostgREST, não das functions) e
-- o request nunca mandava x-cron-secret — a edge classificava como
-- user-call e o Bearer service_role caía no auth.getUser → 401. Agora usa
-- functions_base_url da tabela e envia os dois headers, como o fallback
-- do pg_cron.
CREATE OR REPLACE FUNCTION public.trigger_auto_promotion()
RETURNS TRIGGER AS $$
DECLARE
  v_base_url text := app_private.runtime_config_get('functions_base_url');
BEGIN
  IF coalesce(v_base_url, '') = '' THEN
    RAISE WARNING 'runtime_config.functions_base_url não configurado — auto-promotion imediato ignorado';
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := v_base_url || '/auto-promote-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', coalesce(app_private.runtime_config_get('cron_secret'), ''),
        'Authorization', 'Bearer ' || coalesce(app_private.runtime_config_get('service_role_key'), '')
      ),
      body := '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trigger_auto_promotion: falha ao notificar (%)', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
