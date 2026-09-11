-- ================================================
-- 1. FIX CRITICAL: has_role() must check is_active
-- ================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

-- ================================================
-- 2. FIX CRITICAL: email_verification_tokens - restrict to authenticated
-- ================================================
DROP POLICY IF EXISTS "System can manage verification tokens" ON public.email_verification_tokens;
CREATE POLICY "Authenticated users manage own tokens" ON public.email_verification_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================
-- 3. FIX CRITICAL: webauthn_challenges - restrict to authenticated
-- ================================================
DROP POLICY IF EXISTS "System can manage challenges" ON public.webauthn_challenges;
CREATE POLICY "Authenticated users manage own challenges" ON public.webauthn_challenges
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================
-- 4. FIX CRITICAL: machines - restrict writes to coordinators
-- ================================================
DROP POLICY IF EXISTS "Authenticated users can manage machines" ON public.machines;
CREATE POLICY "Coordinators can manage machines" ON public.machines
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role));

-- ================================================
-- 5. FIX CRITICAL: techniques - restrict writes to coordinators
-- ================================================
DROP POLICY IF EXISTS "Authenticated users can manage techniques" ON public.techniques;
CREATE POLICY "Coordinators can manage techniques" ON public.techniques
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role));

-- ================================================
-- 6. FIX CRITICAL: bitrix24_field_mappings - restrict to coordinators
-- ================================================
DROP POLICY IF EXISTS "Authenticated users can manage mappings" ON public.bitrix24_field_mappings;
CREATE POLICY "Coordinators can manage mappings" ON public.bitrix24_field_mappings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role));

-- ================================================
-- 7. FIX: geo_blocking_settings - restrict SELECT to coordinators/managers.
-- A tabela só existe em alguns ambientes legados; uma migration precisa poder
-- construir um banco limpo sem assumir objetos criados fora deste histórico.
-- ================================================
DO $$
BEGIN
  IF to_regclass('public.geo_blocking_settings') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view geo settings" ON public.geo_blocking_settings';
    EXECUTE 'CREATE POLICY "Coordinators and managers can view geo settings" ON public.geo_blocking_settings
      FOR SELECT TO authenticated
      USING (has_role(auth.uid(), ''coordinator''::app_role) OR has_role(auth.uid(), ''manager''::app_role))';
  END IF;
END
$$;

-- ================================================
-- 8. FIX: geo_blocking_rules - restrict SELECT to coordinators/managers
-- ================================================
DO $$
BEGIN
  IF to_regclass('public.geo_blocking_rules') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can view geo blocking rules" ON public.geo_blocking_rules';
    EXECUTE 'CREATE POLICY "Coordinators and managers can view geo blocking rules" ON public.geo_blocking_rules
      FOR SELECT TO authenticated
      USING (has_role(auth.uid(), ''coordinator''::app_role) OR has_role(auth.uid(), ''manager''::app_role))';
  END IF;
END
$$;

-- ================================================
-- 9. FIX: role_permissions - restrict SELECT to authenticated
-- ================================================
DROP POLICY IF EXISTS "Anyone can view permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can view permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

-- ================================================
-- 10. FIX: operational tables - require authentication for writes
-- ================================================

