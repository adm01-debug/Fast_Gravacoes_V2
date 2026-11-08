CREATE OR REPLACE FUNCTION app_private.runtime_config_get(p_key text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT value FROM app_private.runtime_config WHERE key = p_key;
$function$
