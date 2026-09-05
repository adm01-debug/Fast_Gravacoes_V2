
-- #47-52 & Security Fixes

-- 1. Leaderboard
CREATE OR REPLACE FUNCTION public.get_packaging_leaderboard()
RETURNS TABLE (
    operator_name text,
    tasks_completed bigint,
    avg_time_minutes integer,
    quality_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.full_name as operator_name,
        count(t.id) as tasks_completed,
        round(avg(extract(epoch from (t.completed_at - t.started_at))/60))::integer as avg_time_minutes,
        round((sum(t.approved_quantity)::numeric / nullif(sum(t.received_quantity), 0) * 100), 1) as quality_rate
    FROM public.packaging_tasks t
    JOIN public.profiles p ON t.assigned_to = p.id
    WHERE t.status = 'ready_to_ship'
      AND t.completed_at >= current_date
    GROUP BY p.id, p.full_name
    ORDER BY tasks_completed DESC, quality_rate DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_packaging_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_packaging_leaderboard() TO authenticated;

-- 2. Stale Reassignment
CREATE OR REPLACE FUNCTION public.auto_reassign_stale_packaging_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.packaging_tasks
    SET assigned_to = NULL,
        status = 'pending',
        notes = concat(notes, '\n[AUTO] Reatribuído por inatividade em ', now())
    WHERE status IN ('packaging', 'in_triage')
      AND (
          (updated_at < now() - interval '30 minutes')
          OR 
          (started_at < now() - interval '2 hours' AND completed_at IS NULL)
      );
END;
$$;

REVOKE ALL ON FUNCTION public.auto_reassign_stale_packaging_tasks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_reassign_stale_packaging_tasks() TO service_role;

-- 3. Manifest (Hardened)
CREATE OR REPLACE FUNCTION public.get_packaging_manifest(p_task_ids uuid[])
RETURNS TABLE (
    order_number text,
    client_name text,
    package_type text,
    packages_count integer,
    total_weight numeric,
    shipping_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.order_number,
        j.client,
        t.package_type,
        t.packages_count,
        t.total_weight_kg,
        'Consultar Bitrix24'::text
    FROM public.packaging_tasks t
    JOIN public.jobs j ON t.job_id = j.id
    WHERE t.id = ANY(p_task_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.get_packaging_manifest(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_packaging_manifest(uuid[]) TO authenticated;

-- 4. Equipment & Waste (Already might exist, so use IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.packaging_equipment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL,
    last_maintenance_at timestamptz,
    next_maintenance_at timestamptz,
    status text DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance_required', 'broken')),
    created_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.packaging_equipment TO authenticated;
GRANT ALL ON public.packaging_equipment TO service_role;
ALTER TABLE public.packaging_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated users can see equipment" ON public.packaging_equipment;
CREATE POLICY "All authenticated users can see equipment" ON public.packaging_equipment FOR SELECT TO authenticated USING (true);
