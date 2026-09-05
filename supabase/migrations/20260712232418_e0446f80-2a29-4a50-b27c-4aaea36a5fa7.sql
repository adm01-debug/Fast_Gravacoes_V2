
-- Logs com user_id: bind user_id = auth.uid() OR elevated
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['login_audit','security_events','geo_blocking_logs','rate_limit_logs','query_telemetry','tpm_notification_logs']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can insert audit records', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can insert security events', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can insert geo logs', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can insert rate limit logs', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can insert telemetry', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Logs insertable by system', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Users can insert own log entries', t);
  END LOOP;
END $$;

CREATE POLICY "Users can insert own log entries" ON public.login_audit FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users can insert own log entries" ON public.security_events FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users can insert own log entries" ON public.geo_blocking_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users can insert own log entries" ON public.rate_limit_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users can insert own log entries" ON public.query_telemetry FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users can insert own log entries" ON public.tpm_notification_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

-- Logs sem user_id: apenas papéis elevados
DROP POLICY IF EXISTS "Authenticated can insert sync records" ON public.bitrix24_sync_history;
DROP POLICY IF EXISTS "Authenticated can update sync records" ON public.bitrix24_sync_history;
CREATE POLICY "Elevated can insert sync records" ON public.bitrix24_sync_history FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Elevated can update sync records" ON public.bitrix24_sync_history FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated can insert efficiency alerts" ON public.efficiency_alert_history;
DROP POLICY IF EXISTS "Authenticated can update efficiency alerts" ON public.efficiency_alert_history;
CREATE POLICY "Elevated can insert efficiency alerts" ON public.efficiency_alert_history FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Elevated can update efficiency alerts" ON public.efficiency_alert_history FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated can insert maintenance alerts" ON public.maintenance_alerts;
DROP POLICY IF EXISTS "Authenticated can update maintenance alerts" ON public.maintenance_alerts;
CREATE POLICY "Elevated can insert maintenance alerts" ON public.maintenance_alerts FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Elevated can update maintenance alerts" ON public.maintenance_alerts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

-- push_notifications: only self or elevated
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.push_notifications;
CREATE POLICY "Users can insert own notifications" ON public.push_notifications FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'coordinator') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin'));

-- password_reset_requests: add WITH CHECK
DROP POLICY IF EXISTS "Coordinators and managers can update requests" ON public.password_reset_requests;
CREATE POLICY "Coordinators and managers can update requests"
ON public.password_reset_requests FOR UPDATE TO authenticated
USING (app_private.has_role(auth.uid(),'coordinator') OR app_private.has_role(auth.uid(),'manager'))
WITH CHECK (app_private.has_role(auth.uid(),'coordinator') OR app_private.has_role(auth.uid(),'manager'));
