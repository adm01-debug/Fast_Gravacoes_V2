CREATE OR REPLACE FUNCTION public.exec_sql(query text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_catalog'
 SET statement_timeout TO '28s'
 SET lock_timeout TO '5s'
AS $function$
DECLARE
  result     jsonb;
  trimmed    text;
  normalized text;
  first_word text;
  affected   bigint := 0;
  row_limit  int    := 5000;
  _plan_rec  RECORD;
BEGIN
  trimmed    := btrim(query);
  normalized := upper(btrim(regexp_replace(trimmed, '(/\*.*?\*/|--[^\n]*)', ' ', 'g')));
  first_word := split_part(normalized, ' ', 1);

  IF first_word = 'EXPLAIN' THEN
    result := '[]'::jsonb;
    FOR _plan_rec IN EXECUTE trimmed LOOP
      result := result || jsonb_build_array(to_jsonb(_plan_rec));
    END LOOP;
    result := coalesce((SELECT jsonb_agg(x) FROM jsonb_array_elements(result) x), '[]'::jsonb);

  ELSIF first_word IN ('SELECT','WITH','TABLE','VALUES','SHOW') THEN
    EXECUTE format(
      'SELECT coalesce(jsonb_agg(row_to_json(_q)::jsonb), ''[]''::jsonb) FROM (SELECT * FROM (%s) _outer LIMIT %s) _q',
      trimmed, row_limit
    ) INTO result;

  ELSIF first_word IN ('INSERT','UPDATE','DELETE','MERGE') AND position('RETURNING' IN normalized) > 0 THEN
    EXECUTE format(
      'WITH _dml AS (%s) SELECT coalesce(jsonb_agg(row_to_json(_q)::jsonb), ''[]''::jsonb) FROM _dml _q',
      trimmed
    ) INTO result;

  ELSIF first_word IN ('INSERT','UPDATE','DELETE','MERGE') THEN
    EXECUTE trimmed;
    GET DIAGNOSTICS affected = ROW_COUNT;
    result := jsonb_build_array(jsonb_build_object('command', first_word, 'rows_affected', affected, 'success', true));

  ELSE
    EXECUTE trimmed;
    GET DIAGNOSTICS affected = ROW_COUNT;
    result := jsonb_build_array(jsonb_build_object('command', first_word, 'rows_affected', NULLIF(affected,0), 'success', true));
  END IF;

  RETURN result;
EXCEPTION WHEN others THEN RAISE;
END;
$function$
