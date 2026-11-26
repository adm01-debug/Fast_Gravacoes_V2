CREATE OR REPLACE FUNCTION app_private.functions_base_url()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'app_private', 'pg_temp'
AS $function$
  SELECT coalesce(
           nullif(btrim(app_private.runtime_config_get('functions_base_url')), ''),
           'https://' || app_private.project_ref_from_key(
                          app_private.runtime_config_get('service_role_key')
                        ) || '.supabase.co/functions/v1'
         );
$function$
