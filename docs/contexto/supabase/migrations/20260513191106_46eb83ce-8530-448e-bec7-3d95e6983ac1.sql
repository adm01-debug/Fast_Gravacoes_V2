CREATE TABLE public.business_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
)

-- Inserir valores padrão
INSERT INTO public.business_config (key, value, description) VALUES
('buffer_size', '3', 'Quantidade de jobs prontos mantidos no buffer por técnica'),
('operating_hours', '{"start": "07:00", "end": "18:00", "extended_end": "20:00"}', 'Horário de funcionamento da fábrica'),
('kpi_thresholds', '{"oee_target": 85, "loss_limit": 5}', 'Metas globais de produtividade')

ALTER TABLE public.business_config ENABLE ROW LEVEL SECURITY

CREATE POLICY "Configs são visíveis por todos autenticados"
ON public.business_config FOR SELECT
TO authenticated
USING (true)

CREATE POLICY "Apenas gestores podem atualizar configs"
ON public.business_config FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'))

-- Trigger para updated_at
CREATE TRIGGER tr_update_business_config_timestamp
BEFORE UPDATE ON public.business_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column()
