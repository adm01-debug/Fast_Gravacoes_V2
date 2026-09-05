-- Atomic increment for jobs.lost_pieces to avoid read-modify-write race conditions
CREATE OR REPLACE FUNCTION public.increment_job_lost_pieces(p_job_id uuid, p_amount integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.jobs
  SET lost_pieces = COALESCE(lost_pieces, 0) + p_amount
  WHERE id = p_job_id;
$$;
