CREATE OR REPLACE FUNCTION public.get_packaging_leaderboard()
 RETURNS TABLE(operator_name text, tasks_completed bigint, avg_time_minutes integer, quality_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
