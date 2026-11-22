-- Fix search_path for linter warnings
ALTER FUNCTION public.validate_stock_before_movement() SET search_path = public

ALTER FUNCTION public.log_job_status_change() SET search_path = public

ALTER FUNCTION public.check_and_notify_kpi_alert(uuid, text, double precision, double precision, text) SET search_path = public

ALTER FUNCTION public.audit_machine_changes() SET search_path = public

ALTER FUNCTION public.audit_job_changes() SET search_path = public

ALTER FUNCTION public.rollback_inventory_stock() SET search_path = public

-- Fix telemetry_traces RLS
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'telemetry_traces' 
        AND policyname = 'Authenticated users can insert traces'
    ) THEN
        CREATE POLICY "Authenticated users can insert traces" 
        ON public.telemetry_traces 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (true);
    END IF;
END $$

-- Add permissions for admin role
INSERT INTO public.role_permissions (role, permission, resource, action)
VALUES 
  ('admin', 'admin:all', 'admin', 'all'),
  ('admin', 'jobs:all', 'jobs', 'all'),
  ('admin', 'production:all', 'production', 'all'),
  ('admin', 'operators:all', 'operators', 'all'),
  ('admin', 'telemetry:view', 'admin', 'view'),
  ('admin', 'settings:manage', 'settings', 'manage')
ON CONFLICT (role, permission) DO NOTHING
