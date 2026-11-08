-- Adicionar campos de status e versão para templates (Aprovação Rascunho -> Publicado)
ALTER TABLE public.tpm_notification_templates 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMP WITH TIME ZONE

-- Criar tabela para armazenar as versões publicadas (o que é realmente enviado)
CREATE TABLE IF NOT EXISTS public.tpm_notification_templates_published (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.tpm_notification_templates(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    severity TEXT NOT NULL,
    subject TEXT,
    template_body TEXT NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT now()
)

-- Garantir que os templates atuais estejam marcados como publicados
UPDATE public.tpm_notification_templates SET status = 'published', last_published_at = now()

-- Copiar templates atuais para a tabela de publicados
INSERT INTO public.tpm_notification_templates_published (template_id, channel, severity, subject, template_body)
SELECT id, channel, severity, subject, template_body FROM public.tpm_notification_templates

-- Habilitar RLS para a nova tabela
ALTER TABLE public.tpm_notification_templates_published ENABLE ROW LEVEL SECURITY

CREATE POLICY "Published templates viewable by everyone" ON public.tpm_notification_templates_published FOR SELECT TO authenticated USING (true)

-- Criar função para verificar manutenções e disparar notificações (simulação do Cron)
-- No Lovable/Supabase real, isso seria uma Edge Function cron, aqui preparamos o gatilho
CREATE OR REPLACE FUNCTION public.check_tpm_schedules_notifications()
RETURNS void AS $$
BEGIN
    -- Esta função seria chamada por um cron job a cada X horas
    -- Ela verificaria schedules atrasados ou prestes a vencer e inseriria alertas
    -- que por sua vez disparariam as notificações via hooks/functions
END;
$$ LANGUAGE plpgsql
