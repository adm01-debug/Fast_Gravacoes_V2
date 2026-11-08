-- 1. Insert default OEE/KPI thresholds if they don't exist
INSERT INTO public.business_config (key, value, description)
VALUES 
  ('oee_threshold_warning', '65', 'OEE percentage below which a warning alert is triggered'),
  ('oee_threshold_critical', '50', 'OEE percentage below which a critical alert is triggered'),
  ('availability_threshold_warning', '70', 'Availability percentage below which a warning alert is triggered'),
  ('performance_threshold_warning', '75', 'Performance percentage below which a warning alert is triggered')
ON CONFLICT (key) DO NOTHING

-- 2. Create function to log job status changes automatically to audit_log
CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS TRIGGER AS $$
DECLARE
    actor_id UUID;
BEGIN
    -- Try to get current user ID from metadata or auth.uid()
    actor_id := auth.uid();

    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_log (
            entity_type,
            entity_id,
            action,
            old_values,
            new_values,
            actor_id,
            metadata
        ) VALUES (
            'job',
            NEW.id,
            'status_change',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            actor_id,
            jsonb_build_object(
                'job_code', NEW.code,
                'client', NEW.client,
                'product', NEW.product
            )
        );

        -- Also create a notification for relevant users (this is a simple version, 
        -- usually we would target specific roles or the job creator)
        -- For now, we notify the actor if they are not the one who changed it (realtime sync)
        -- Or just create a system notification record
        INSERT INTO public.push_notifications (
            user_id,
            title,
            body,
            status,
            data
        )
        SELECT 
            p.user_id,
            'Status de Job Alterado',
            format('O job %s (%s) mudou de %s para %s', NEW.code, NEW.client, OLD.status, NEW.status),
            'pending',
            jsonb_build_object(
                'type', 'job_status_update',
                'job_id', NEW.id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'severity', 'info'
            )
        FROM public.user_roles p -- Simple way to broadcast to admins/managers
        WHERE p.role IN ('admin', 'manager');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- 3. Create trigger for job status changes
DROP TRIGGER IF EXISTS trigger_log_job_status_change ON public.jobs

CREATE TRIGGER trigger_log_job_status_change
AFTER UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.log_job_status_change()

-- 4. Create function to handle OEE/KPI alerts (to be called by edge functions or app logic)
CREATE OR REPLACE FUNCTION public.check_and_notify_kpi_alert(
    p_machine_id UUID,
    p_metric_name TEXT,
    p_metric_value FLOAT,
    p_threshold FLOAT,
    p_severity TEXT
)
RETURNS VOID AS $$
DECLARE
    v_machine_name TEXT;
BEGIN
    SELECT name INTO v_machine_name FROM public.machines WHERE id = p_machine_id;

    INSERT INTO public.push_notifications (
        user_id,
        title,
        body,
        status,
        data
    )
    SELECT 
        p.user_id,
        format('Alerta de %s: %s', p_severity, v_machine_name),
        format('A métrica %s atingiu %.1f%% (Limite: %.1f%%)', p_metric_name, p_metric_value, p_threshold),
        'pending',
        jsonb_build_object(
            'type', 'kpi_alert',
            'machine_id', p_machine_id,
            'metric', p_metric_name,
            'value', p_metric_value,
            'threshold', p_threshold,
            'severity', p_severity,
            'source', 'bi_engine'
        )
    FROM public.user_roles p
    WHERE p.role IN ('admin', 'manager', 'operator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
