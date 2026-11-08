CREATE OR REPLACE FUNCTION public.cron_expected_interval_minutes(_schedule text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  m TEXT;
  h TEXT;
  n INTEGER;
BEGIN
  IF _schedule IS NULL THEN RETURN NULL; END IF;

  IF _schedule ~ '^@hourly' THEN RETURN 60; END IF;
  IF _schedule ~ '^@daily|^@midnight' THEN RETURN 1440; END IF;
  IF _schedule ~ '^@weekly' THEN RETURN 10080; END IF;

  m := split_part(_schedule, ' ', 1);
  h := split_part(_schedule, ' ', 2);

  -- */N * * * *  -> a cada N minutos
  IF m ~ '^\*/[0-9]+$' THEN
    n := substring(m from 3)::int;
    RETURN GREATEST(n, 1);
  END IF;

  -- * * * * * -> a cada minuto
  IF m = '*' THEN RETURN 1; END IF;

  -- N */H * * * -> a cada H horas
  IF h ~ '^\*/[0-9]+$' THEN
    n := substring(h from 3)::int;
    RETURN GREATEST(n, 1) * 60;
  END IF;

  -- N * * * * -> de hora em hora
  IF h = '*' THEN RETURN 60; END IF;

  -- caso geral: diário
  RETURN 1440;
END;
$function$
