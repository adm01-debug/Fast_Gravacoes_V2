-- Restaura a execução das rotinas internas (pg_cron + triggers de banco).
--
-- Causa raiz: `app_private.runtime_config.functions_base_url` e os dois crons de
-- edge function apontavam para `https://supabase.atomicabr.com.br/functions/v1`,
-- o host self-hosted legado — que recusa as chaves internas do projeto Cloud.
-- Resultado: 156 de 156 respostas registradas em `net._http_response` eram 401
-- (`invalid_jwt`), então monitor de saúde, métricas, e-mail de alerta, aviso de
-- risco de perda e os e-mails de TPM nunca executaram. O endpoint canônico do
-- projeto aceita as mesmas credenciais (POST /auto-promote-jobs responde 200 e
-- promove OS), por isso o endereço interno passa a ser derivado dele.
--
-- 1) Endereço interno das edge functions, derivado do `ref` do próprio
--    service_role_key armazenado — sem hardcode de projeto, para que um clone
--    em outro ambiente continue apontando para o próprio projeto.

WITH ref AS (
  SELECT convert_from(
           decode(
             rpad(split_part(value, '.', 2),
                  (ceil(length(split_part(value, '.', 2)) / 4.0) * 4)::int,
                  '='),
             'base64'),
           'utf8')::jsonb ->> 'ref' AS project_ref
    FROM app_private.runtime_config
   WHERE key = 'service_role_key'
)
UPDATE app_private.runtime_config rc
   SET value = 'https://' || (SELECT project_ref FROM ref) || '.supabase.co/functions/v1'
 WHERE rc.key = 'functions_base_url'
   AND (SELECT project_ref FROM ref) IS NOT NULL
   AND rc.value ~ 'atomicabr';

-- 2) Helper único de endereço interno: lê a URL de runtime_config em tempo de
--    execução (com fallback derivado do service_role_key), para que trocar a URL
--    na configuração redirecione também os cron jobs já agendados — antes a URL
--    ficava fixa no texto do job e a configuração virava decoração.

CREATE OR REPLACE FUNCTION app_private.project_ref_from_key(p_key text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE
  v_payload text;
BEGIN
  IF p_key IS NULL OR p_key = '' OR position('.' IN p_key) = 0 THEN
    RETURN NULL;
  END IF;

  v_payload := convert_from(
    decode(
      rpad(
        translate(split_part(p_key, '.', 2), '-_', '+/'),
        (ceil(length(translate(split_part(p_key, '.', 2), '-_', '+/')) / 4.0) * 4)::int,
        '='
      ),
      'base64'
    ),
    'utf8'
  );

  RETURN (v_payload::jsonb) ->> 'ref';
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$fn$;

CREATE OR REPLACE FUNCTION app_private.functions_base_url()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app_private, pg_temp
AS $fn$
  SELECT coalesce(
           nullif(btrim(app_private.runtime_config_get('functions_base_url')), ''),
           'https://' || app_private.project_ref_from_key(
                          app_private.runtime_config_get('service_role_key')
                        ) || '.supabase.co/functions/v1'
         );
$fn$;

REVOKE ALL ON FUNCTION app_private.functions_base_url() FROM PUBLIC;

-- 3) Crons de edge function. Os dois jobs existentes carregavam host legado e um
--    `x-cron-secret` fixo que não casa com o `cron_secret` atual do projeto;
--    `metrics-collector` nunca foi agendado (system_metrics com 0 linhas).
--    Todos leem URL e secret de `app_private.runtime_config` em tempo de execução.

DO $$
DECLARE
  v_base_url text := coalesce(app_private.runtime_config_get('functions_base_url'), '');
  v_job record;
  v_novo record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE WARNING 'pg_cron indisponível — crons de edge function não reagendados';
    RETURN;
  END IF;

  IF v_base_url = '' THEN
    RAISE WARNING 'functions_base_url vazio — crons de edge function não reagendados';
    RETURN;
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

-- 4) Contagens distintas usadas pelo metrics-collector. A migration de origem
--    (20260614000001) consta como aplicada, mas as funções não existem no banco —
--    sem elas o collector grava `null` em operadores/máquinas ativos.

CREATE OR REPLACE FUNCTION public.count_running_machines()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(DISTINCT j.machine_id)
  FROM public.jobs j
  JOIN public.machines m ON m.id = j.machine_id
  WHERE j.status = 'production'
    AND j.machine_id IS NOT NULL
    AND m.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.count_active_operators_since(p_since timestamptz)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(DISTINCT q.operator_id)
  FROM public.qr_scan_history q
  WHERE q.scanned_at >= p_since
    AND q.operator_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = q.operator_id
        AND ur.role = 'operator'
        AND ur.is_active = true
    );
$$;

REVOKE ALL ON FUNCTION public.count_running_machines() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.count_active_operators_since(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_running_machines() TO service_role;
GRANT EXECUTE ON FUNCTION public.count_active_operators_since(timestamptz) TO service_role;