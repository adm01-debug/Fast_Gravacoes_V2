CREATE OR REPLACE FUNCTION public.rate_limit_check_and_record_pair(p_per_ip_endpoint text, p_ip inet, p_per_ip_max integer, p_global_endpoint text, p_global_max integer, p_window_seconds integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_window_start timestamptz := now() - make_interval(secs => p_window_seconds);
  v_per_ip_count int;
  v_global_count int;
BEGIN
  -- Ordem de locks fixa (per-IP → global) para todos os callers.
  PERFORM pg_advisory_xact_lock(hashtext(
    p_per_ip_endpoint || '|ip:' || coalesce(p_ip::text, '0.0.0.0')));
  PERFORM pg_advisory_xact_lock(hashtext(
    p_global_endpoint || '|ip:0.0.0.0'));

  SELECT count(*) INTO v_per_ip_count
  FROM public.rate_limit_logs
  WHERE endpoint = p_per_ip_endpoint
    AND created_at >= v_window_start
    AND user_id IS NULL
    AND user_email IS NULL
    AND ip_address = coalesce(p_ip, '0.0.0.0'::inet);
  IF v_per_ip_count >= p_per_ip_max THEN
    RETURN 1;
  END IF;

  SELECT count(*) INTO v_global_count
  FROM public.rate_limit_logs
  WHERE endpoint = p_global_endpoint
    AND created_at >= v_window_start
    AND user_id IS NULL
    AND user_email IS NULL
    AND ip_address = '0.0.0.0'::inet;
  IF v_global_count >= p_global_max THEN
    RETURN 2;
  END IF;

  INSERT INTO public.rate_limit_logs (
    endpoint, ip_address, request_count, window_start, window_end, is_blocked
  ) VALUES
    (p_per_ip_endpoint, coalesce(p_ip, '0.0.0.0'::inet), 1, v_window_start, now(), false),
    (p_global_endpoint, '0.0.0.0'::inet, 1, v_window_start, now(), false);

  RETURN 0;
END;
$function$
