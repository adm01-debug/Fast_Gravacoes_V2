CREATE OR REPLACE FUNCTION public.increment_job_lost_pieces(p_job_id uuid, p_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.jobs
  SET lost_pieces = COALESCE(lost_pieces, 0) + p_amount
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'nenhuma linha de public.jobs atualizada para o job % (inexistente ou sem permissao de escrita)', p_job_id
      USING ERRCODE = 'P0002';
  END IF;
END;
$function$
