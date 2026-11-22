-- Tabela de auditoria para execuções TPM
CREATE TABLE IF NOT EXISTS public.tpm_execution_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES public.maintenance_records(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES auth.users(id),
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Habilitar RLS
ALTER TABLE public.tpm_execution_audit_logs ENABLE ROW LEVEL SECURITY

-- Políticas de acesso
CREATE POLICY "Audit logs are viewable by authenticated users" 
ON public.tpm_execution_audit_logs FOR SELECT 
USING (auth.role() = 'authenticated')

-- Trigger para log de auditoria automático em maintenance_records
CREATE OR REPLACE FUNCTION public.audit_tpm_execution_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.notes IS DISTINCT FROM NEW.notes) THEN
        INSERT INTO public.tpm_execution_audit_logs (execution_id, changed_by, field_name, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'notes', OLD.notes, NEW.notes);
    END IF;
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.tpm_execution_audit_logs (execution_id, changed_by, field_name, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status);
    END IF;
    -- Adicionar outros campos conforme necessário
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER

CREATE TRIGGER trigger_audit_tpm_execution
AFTER UPDATE ON public.maintenance_records
FOR EACH ROW
EXECUTE FUNCTION public.audit_tpm_execution_changes()
