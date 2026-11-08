CREATE OR REPLACE FUNCTION public.verify_audit_chain(_limit integer DEFAULT 1000)
 RETURNS TABLE(total_records bigint, verified bigint, broken bigint, first_broken_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rec RECORD;
  _expected TEXT;
  _total BIGINT := 0;
  _ok BIGINT := 0;
  _bad BIGINT := 0;
  _first_bad UUID := NULL;
BEGIN
  IF NOT (app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator') OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager')) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  FOR _rec IN
    SELECT * FROM public.audit_log
    ORDER BY created_at ASC, id ASC
    LIMIT _limit
  LOOP
    _total := _total + 1;
    _expected := public.compute_audit_hash(
      _rec.entity_type, _rec.entity_id, _rec.action, _rec.actor_id,
      _rec.old_data, _rec.new_data, _rec.previous_hash, _rec.created_at
    );
    IF _expected = _rec.hash THEN
      _ok := _ok + 1;
    ELSE
      _bad := _bad + 1;
      IF _first_bad IS NULL THEN _first_bad := _rec.id; END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT _total, _ok, _bad, _first_bad;
END;
$function$
