-- Audit table for Job status and production changes
CREATE TABLE public.job_status_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT,
    old_produced_quantity INTEGER,
    new_produced_quantity INTEGER,
    old_lost_pieces INTEGER,
    new_lost_pieces INTEGER,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Audit table for Machine events
CREATE TABLE public.machine_event_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'activation', 'deactivation', 'status_change'
    old_value TEXT,
    new_value TEXT,
    performed_by UUID REFERENCES auth.users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.job_status_audit ENABLE ROW LEVEL SECURITY

ALTER TABLE public.machine_event_audit ENABLE ROW LEVEL SECURITY

-- Policies for Job Audit (Coordinators and Managers)
CREATE POLICY "Managers and coordinators can view job status audit"
ON public.job_status_audit
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('coordinator', 'manager')
    )
)

-- Policies for Machine Audit (Coordinators and Managers)
CREATE POLICY "Managers and coordinators can view machine event audit"
ON public.machine_event_audit
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('coordinator', 'manager')
    )
)

-- Function to audit job changes
CREATE OR REPLACE FUNCTION public.audit_job_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) OR 
       (OLD.produced_quantity IS DISTINCT FROM NEW.produced_quantity) OR
       (OLD.lost_pieces IS DISTINCT FROM NEW.lost_pieces) THEN
        INSERT INTO public.job_status_audit (
            job_id,
            old_status,
            new_status,
            old_produced_quantity,
            new_produced_quantity,
            old_lost_pieces,
            new_lost_pieces,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            OLD.produced_quantity,
            NEW.produced_quantity,
            OLD.lost_pieces,
            NEW.lost_pieces,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Trigger for job audit
CREATE TRIGGER tr_audit_job_changes
AFTER UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.audit_job_changes()

-- Function to audit machine changes
CREATE OR REPLACE FUNCTION public.audit_machine_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
        INSERT INTO public.machine_event_audit (
            machine_id,
            event_type,
            old_value,
            new_value,
            performed_by
        ) VALUES (
            NEW.id,
            CASE WHEN NEW.is_active THEN 'activation' ELSE 'deactivation' END,
            OLD.is_active::text,
            NEW.is_active::text,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

-- Trigger for machine audit
CREATE TRIGGER tr_audit_machine_changes
AFTER UPDATE ON public.machines
FOR EACH ROW
EXECUTE FUNCTION public.audit_machine_changes()
