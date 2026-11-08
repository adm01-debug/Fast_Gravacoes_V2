-- Drop existing policies that may conflict, then recreate

-- spc_measurements
DROP POLICY IF EXISTS "Authenticated users can view measurements" ON public.spc_measurements

DROP POLICY IF EXISTS "Anyone can view measurements" ON public.spc_measurements

CREATE POLICY "Authenticated users can view measurements"
  ON public.spc_measurements FOR SELECT TO authenticated USING (true)

-- spc_control_parameters
DROP POLICY IF EXISTS "Authenticated users can view control parameters" ON public.spc_control_parameters

DROP POLICY IF EXISTS "Anyone can view control parameters" ON public.spc_control_parameters

CREATE POLICY "Authenticated users can view control parameters"
  ON public.spc_control_parameters FOR SELECT TO authenticated USING (true)

-- spc_capability_history
DROP POLICY IF EXISTS "Authenticated users can view capability history" ON public.spc_capability_history

DROP POLICY IF EXISTS "Anyone can view capability history" ON public.spc_capability_history

CREATE POLICY "Authenticated users can view capability history"
  ON public.spc_capability_history FOR SELECT TO authenticated USING (true)

-- spc_alerts
DROP POLICY IF EXISTS "Authenticated users can view SPC alerts" ON public.spc_alerts

DROP POLICY IF EXISTS "Anyone can view SPC alerts" ON public.spc_alerts

CREATE POLICY "Authenticated users can view SPC alerts"
  ON public.spc_alerts FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Authenticated users can manage SPC alerts" ON public.spc_alerts

DROP POLICY IF EXISTS "Coordinators can manage SPC alerts" ON public.spc_alerts

CREATE POLICY "Coordinators can manage SPC alerts"
  ON public.spc_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'))

-- production_lots
DROP POLICY IF EXISTS "Authenticated users can view production lots" ON public.production_lots

DROP POLICY IF EXISTS "Anyone can view production lots" ON public.production_lots

CREATE POLICY "Authenticated users can view production lots"
  ON public.production_lots FOR SELECT TO authenticated USING (true)

-- lot_quality_inspections
DROP POLICY IF EXISTS "Authenticated users can view quality inspections" ON public.lot_quality_inspections

DROP POLICY IF EXISTS "Anyone can view quality inspections" ON public.lot_quality_inspections

CREATE POLICY "Authenticated users can view quality inspections"
  ON public.lot_quality_inspections FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Authenticated users can manage quality inspections" ON public.lot_quality_inspections

DROP POLICY IF EXISTS "Coordinators can manage quality inspections" ON public.lot_quality_inspections

CREATE POLICY "Coordinators can manage quality inspections"
  ON public.lot_quality_inspections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'))

-- maintenance_alerts
DROP POLICY IF EXISTS "Authenticated users can view maintenance alerts" ON public.maintenance_alerts

DROP POLICY IF EXISTS "Anyone can view maintenance alerts" ON public.maintenance_alerts

CREATE POLICY "Authenticated users can view maintenance alerts"
  ON public.maintenance_alerts FOR SELECT TO authenticated USING (true)

-- maintenance_schedules
DROP POLICY IF EXISTS "Authenticated users can view maintenance schedules" ON public.maintenance_schedules

DROP POLICY IF EXISTS "Anyone can view maintenance schedules" ON public.maintenance_schedules

CREATE POLICY "Authenticated users can view maintenance schedules"
  ON public.maintenance_schedules FOR SELECT TO authenticated USING (true)

-- maintenance_item_responses
DROP POLICY IF EXISTS "Authenticated users can view item responses" ON public.maintenance_item_responses

DROP POLICY IF EXISTS "Anyone can view item responses" ON public.maintenance_item_responses

CREATE POLICY "Authenticated users can view item responses"
  ON public.maintenance_item_responses FOR SELECT TO authenticated USING (true)

-- shift_handovers
DROP POLICY IF EXISTS "Authenticated users can view shift handovers" ON public.shift_handovers

DROP POLICY IF EXISTS "Anyone can view shift handovers" ON public.shift_handovers

CREATE POLICY "Authenticated users can view shift handovers"
  ON public.shift_handovers FOR SELECT TO authenticated USING (true)

-- shift_pending_tasks
DROP POLICY IF EXISTS "Authenticated users can view pending tasks" ON public.shift_pending_tasks

DROP POLICY IF EXISTS "Anyone can view pending tasks" ON public.shift_pending_tasks

