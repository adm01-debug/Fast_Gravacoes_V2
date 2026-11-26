CREATE OR REPLACE FUNCTION app_private.project_ref_from_key(p_key text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
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
$function$
