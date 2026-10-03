-- RPC atômica de rate limit: checkRateLimit fazia SELECT-count e INSERT em
-- duas queries separadas — requisições concorrentes passavam ambas pelo count
-- antes do insert (TOCTOU). Aqui o count+insert roda na mesma transação sob
-- advisory lock por (endpoint, identidade), eliminando a corrida.
--
-- Contrato: retorna o nº de requisições na janela ANTES desta (0..p_max-1) e
-- já grava o log da requisição atual; retorna -1 quando o limite foi
-- excedido (sem gravar). A identidade segue a regra do helper:
-- user_id > user_email > ip.

CREATE OR REPLACE FUNCTION public.rate_limit_check_and_record(
  p_endpoint text,
  p_user_id uuid,
  p_user_email text,
  p_ip inet,
  p_max int,
  p_window_seconds int
) RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_count int;
  v_window_start timestamptz := now() - make_interval(secs => p_window_seconds);
BEGIN
  -- Serializa a seção crítica por identidade dentro do endpoint.
  IF p_user_id IS NOT NULL THEN
    v_key := 'user_id:' || p_user_id::text;
  ELSIF p_user_email IS NOT NULL THEN
    v_key := 'user_email:' || p_user_email;
  ELSE
    v_key := 'ip:' || coalesce(p_ip::text, '0.0.0.0');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_endpoint || '|' || v_key));

  SELECT count(*) INTO v_count
  FROM public.rate_limit_logs
  WHERE endpoint = p_endpoint
    AND created_at >= v_window_start
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (p_user_id IS NULL AND p_user_email IS NOT NULL AND user_email = p_user_email)
      OR (p_user_id IS NULL AND p_user_email IS NULL AND ip_address = coalesce(p_ip, '0.0.0.0'::inet))
    );

  IF v_count >= p_max THEN
    RETURN -1;
  END IF;

  INSERT INTO public.rate_limit_logs (
    endpoint, ip_address, user_id, user_email,
    request_count, window_start, window_end, is_blocked
  ) VALUES (
    p_endpoint,
    coalesce(p_ip, '0.0.0.0'::inet), -- coluna é NOT NULL
    p_user_id,
    p_user_email,
    1,
    v_window_start,
    now(),
    false
  );

  RETURN v_count;
END;
$$;

-- Só a service role (edge functions) pode chamar — identidades de cliente
-- nunca deveriam medir/gravar o próprio contador.
REVOKE EXECUTE ON FUNCTION public.rate_limit_check_and_record(text, uuid, text, inet, int, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rate_limit_check_and_record(text, uuid, text, inet, int, int) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rate_limit_check_and_record(text, uuid, text, inet, int, int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_check_and_record(text, uuid, text, inet, int, int) TO service_role;
