-- Adicionar campos de aprovação e assinatura em maintenance_records
ALTER TABLE public.maintenance_records 
ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS next_scheduled_date_after_approval TIMESTAMP WITH TIME ZONE

-- Garantir que o status aceite os novos estados
-- Nota: se for uma coluna de texto com check constraint, atualizamos. 
-- Se for apenas texto, tudo bem. No types.ts já estava 'in_progress', 'completed', etc.
-- Vamos adicionar 'pending_approval' e 'approved'.

COMMENT ON COLUMN public.maintenance_records.status IS 'Status da execução: in_progress, completed (aguardando aprovação), approved, cancelled'

-- Criar bucket para assinaturas se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('tpm_signatures', 'tpm_signatures', true)
ON CONFLICT (id) DO NOTHING

-- Políticas para o bucket de assinaturas
CREATE POLICY "Assinaturas são visíveis para todos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'tpm_signatures')

CREATE POLICY "Usuários autenticados podem enviar assinaturas" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'tpm_signatures' AND auth.role() = 'authenticated')
