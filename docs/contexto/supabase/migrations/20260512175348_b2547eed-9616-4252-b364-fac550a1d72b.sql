-- 1. Detalhamento de Perdas de Produção
CREATE TABLE IF NOT EXISTS public.production_losses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    operator_id UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

ALTER TABLE public.production_losses ENABLE ROW LEVEL SECURITY

CREATE POLICY "Production losses viewable by everyone" ON public.production_losses FOR SELECT USING (true)

CREATE POLICY "Operators can insert losses" ON public.production_losses FOR INSERT WITH CHECK (auth.role() = 'authenticated')

-- 2. Registro de Paradas de Máquina (Downtime) para OEE
CREATE TABLE IF NOT EXISTS public.machine_downtime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id),
    downtime_type TEXT NOT NULL CHECK (downtime_type IN ('setup', 'maintenance', 'breakdown', 'idle', 'other')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    reason TEXT,
    operator_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

ALTER TABLE public.machine_downtime ENABLE ROW LEVEL SECURITY

CREATE POLICY "Downtime viewable by everyone" ON public.machine_downtime FOR SELECT USING (true)

CREATE POLICY "Operators can manage downtime" ON public.machine_downtime FOR ALL USING (auth.role() = 'authenticated')

-- 3. Histórico de Status de Jobs (para auditoria de fluxo)
CREATE TABLE IF NOT EXISTS public.job_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY

CREATE POLICY "Status history viewable by everyone" ON public.job_status_history FOR SELECT USING (true)

-- 4. Trigger para Auditoria de Status de Jobs
CREATE OR REPLACE FUNCTION public.audit_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.job_status_history (job_id, previous_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql

DROP TRIGGER IF EXISTS tr_audit_job_status ON public.jobs

CREATE TRIGGER tr_audit_job_status
AFTER UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.audit_job_status_change()
