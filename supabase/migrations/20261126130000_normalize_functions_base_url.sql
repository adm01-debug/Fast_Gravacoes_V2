-- Impede que a URL interna das edge functions volte ao host self-hosted legado.
--
-- Causa raiz: o workflow de rotacao de segredo (`.github/workflows/db-admin.yml`,
-- `BASE_URL='https://supabase.atomicabr.com.br/functions/v1'`) faz upsert de
-- `app_private.runtime_config.functions_base_url` a cada rotacao. Como um
-- `UPDATE` de migracao nao se repete, a proxima rotacao reescreveria o valor
-- corrigido com o host legado e todos os gatilhos (promocao automatica, aviso de
-- risco de perda, e-mails de TPM) e os cron jobs voltariam a receber 401.
--
-- Aqui o banco normaliza o valor na escrita: qualquer host legado gravado em
-- `functions_base_url` e reescrito para o endpoint canonico derivado do `ref`
-- do proprio service_role_key — sem hardcode de projeto.
--
-- 1) Extrai o `ref` do payload do JWT (mesma derivacao da migracao anterior,
--    agora reutilizavel).

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

COMMENT ON FUNCTION app_private.project_ref_from_key(text) IS
  'Deriva o project ref do Supabase a partir da chave JWT (service_role). Usado para montar a URL interna das edge functions sem hardcode.';

-- 2) Trigger de normalizacao: nenhuma escrita pode deixar o host legado.

CREATE OR REPLACE FUNCTION app_private.normalize_functions_base_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app_private, pg_temp
AS $fn$
DECLARE
  v_ref text;
BEGIN
  IF NEW.key <> 'functions_base_url' OR coalesce(NEW.value, '') = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.value !~ 'atomicabr' THEN
    RETURN NEW;
  END IF;

  v_ref := app_private.project_ref_from_key(
    coalesce(
      (SELECT value FROM app_private.runtime_config WHERE key = 'service_role_key'),
      ''
    )
  );

  IF coalesce(v_ref, '') = '' THEN
    RAISE WARNING 'functions_base_url aponta para o host legado e o project ref nao pode ser derivado; valor mantido como veio';
    RETURN NEW;
  END IF;

  NEW.value := 'https://' || v_ref || '.supabase.co/functions/v1';
  RAISE NOTICE 'functions_base_url normalizado para %', NEW.value;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_normalize_functions_base_url ON app_private.runtime_config;

CREATE TRIGGER trg_normalize_functions_base_url
BEFORE INSERT OR UPDATE ON app_private.runtime_config
FOR EACH ROW
EXECUTE FUNCTION app_private.normalize_functions_base_url();

-- 3) Correcao do valor atual (idempotente: so toca quando ainda aponta para o
--    host legado).

UPDATE app_private.runtime_config
   SET value = 'https://' || app_private.project_ref_from_key(
                 coalesce((SELECT value FROM app_private.runtime_config WHERE key = 'service_role_key'), '')
               ) || '.supabase.co/functions/v1'
 WHERE key = 'functions_base_url'
   AND value ~ 'atomicabr'
   AND coalesce(app_private.project_ref_from_key(
                 coalesce((SELECT value FROM app_private.runtime_config WHERE key = 'service_role_key'), '')
               ), '') <> '';