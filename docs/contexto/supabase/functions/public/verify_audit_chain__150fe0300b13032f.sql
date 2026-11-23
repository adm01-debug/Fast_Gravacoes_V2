CREATE OR REPLACE FUNCTION public.verify_audit_chain(_limit integer DEFAULT 1000)
 RETURNS TABLE(total_records bigint, verified bigint, broken bigint, first_broken_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rec public.audit_log;
  _expected TEXT;
  _anchored TEXT := 'GENESIS';
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
    -- Registro historico sem hash (pre-fix, actor NULL): preserva e avanca
    -- sem reescrever. A ancora so avanca quando ha um hash valido.
    IF _rec.hash IS NULL THEN
      CONTINUE;
    END IF;

    -- 1) ELO: previous_hash deve ser a ancora (ultimo hash nao-nulo anterior).
    IF _rec.previous_hash IS DISTINCT FROM _anchored THEN
      _bad := _bad + 1;
      IF _first_bad IS NULL THEN _first_bad := _rec.id; END IF;
    ELSE
      -- 2) Hash individual no formato de escrita real.
      _expected := public.calculate_audit_hash(_rec);
      IF _expected = _rec.hash THEN
        _ok := _ok + 1;
      ELSE
        _bad := _bad + 1;
        IF _first_bad IS NULL THEN _first_bad := _rec.id; END IF;
      END IF;
    END IF;

    _anchored := _rec.hash;
  END LOOP;

  RETURN QUERY SELECT _total, _ok, _bad, _first_bad;
END;
$function$
