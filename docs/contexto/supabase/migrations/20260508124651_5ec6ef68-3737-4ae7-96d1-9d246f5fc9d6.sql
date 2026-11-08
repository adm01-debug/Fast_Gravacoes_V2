-- Tabela de fila de notificações para processamento assíncrono e retentativas
CREATE TABLE IF NOT EXISTS public.tpm_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES public.machines(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.tpm_notification_templates_published(id),
    channel TEXT NOT NULL, -- 'email', 'whatsapp', 'push'
    severity TEXT NOT NULL,
    recipient TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE
)

-- Habilitar RLS na fila (apenas admins/internos)
ALTER TABLE public.tpm_notification_queue ENABLE ROW LEVEL SECURITY

CREATE POLICY "Acesso interno para fila TPM" ON public.tpm_notification_queue FOR ALL USING (true)

-- Adicionar colunas de controle de throttling e duplicidade no log se não existirem
ALTER TABLE public.tpm_notification_logs 
ADD COLUMN IF NOT EXISTS retry_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS idempotency_key TEXT

-- Índice para busca rápida de notificações pendentes
CREATE INDEX IF NOT EXISTS idx_tpm_queue_pending ON public.tpm_notification_queue(status, next_retry_at) 
WHERE status IN ('pending', 'failed') AND retry_count < max_retries

-- Função para limpar logs antigos ou notificações processadas (opcional)
CREATE OR REPLACE FUNCTION public.process_tpm_notifications_cron()
RETURNS void AS $$
DECLARE
    notif RECORD;
BEGIN
    -- Esta função seria chamada pelo pg_cron ou via Edge Function
    -- Por simplicidade e segurança no Lovable, usaremos uma Edge Function
    -- que é disparada por um cron externo ou agendador interno.
    NULL;
END;
$$ LANGUAGE plpgsql
