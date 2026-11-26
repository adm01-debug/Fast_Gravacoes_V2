CREATE OR REPLACE FUNCTION app_private.normalize_functions_base_url()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'app_private', 'pg_temp'
AS $function$
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
$function$
