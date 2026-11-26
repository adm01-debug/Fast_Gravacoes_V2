-- Restaura public.increment_job_lost_pieces.
--
-- A migration 20260531000001_add_increment_job_lost_pieces_rpc consta como aplicada em
-- produção (supabase_migrations.schema_migrations), mas a função não existe no banco.
-- Consequência: src/features/production/hooks/useProductionLosses.ts sempre caía no
-- fallback read-modify-write, que perde incrementos concorrentes em jobs.lost_pieces.
--
-- SECURITY INVOKER de propósito: a atualização passa pelas políticas de RLS de jobs
-- exatamente como o fallback passava, sem abrir um caminho de escrita privilegiada.
-- A funcao falha em vez de mentir: se a atualizacao nao alcancar nenhuma linha
-- (job inexistente ou barrado pela RLS de jobs), o chamador recebe erro e nao
-- trata o incremento como aplicado.
CREATE OR REPLACE FUNCTION public.increment_job_lost_pieces(p_job_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
BEGIN
  UPDATE public.jobs
  SET lost_pieces = COALESCE(lost_pieces, 0) + p_amount
  WHERE id = p_job_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'nenhuma linha de public.jobs atualizada para o job % (inexistente ou sem permissao de escrita)', p_job_id
      USING ERRCODE = 'P0002';
  END IF;
END;
$fn$

REVOKE ALL ON FUNCTION public.increment_job_lost_pieces(uuid, integer) FROM PUBLIC

REVOKE ALL ON FUNCTION public.increment_job_lost_pieces(uuid, integer) FROM anon

GRANT EXECUTE ON FUNCTION public.increment_job_lost_pieces(uuid, integer) TO authenticated

GRANT EXECUTE ON FUNCTION public.increment_job_lost_pieces(uuid, integer) TO service_role
