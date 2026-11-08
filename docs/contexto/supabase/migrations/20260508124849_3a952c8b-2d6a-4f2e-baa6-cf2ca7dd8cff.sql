-- Tabela principal de execuções de manutenção
CREATE TABLE IF NOT EXISTS public.tpm_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES public.maintenance_schedules(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES auth.users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'cancelled'
    notes TEXT,
    signature_url TEXT, -- Assinatura digital do técnico/responsável
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Tabela de itens do checklist executados (instância do checklist para a execução)
CREATE TABLE IF NOT EXISTS public.tpm_execution_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES public.tpm_executions(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    is_compliant BOOLEAN DEFAULT false,
    observation TEXT,
    photo_url TEXT, -- Evidência fotográfica por item
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Tabela de peças/componentes trocados durante a execução
CREATE TABLE IF NOT EXISTS public.tpm_execution_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES public.tpm_executions(id) ON DELETE CASCADE,
    part_name TEXT NOT NULL,
    part_code TEXT,
    quantity DECIMAL DEFAULT 1,
    unit TEXT DEFAULT 'un',
    cost DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Adicionar gatilho para atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_tpm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql

CREATE TRIGGER set_tpm_executions_updated_at
BEFORE UPDATE ON public.tpm_executions
FOR EACH ROW
EXECUTE FUNCTION public.handle_tpm_updated_at()

-- Habilitar RLS
ALTER TABLE public.tpm_executions ENABLE ROW LEVEL SECURITY

ALTER TABLE public.tpm_execution_checklist ENABLE ROW LEVEL SECURITY

ALTER TABLE public.tpm_execution_parts ENABLE ROW LEVEL SECURITY

-- Políticas de acesso
CREATE POLICY "Leitura de execuções TPM" ON public.tpm_executions FOR SELECT USING (auth.role() = 'authenticated')

CREATE POLICY "Técnicos gerenciam execuções" ON public.tpm_executions FOR ALL USING (auth.role() = 'authenticated')

CREATE POLICY "Leitura de checklist TPM" ON public.tpm_execution_checklist FOR SELECT USING (auth.role() = 'authenticated')

CREATE POLICY "Técnicos gerenciam checklist" ON public.tpm_execution_checklist FOR ALL USING (auth.role() = 'authenticated')

CREATE POLICY "Leitura de peças TPM" ON public.tpm_execution_parts FOR SELECT USING (auth.role() = 'authenticated')

CREATE POLICY "Técnicos gerenciam peças" ON public.tpm_execution_parts FOR ALL USING (auth.role() = 'authenticated')

-- Bucket de Storage para evidências se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tpm-evidences', 'tpm-evidences', true)
ON CONFLICT (id) DO NOTHING

-- Políticas de Storage para o bucket tpm-evidences
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Evidências públicas' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Evidências públicas" ON storage.objects FOR SELECT USING (bucket_id = 'tpm-evidences');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Upload de evidências TPM' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Upload de evidências TPM" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tpm-evidences');
    END IF;
END $$
