-- Tabela para alertas de KPIs críticos
CREATE TABLE IF NOT EXISTS public.kpi_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value FLOAT8 NOT NULL,
    threshold FLOAT8 NOT NULL,
    severity TEXT CHECK (severity IN ('WARNING', 'CRITICAL')),
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Habilitar RLS
ALTER TABLE public.kpi_alerts ENABLE ROW LEVEL SECURITY

-- Políticas de RLS
CREATE POLICY "Admins can view all alerts"
ON public.kpi_alerts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))

-- Função RPC para disparar alertas do backend se necessário
CREATE OR REPLACE FUNCTION public.check_and_notify_kpi_alert(
    p_machine_id UUID,
    p_metric_name TEXT,
    p_metric_value FLOAT8,
    p_threshold FLOAT8,
    p_severity TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.kpi_alerts (machine_id, metric_name, metric_value, threshold, severity)
    VALUES (p_machine_id, p_metric_name, p_metric_value, p_threshold, p_severity);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Trigger para auditar mudanças de status em jobs automaticamente se ainda não existir
CREATE OR REPLACE FUNCTION public.audit_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_log (
            entity_type,
            entity_id,
            action,
            actor_id,
            old_values,
            new_values,
            changed_fields,
            metadata
        ) VALUES (
            'job',
            NEW.id,
            'status_change',
            auth.uid(),
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            ARRAY['status'],
            jsonb_build_object('order_number', NEW.order_number)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Aplicar o trigger na tabela de jobs
DROP TRIGGER IF EXISTS tr_audit_job_status ON public.jobs

CREATE TRIGGER tr_audit_job_status
AFTER UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.audit_job_status_change()
