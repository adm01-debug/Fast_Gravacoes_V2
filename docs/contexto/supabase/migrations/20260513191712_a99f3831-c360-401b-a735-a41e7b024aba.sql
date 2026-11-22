CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    rules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Inserir flags iniciais
INSERT INTO public.feature_flags (name, description, is_enabled) VALUES
('mfa_totp_enabled', 'Habilita autenticação de dois fatores via TOTP', true),
('distributed_tracing_enabled', 'Habilita rastreamento distribuído nas edge functions', false),
('ai_scheduling_optimization', 'Habilita sequenciamento inteligente via IA', true)

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY

CREATE POLICY "Flags visíveis por todos autenticados"
ON public.feature_flags FOR SELECT
TO authenticated
USING (true)

CREATE POLICY "Apenas administradores gerenciam flags"
ON public.feature_flags FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'manager'))

-- Tabela de Traces para Observabilidade 10/10
CREATE TABLE public.telemetry_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id TEXT NOT NULL,
    span_id TEXT NOT NULL,
    parent_span_id TEXT,
    name TEXT NOT NULL,
    service_name TEXT NOT NULL,
    duration_ms NUMERIC,
    status TEXT,
    attributes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

ALTER TABLE public.telemetry_traces ENABLE ROW LEVEL SECURITY

CREATE POLICY "Apenas administradores veem traces"
ON public.telemetry_traces FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'))
