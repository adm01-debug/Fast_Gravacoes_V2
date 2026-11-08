-- =============================================
-- MASS SECURITY FIX: Restrict public SELECT to authenticated
-- =============================================

-- Helper: Drop old public SELECT, create authenticated SELECT
-- abc_job_costs
DROP POLICY IF EXISTS "Anyone can view job costs" ON public.abc_job_costs

DROP POLICY IF EXISTS "Public can view job costs" ON public.abc_job_costs

CREATE POLICY "Authenticated users can view job costs" ON public.abc_job_costs FOR SELECT TO authenticated USING (true)

-- abc_cost_pools
DROP POLICY IF EXISTS "Anyone can view cost pools" ON public.abc_cost_pools

DROP POLICY IF EXISTS "Public can view cost pools" ON public.abc_cost_pools

CREATE POLICY "Authenticated users can view cost pools" ON public.abc_cost_pools FOR SELECT TO authenticated USING (true)

-- abc_activity_rates
DROP POLICY IF EXISTS "Anyone can view activity rates" ON public.abc_activity_rates

DROP POLICY IF EXISTS "Public can view activity rates" ON public.abc_activity_rates

CREATE POLICY "Authenticated users can view activity rates" ON public.abc_activity_rates FOR SELECT TO authenticated USING (true)

-- abc_activities
DROP POLICY IF EXISTS "Anyone can view activities" ON public.abc_activities

DROP POLICY IF EXISTS "Public can view activities" ON public.abc_activities

CREATE POLICY "Authenticated users can view activities" ON public.abc_activities FOR SELECT TO authenticated USING (true)

-- production_lots
DROP POLICY IF EXISTS "Anyone can view lots" ON public.production_lots

DROP POLICY IF EXISTS "Public can view lots" ON public.production_lots

CREATE POLICY "Authenticated users can view lots" ON public.production_lots FOR SELECT TO authenticated USING (true)

-- lot_components
DROP POLICY IF EXISTS "Anyone can view lot components" ON public.lot_components

DROP POLICY IF EXISTS "Public can view lot components" ON public.lot_components

CREATE POLICY "Authenticated users can view lot components" ON public.lot_components FOR SELECT TO authenticated USING (true)

-- lot_movements
DROP POLICY IF EXISTS "Anyone can view lot movements" ON public.lot_movements

DROP POLICY IF EXISTS "Public can view lot movements" ON public.lot_movements

CREATE POLICY "Authenticated users can view lot movements" ON public.lot_movements FOR SELECT TO authenticated USING (true)

-- lot_quality_inspections
DROP POLICY IF EXISTS "Anyone can view inspections" ON public.lot_quality_inspections

DROP POLICY IF EXISTS "Public can view inspections" ON public.lot_quality_inspections

CREATE POLICY "Authenticated users can view inspections" ON public.lot_quality_inspections FOR SELECT TO authenticated USING (true)

-- energy_consumption
DROP POLICY IF EXISTS "Anyone can view energy consumption" ON public.energy_consumption

DROP POLICY IF EXISTS "Public can view energy consumption" ON public.energy_consumption

CREATE POLICY "Authenticated users can view energy consumption" ON public.energy_consumption FOR SELECT TO authenticated USING (true)

-- shift_handovers
DROP POLICY IF EXISTS "Anyone can view handovers" ON public.shift_handovers

DROP POLICY IF EXISTS "Public can view handovers" ON public.shift_handovers

CREATE POLICY "Authenticated users can view handovers" ON public.shift_handovers FOR SELECT TO authenticated USING (true)

-- shift_occurrences
DROP POLICY IF EXISTS "Anyone can view occurrences" ON public.shift_occurrences

DROP POLICY IF EXISTS "Public can view occurrences" ON public.shift_occurrences

CREATE POLICY "Authenticated users can view occurrences" ON public.shift_occurrences FOR SELECT TO authenticated USING (true)

-- efficiency_alert_history
DROP POLICY IF EXISTS "Anyone can view efficiency alerts" ON public.efficiency_alert_history

DROP POLICY IF EXISTS "Public can view efficiency alerts" ON public.efficiency_alert_history

CREATE POLICY "Authenticated users can view efficiency alerts" ON public.efficiency_alert_history FOR SELECT TO authenticated USING (true)

-- operator_rankings
DROP POLICY IF EXISTS "Anyone can view rankings" ON public.operator_rankings

DROP POLICY IF EXISTS "Public can view rankings" ON public.operator_rankings

CREATE POLICY "Authenticated users can view rankings" ON public.operator_rankings FOR SELECT TO authenticated USING (true)

-- operator_goals
DROP POLICY IF EXISTS "Anyone can view goals" ON public.operator_goals

DROP POLICY IF EXISTS "Public can view goals" ON public.operator_goals

CREATE POLICY "Authenticated users can view goals" ON public.operator_goals FOR SELECT TO authenticated USING (true)

-- operator_achievements
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.operator_achievements

DROP POLICY IF EXISTS "Public can view achievements" ON public.operator_achievements

CREATE POLICY "Authenticated users can view achievements" ON public.operator_achievements FOR SELECT TO authenticated USING (true)

-- machine_predictions
DROP POLICY IF EXISTS "Anyone can view predictions" ON public.machine_predictions

DROP POLICY IF EXISTS "Public can view predictions" ON public.machine_predictions

CREATE POLICY "Authenticated users can view predictions" ON public.machine_predictions FOR SELECT TO authenticated USING (true)

-- prediction_history
DROP POLICY IF EXISTS "Anyone can view prediction history" ON public.prediction_history

DROP POLICY IF EXISTS "Public can view prediction history" ON public.prediction_history

CREATE POLICY "Authenticated users can view prediction history" ON public.prediction_history FOR SELECT TO authenticated USING (true)

-- maintenance_schedules
DROP POLICY IF EXISTS "Anyone can view schedules" ON public.maintenance_schedules

DROP POLICY IF EXISTS "Public can view schedules" ON public.maintenance_schedules

CREATE POLICY "Authenticated users can view schedules" ON public.maintenance_schedules FOR SELECT TO authenticated USING (true)

-- spc_measurements
DROP POLICY IF EXISTS "Anyone can view measurements" ON public.spc_measurements

DROP POLICY IF EXISTS "Public can view measurements" ON public.spc_measurements

CREATE POLICY "Authenticated users can view measurements" ON public.spc_measurements FOR SELECT TO authenticated USING (true)

-- spc_alerts
DROP POLICY IF EXISTS "Anyone can view spc alerts" ON public.spc_alerts

DROP POLICY IF EXISTS "Public can view spc alerts" ON public.spc_alerts

CREATE POLICY "Authenticated users can view spc alerts" ON public.spc_alerts FOR SELECT TO authenticated USING (true)

-- daily_summaries
DROP POLICY IF EXISTS "Anyone can view summaries" ON public.daily_summaries

DROP POLICY IF EXISTS "Public can view summaries" ON public.daily_summaries

CREATE POLICY "Authenticated users can view summaries" ON public.daily_summaries FOR SELECT TO authenticated USING (true)

-- user_roles: restrict to authenticated
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id)

DROP POLICY IF EXISTS "Coordinators can manage roles" ON public.user_roles

CREATE POLICY "Coordinators can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'coordinator'))

-- webauthn_challenges: ensure only authenticated owner access
DROP POLICY IF EXISTS "Users can manage own challenges" ON public.webauthn_challenges

CREATE POLICY "Users can manage own challenges" ON public.webauthn_challenges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

-- Storage: Add UPDATE policy for technical-documents
CREATE POLICY "Coordinators can update technical documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'technical-documents' AND (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'manager')))
