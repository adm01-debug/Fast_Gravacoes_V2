-- Scope SELECT policies on sensitive operational tables from USING(true) to
-- requiring at least one active role entry in user_roles.
--
-- Prior migrations (20260412114527, 20260412120237, etc.) already narrowed
-- these policies from anonymous to "authenticated", but USING(true) still
-- allows any Supabase auth user who has never been assigned a role — or whose
-- role was deactivated — to read production, cost, quality, and HR data.
--
-- Pure reference tables that every operator legitimately needs for day-to-day
-- work (techniques, machines, materials, product_categories, technical_sheets,
-- maintenance_types, maintenance_checklists, etc.) are intentionally left open
-- to all authenticated users and are NOT touched here.
--
-- Tables already addressed: daily_summaries, efficiency_alert_history,
-- spc_capability_history (migration 20260719160000).
--
-- Pattern: DROP old policy; CREATE replacement with EXISTS subquery.
-- All DROPs use IF EXISTS — safe to re-run.

-- ── helpers ──────────────────────────────────────────────────────────────────
-- Shorthand alias so the USING clause stays readable.
-- (No actual function created — the subquery is inlined everywhere.)

-- ── abc_job_costs ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view job costs"                    ON public.abc_job_costs;
DROP POLICY IF EXISTS "Authenticated users can view job costs"       ON public.abc_job_costs;
CREATE POLICY "Active users can view job costs"
  ON public.abc_job_costs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── abc_cost_pools ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view cost pools"                   ON public.abc_cost_pools;
DROP POLICY IF EXISTS "Authenticated users can view cost pools"      ON public.abc_cost_pools;
CREATE POLICY "Active users can view cost pools"
  ON public.abc_cost_pools FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── abc_activity_rates ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view activity rates"               ON public.abc_activity_rates;
DROP POLICY IF EXISTS "Authenticated users can view activity rates"  ON public.abc_activity_rates;
CREATE POLICY "Active users can view activity rates"
  ON public.abc_activity_rates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── spc_control_parameters ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view SPC parameters"                    ON public.spc_control_parameters;
DROP POLICY IF EXISTS "Authenticated users can view SPC parameters"       ON public.spc_control_parameters;
DROP POLICY IF EXISTS "Authenticated users can view control parameters"   ON public.spc_control_parameters;
CREATE POLICY "Active users can view SPC parameters"
  ON public.spc_control_parameters FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── spc_measurements ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view SPC measurements"              ON public.spc_measurements;
DROP POLICY IF EXISTS "Authenticated users can view measurements"     ON public.spc_measurements;
DROP POLICY IF EXISTS "Authenticated users can view spc measurements" ON public.spc_measurements;
CREATE POLICY "Active users can view SPC measurements"
  ON public.spc_measurements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── spc_alerts ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view SPC alerts"               ON public.spc_alerts;
DROP POLICY IF EXISTS "Authenticated users can view SPC alerts"  ON public.spc_alerts;
DROP POLICY IF EXISTS "Authenticated users can view spc alerts"  ON public.spc_alerts;
CREATE POLICY "Active users can view SPC alerts"
  ON public.spc_alerts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── production_lots ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view production lots"               ON public.production_lots;
DROP POLICY IF EXISTS "Authenticated users can view production lots"  ON public.production_lots;
DROP POLICY IF EXISTS "Authenticated users can view lots"             ON public.production_lots;
CREATE POLICY "Active users can view production lots"
  ON public.production_lots FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── lot_components ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view lot components"               ON public.lot_components;
DROP POLICY IF EXISTS "Authenticated users can view lot components"  ON public.lot_components;
CREATE POLICY "Active users can view lot components"
  ON public.lot_components FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── lot_movements ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view lot movements"               ON public.lot_movements;
DROP POLICY IF EXISTS "Authenticated users can view lot movements"  ON public.lot_movements;
CREATE POLICY "Active users can view lot movements"
  ON public.lot_movements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── lot_quality_inspections ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view quality inspections"               ON public.lot_quality_inspections;
DROP POLICY IF EXISTS "Authenticated users can view quality inspections"  ON public.lot_quality_inspections;
DROP POLICY IF EXISTS "Authenticated users can view inspections"          ON public.lot_quality_inspections;
CREATE POLICY "Active users can view quality inspections"
  ON public.lot_quality_inspections FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── energy_consumption ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view energy consumption"               ON public.energy_consumption;
DROP POLICY IF EXISTS "Authenticated users can view energy consumption"  ON public.energy_consumption;
CREATE POLICY "Active users can view energy consumption"
  ON public.energy_consumption FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── energy_alerts ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view energy alerts"               ON public.energy_alerts;
