-- Restaura public.increment_job_lost_pieces.
--
-- A migration 20260531000001_add_increment_job_lost_pieces_rpc consta como aplicada em
-- produção (supabase_migrations.schema_migrations), mas a função não existe no banco.
-- Consequência: src/features/production/hooks/useProductionLosses.ts sempre caía no
-- fallback read-modify-write, que perde incrementos concorrentes em jobs.lost_pieces.
--
-- SECURITY INVOKER de propósito: a atualização passa pelas políticas de RLS de jobs
-- exatamente como o fallback passava, sem abrir um caminho de escrita privilegiada.
CREATE OR REPLACE FUNCTION public.increment_job_lost_pieces(p_job_id uuid, p_amount integer)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $fn$
  UPDATE public.jobs
  SET lost_pieces = COALESCE(lost_pieces, 0) + p_amount
  WHERE id = p_job_id;
$fn$;

REVOKE ALL ON FUNCTION public.increment_job_lost_pieces(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_job_lost_pieces(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_job_lost_pieces(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_job_lost_pieces(uuid, integer) TO service_role;