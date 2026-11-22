-- Adicionar coluna de turno e tipo de perda em production_losses
ALTER TABLE public.production_losses ADD COLUMN IF NOT EXISTS shift TEXT

ALTER TABLE public.production_losses ADD COLUMN IF NOT EXISTS loss_type TEXT DEFAULT 'availability' CHECK (loss_type IN ('availability', 'performance', 'quality'))

-- Criar tabela para presets de filtros do dashboard
CREATE TABLE IF NOT EXISTS public.dashboard_presets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dashboard_id TEXT NOT NULL, -- e.g., 'oee', 'executive'
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Ativar RLS
ALTER TABLE public.dashboard_presets ENABLE ROW LEVEL SECURITY

-- Políticas de acesso
CREATE POLICY "Users can view their own presets" 
ON public.dashboard_presets 
FOR SELECT 
USING (auth.uid() = user_id)

CREATE POLICY "Users can create their own presets" 
ON public.dashboard_presets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id)

CREATE POLICY "Users can update their own presets" 
ON public.dashboard_presets 
FOR UPDATE 
USING (auth.uid() = user_id)

CREATE POLICY "Users can delete their own presets" 
ON public.dashboard_presets 
FOR DELETE 
USING (auth.uid() = user_id)

-- Trigger para updated_at
CREATE TRIGGER update_dashboard_presets_updated_at
BEFORE UPDATE ON public.dashboard_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column()