DROP POLICY IF EXISTS "Authenticated users can view energy alerts"  ON public.energy_alerts;
CREATE POLICY "Active users can view energy alerts"
  ON public.energy_alerts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── energy_targets ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view energy targets"               ON public.energy_targets;
DROP POLICY IF EXISTS "Authenticated users can view energy targets"  ON public.energy_targets;
CREATE POLICY "Active users can view energy targets"
  ON public.energy_targets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── operator_rankings ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view operator rankings"               ON public.operator_rankings;
DROP POLICY IF EXISTS "Authenticated users can view operator rankings"  ON public.operator_rankings;
DROP POLICY IF EXISTS "Authenticated users can view rankings"           ON public.operator_rankings;
CREATE POLICY "Active users can view operator rankings"
  ON public.operator_rankings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── operator_goals ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view operator goals"               ON public.operator_goals;
DROP POLICY IF EXISTS "Authenticated users can view operator goals"  ON public.operator_goals;
DROP POLICY IF EXISTS "Authenticated users can view goals"           ON public.operator_goals;
CREATE POLICY "Active users can view operator goals"
  ON public.operator_goals FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── operator_achievements ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view operator achievements"               ON public.operator_achievements;
DROP POLICY IF EXISTS "Authenticated users can view operator achievements"  ON public.operator_achievements;
DROP POLICY IF EXISTS "Authenticated users can view achievements"           ON public.operator_achievements;
CREATE POLICY "Active users can view operator achievements"
  ON public.operator_achievements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── operator_machines ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view operator machines"               ON public.operator_machines;
DROP POLICY IF EXISTS "Authenticated users can view operator machines"  ON public.operator_machines;
CREATE POLICY "Active users can view operator machines"
  ON public.operator_machines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── machine_predictions ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view predictions"               ON public.machine_predictions;
DROP POLICY IF EXISTS "Authenticated users can view predictions"  ON public.machine_predictions;
CREATE POLICY "Active users can view predictions"
  ON public.machine_predictions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── prediction_history ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view prediction history"               ON public.prediction_history;
DROP POLICY IF EXISTS "Authenticated users can view prediction history"  ON public.prediction_history;
CREATE POLICY "Active users can view prediction history"
  ON public.prediction_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── machine_health_metrics ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view health metrics"               ON public.machine_health_metrics;
DROP POLICY IF EXISTS "Authenticated users can view health metrics"  ON public.machine_health_metrics;
CREATE POLICY "Active users can view health metrics"
  ON public.machine_health_metrics FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── maintenance_records ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view maintenance records"               ON public.maintenance_records;
DROP POLICY IF EXISTS "Authenticated users can view maintenance records"  ON public.maintenance_records;
CREATE POLICY "Active users can view maintenance records"
  ON public.maintenance_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── maintenance_item_responses ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view item responses"               ON public.maintenance_item_responses;
DROP POLICY IF EXISTS "Authenticated users can view item responses"  ON public.maintenance_item_responses;
CREATE POLICY "Active users can view item responses"
  ON public.maintenance_item_responses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── maintenance_alerts ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view maintenance alerts"               ON public.maintenance_alerts;
DROP POLICY IF EXISTS "Authenticated users can view maintenance alerts"  ON public.maintenance_alerts;
CREATE POLICY "Active users can view maintenance alerts"
  ON public.maintenance_alerts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── shift_handovers ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view shift handovers"               ON public.shift_handovers;
DROP POLICY IF EXISTS "Authenticated users can view shift handovers"  ON public.shift_handovers;
DROP POLICY IF EXISTS "Authenticated users can view handovers"        ON public.shift_handovers;
CREATE POLICY "Active users can view shift handovers"
  ON public.shift_handovers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── shift_handover_checklist ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view checklist items"               ON public.shift_handover_checklist;
DROP POLICY IF EXISTS "Authenticated users can view checklist items"  ON public.shift_handover_checklist;
CREATE POLICY "Active users can view shift handover checklist"
  ON public.shift_handover_checklist FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── shift_pending_tasks ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view pending tasks"               ON public.shift_pending_tasks;
DROP POLICY IF EXISTS "Authenticated users can view pending tasks"  ON public.shift_pending_tasks;
CREATE POLICY "Active users can view pending tasks"
  ON public.shift_pending_tasks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── shift_occurrences ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view occurrences"               ON public.shift_occurrences;
DROP POLICY IF EXISTS "Authenticated users can view occurrences"  ON public.shift_occurrences;
CREATE POLICY "Active users can view shift occurrences"
  ON public.shift_occurrences FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- ── shift_checklist_templates ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view templates"               ON public.shift_checklist_templates;
DROP POLICY IF EXISTS "Authenticated users can view templates"  ON public.shift_checklist_templates;
CREATE POLICY "Active users can view shift templates"
  ON public.shift_checklist_templates FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND is_active = true
  ));