-- daily_summaries
DROP POLICY IF EXISTS "System can manage summaries" ON public.daily_summaries;
CREATE POLICY "Coordinators can manage summaries" ON public.daily_summaries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- machine_health_metrics
DROP POLICY IF EXISTS "System can manage health metrics" ON public.machine_health_metrics;
CREATE POLICY "Authenticated users can manage health metrics" ON public.machine_health_metrics
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- machine_predictions
DROP POLICY IF EXISTS "System can manage predictions" ON public.machine_predictions;
CREATE POLICY "Authenticated users can manage predictions" ON public.machine_predictions
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- prediction_history
DROP POLICY IF EXISTS "System can manage prediction history" ON public.prediction_history;
CREATE POLICY "Authenticated users can manage prediction history" ON public.prediction_history
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- operator_rankings
DROP POLICY IF EXISTS "System can manage rankings" ON public.operator_rankings;
CREATE POLICY "Authenticated users can manage rankings" ON public.operator_rankings
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- operator_achievements
DROP POLICY IF EXISTS "System can manage achievements" ON public.operator_achievements;
CREATE POLICY "Authenticated users can manage achievements" ON public.operator_achievements
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- energy_alerts
DROP POLICY IF EXISTS "System can manage energy alerts" ON public.energy_alerts;
CREATE POLICY "Authenticated users can manage energy alerts" ON public.energy_alerts
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- spc_capability_history
DROP POLICY IF EXISTS "System can manage capability history" ON public.spc_capability_history;
CREATE POLICY "Authenticated users can manage capability history" ON public.spc_capability_history
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- efficiency_alert_history
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.efficiency_alert_history;
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.efficiency_alert_history;
CREATE POLICY "Authenticated can insert efficiency alerts" ON public.efficiency_alert_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update efficiency alerts" ON public.efficiency_alert_history
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- maintenance_alerts
DROP POLICY IF EXISTS "System can insert maintenance alerts" ON public.maintenance_alerts;
DROP POLICY IF EXISTS "Authenticated users can update maintenance alerts" ON public.maintenance_alerts;
CREATE POLICY "Authenticated can insert maintenance alerts" ON public.maintenance_alerts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update maintenance alerts" ON public.maintenance_alerts
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- maintenance_item_responses
DROP POLICY IF EXISTS "Authenticated users can manage item responses" ON public.maintenance_item_responses;
CREATE POLICY "Authenticated can manage item responses" ON public.maintenance_item_responses
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- maintenance_records (insert + update)
DROP POLICY IF EXISTS "Authenticated users can insert maintenance records" ON public.maintenance_records;
DROP POLICY IF EXISTS "Authenticated users can update maintenance records" ON public.maintenance_records;
CREATE POLICY "Authenticated can insert maintenance records" ON public.maintenance_records
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update maintenance records" ON public.maintenance_records
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- bitrix24_sync_history
DROP POLICY IF EXISTS "System can insert sync records" ON public.bitrix24_sync_history;
DROP POLICY IF EXISTS "System can update sync records" ON public.bitrix24_sync_history;
CREATE POLICY "Authenticated can insert sync records" ON public.bitrix24_sync_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update sync records" ON public.bitrix24_sync_history
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- security_events
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;
CREATE POLICY "Authenticated can insert security events" ON public.security_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- geo_blocking_logs
DO $$
BEGIN
  IF to_regclass('public.geo_blocking_logs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "System can insert geo logs" ON public.geo_blocking_logs';
    EXECUTE 'CREATE POLICY "Authenticated can insert geo logs" ON public.geo_blocking_logs
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END
$$;

-- rate_limit_logs
DROP POLICY IF EXISTS "System can insert rate limit logs" ON public.rate_limit_logs;
CREATE POLICY "Authenticated can insert rate limit logs" ON public.rate_limit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- push_notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.push_notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.push_notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- new_device_alerts
DROP POLICY IF EXISTS "System can insert alerts" ON public.new_device_alerts;
DROP POLICY IF EXISTS "System can update alerts" ON public.new_device_alerts;
CREATE POLICY "Authenticated can insert device alerts" ON public.new_device_alerts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated can update device alerts" ON public.new_device_alerts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- user_devices
DROP POLICY IF EXISTS "System can insert devices" ON public.user_devices;
DROP POLICY IF EXISTS "System can update devices" ON public.user_devices;
CREATE POLICY "Authenticated can insert own devices" ON public.user_devices
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated can update own devices" ON public.user_devices
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- login_audit
DROP POLICY IF EXISTS "System can insert audit records" ON public.login_audit;
CREATE POLICY "Authenticated can insert audit records" ON public.login_audit
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
