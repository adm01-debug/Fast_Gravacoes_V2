-- Adicionar coluna de versão aos checklists
ALTER TABLE public.maintenance_checklists 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS technique_id TEXT REFERENCES public.techniques(id)

-- Adicionar referência de versão às execuções
ALTER TABLE public.tpm_executions 
ADD COLUMN IF NOT EXISTS checklist_version INTEGER,
ADD COLUMN IF NOT EXISTS checklist_snapshot JSONB

-- Adicionar configurações de eventos de notificação
ALTER TABLE public.user_notification_settings
ADD COLUMN IF NOT EXISTS event_configs JSONB DEFAULT '{
  "awaiting_correction": {"email": true, "in_app": true},
  "critical_item_approved": {"email": false, "in_app": true}
}'::jsonb

-- Criar índice para busca rápida de modelos por máquina
CREATE INDEX IF NOT EXISTS idx_checklists_technique ON public.maintenance_checklists(technique_id)

-- Comentários para documentação
COMMENT ON COLUMN public.maintenance_checklists.version IS 'Versão incremental do checklist para auditoria histórica.'

COMMENT ON COLUMN public.tpm_executions.checklist_snapshot IS 'Cópia integral do checklist no momento da execução para garantir rastreabilidade.'
