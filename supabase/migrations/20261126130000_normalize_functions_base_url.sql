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
-- 1) `app_private.project_ref_from_key()` e `app_private.functions_base_url()`
--    sao criadas em 20261126120000 (os cron jobs dependem delas).

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
  -- Rotacoes gravam URL e chave em ordem variavel. Quando a URL chega antes da
  -- chave, no INSERT dela o `ref` ainda nao pode ser derivado (project_ref
  -- nulo, valor mantido). Este ramo revisita a URL quando a chave chega depois,
  -- senao o host legado ficaria preso ate alguem rodar um UPDATE manual.
  IF NEW.key = 'service_role_key' THEN
    IF pg_trigger_depth() > 1 THEN
      RETURN NEW;
    END IF;

    v_ref := app_private.project_ref_from_key(NEW.value);

    IF coalesce(v_ref, '') <> ''
       AND EXISTS (
         SELECT 1 FROM app_private.runtime_config
          WHERE key = 'functions_base_url' AND value ~ 'atomicabr'
       ) THEN
      UPDATE app_private.runtime_config
         SET value = 'https://' || v_ref || '.supabase.co/functions/v1'
       WHERE key = 'functions_base_url';
      RAISE NOTICE 'functions_base_url normalizado apos gravacao da chave: %', v_ref;
    END IF;

    RETURN NEW;
  END IF;

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