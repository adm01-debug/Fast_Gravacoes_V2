DROP POLICY IF EXISTS "Authenticated users can view efficiency alerts" ON public.efficiency_alert_history;
DROP POLICY IF EXISTS "Authenticated users can view inspections" ON public.lot_quality_inspections;
DROP POLICY IF EXISTS "Authenticated users can view schedules" ON public.maintenance_schedules;
DROP POLICY IF EXISTS "Authenticated users can view goals" ON public.operator_goals;
DROP POLICY IF EXISTS "Authenticated users can view lots" ON public.production_lots;
DROP POLICY IF EXISTS "Authenticated users can view handovers" ON public.shift_handovers;
DROP POLICY IF EXISTS "Authenticated users can view SPC alerts" ON public.spc_alerts;
DROP POLICY IF EXISTS "Authenticated users can view measurements" ON public.spc_measurements;