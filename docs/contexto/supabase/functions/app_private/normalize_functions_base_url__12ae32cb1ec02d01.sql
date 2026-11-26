CREATE OR REPLACE FUNCTION app_private.normalize_functions_base_url()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'app_private', 'pg_temp'
AS $function$
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
$function$
