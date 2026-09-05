-- Distinct-count helpers for the metrics-collector edge function.
-- Computing these in SQL avoids the PostgREST row cap (default 1000), which
-- otherwise undercounts active operators on busy days and forces large
-- in-memory deduplication in the edge function.

-- Number of distinct ACTIVE machines currently running a job in production.
-- Filtering is_active prevents a decommissioned machine that still has a
-- production job from being counted (which could even make running > total).
CREATE OR REPLACE FUNCTION public.count_running_machines()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(DISTINCT j.machine_id)
  FROM public.jobs j
  JOIN public.machines m ON m.id = j.machine_id
  WHERE j.status = 'production'
    AND j.machine_id IS NOT NULL
    AND m.is_active = true;
$$;

-- Number of distinct operators who scanned a job since the given timestamp AND
-- still hold an active 'operator' role (so users whose operator role was
-- removed/deactivated after scanning are not counted as active).
CREATE OR REPLACE FUNCTION public.count_active_operators_since(p_since timestamptz)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(DISTINCT q.operator_id)
  FROM public.qr_scan_history q
  WHERE q.scanned_at >= p_since
    AND q.operator_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = q.operator_id
        AND ur.role = 'operator'
        AND ur.is_active = true
    );
$$;

-- These are invoked by the metrics-collector function using the service role.
REVOKE ALL ON FUNCTION public.count_running_machines() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.count_active_operators_since(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.count_running_machines() TO service_role;
GRANT EXECUTE ON FUNCTION public.count_active_operators_since(timestamptz) TO service_role;
