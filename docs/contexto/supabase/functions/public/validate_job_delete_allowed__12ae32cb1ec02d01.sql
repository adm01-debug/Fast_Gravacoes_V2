CREATE OR REPLACE FUNCTION public.validate_job_delete_allowed()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF current_setting('app.archiving_job', true) = 'on' THEN
    RETURN OLD;
  END IF;

  IF COALESCE(OLD.produced_quantity, 0) > 0 OR COALESCE(OLD.lost_pieces, 0) > 0 THEN
    RAISE EXCEPTION 'Nao e possivel excluir a OS %: ela ja tem producao registrada (% pecas produzidas, % pecas perdidas).',
      COALESCE(OLD.order_number, OLD.id::text), COALESCE(OLD.produced_quantity, 0), COALESCE(OLD.lost_pieces, 0)
      USING ERRCODE = 'FG001';
  END IF;

  IF OLD.status NOT IN ('queue', 'scheduled', 'cancelled') THEN
    RAISE EXCEPTION 'Nao e possivel excluir a OS %: o status atual (%) so permite exclusao de OS em fila, agendada ou cancelada.',
      COALESCE(OLD.order_number, OLD.id::text), OLD.status
      USING ERRCODE = 'FG001';
  END IF;

  RETURN OLD;
END;
$function$