CREATE POLICY "Authenticated users can view pending tasks"
  ON public.shift_pending_tasks FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Authenticated users can manage shift pending tasks" ON public.shift_pending_tasks

DROP POLICY IF EXISTS "Coordinators can manage shift pending tasks" ON public.shift_pending_tasks

CREATE POLICY "Coordinators can manage shift pending tasks"
  ON public.shift_pending_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'))

-- shift_handover_checklist
DROP POLICY IF EXISTS "Authenticated users can view checklist items" ON public.shift_handover_checklist

DROP POLICY IF EXISTS "Anyone can view checklist items" ON public.shift_handover_checklist

CREATE POLICY "Authenticated users can view checklist items"
  ON public.shift_handover_checklist FOR SELECT TO authenticated USING (true)

DROP POLICY IF EXISTS "Authenticated users can manage shift handover checklist" ON public.shift_handover_checklist

DROP POLICY IF EXISTS "Coordinators can manage shift handover checklist" ON public.shift_handover_checklist

CREATE POLICY "Coordinators can manage shift handover checklist"
  ON public.shift_handover_checklist FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'))

-- operator_goals
DROP POLICY IF EXISTS "Authenticated users can view operator goals" ON public.operator_goals

DROP POLICY IF EXISTS "Anyone can view operator goals" ON public.operator_goals

CREATE POLICY "Authenticated users can view operator goals"
  ON public.operator_goals FOR SELECT TO authenticated USING (true)

-- operator_machines
DROP POLICY IF EXISTS "Authenticated users can view operator machines" ON public.operator_machines

DROP POLICY IF EXISTS "Anyone can view operator machines" ON public.operator_machines

CREATE POLICY "Authenticated users can view operator machines"
  ON public.operator_machines FOR SELECT TO authenticated USING (true)

-- operator_achievements
DROP POLICY IF EXISTS "Authenticated users can manage achievements" ON public.operator_achievements

DROP POLICY IF EXISTS "Coordinators can manage achievements" ON public.operator_achievements

CREATE POLICY "Coordinators can manage achievements"
  ON public.operator_achievements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'))

-- operator_rankings
DROP POLICY IF EXISTS "Authenticated users can manage rankings" ON public.operator_rankings

DROP POLICY IF EXISTS "Coordinators can manage rankings" ON public.operator_rankings

CREATE POLICY "Coordinators can manage rankings"
  ON public.operator_rankings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'))

-- prediction_history
DROP POLICY IF EXISTS "Authenticated users can manage prediction history" ON public.prediction_history

DROP POLICY IF EXISTS "Coordinators can manage prediction history" ON public.prediction_history

CREATE POLICY "Coordinators can manage prediction history"
  ON public.prediction_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'))

-- machine_health_metrics
DROP POLICY IF EXISTS "Authenticated users can view health metrics" ON public.machine_health_metrics

DROP POLICY IF EXISTS "Anyone can view health metrics" ON public.machine_health_metrics

CREATE POLICY "Authenticated users can view health metrics"
  ON public.machine_health_metrics FOR SELECT TO authenticated USING (true)

-- efficiency_alert_history
DROP POLICY IF EXISTS "Authenticated users can view efficiency alert history" ON public.efficiency_alert_history

DROP POLICY IF EXISTS "Anyone can view efficiency alert history" ON public.efficiency_alert_history

CREATE POLICY "Authenticated users can view efficiency alert history"
  ON public.efficiency_alert_history FOR SELECT TO authenticated USING (true)

-- energy_alerts
DROP POLICY IF EXISTS "Authenticated users can view energy alerts" ON public.energy_alerts

DROP POLICY IF EXISTS "Anyone can view energy alerts" ON public.energy_alerts

CREATE POLICY "Authenticated users can view energy alerts"
  ON public.energy_alerts FOR SELECT TO authenticated USING (true)

-- energy_targets
DROP POLICY IF EXISTS "Authenticated users can view energy targets" ON public.energy_targets

DROP POLICY IF EXISTS "Anyone can view energy targets" ON public.energy_targets

CREATE POLICY "Authenticated users can view energy targets"
  ON public.energy_targets FOR SELECT TO authenticated USING (true)

-- Storage: production-photos
DROP POLICY IF EXISTS "Authenticated users can upload production photos" ON storage.objects

CREATE POLICY "Authenticated users can upload production photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'production-photos' AND auth.uid() IS NOT NULL)

DROP POLICY IF EXISTS "Coordinators can delete production photos" ON storage.objects

CREATE POLICY "Coordinators can delete production photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'production-photos' AND public.has_role(auth.uid(), 'coordinator'))
