-- Tabela para documentos técnicos com versionamento
CREATE TABLE IF NOT EXISTS public.technical_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technical_sheet_id UUID REFERENCES public.technical_sheets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL DEFAULT 'application/pdf',
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Histórico de versões
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.technical_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  change_notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Trigger para updated_at
CREATE TRIGGER update_technical_documents_updated_at
  BEFORE UPDATE ON public.technical_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column()

-- Enable RLS
ALTER TABLE public.technical_documents ENABLE ROW LEVEL SECURITY

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY

-- Políticas RLS para technical_documents
CREATE POLICY "Anyone can view approved documents" 
  ON public.technical_documents 
  FOR SELECT 
  USING (status = 'approved' OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))

CREATE POLICY "Coordinators can manage documents" 
  ON public.technical_documents 
  FOR ALL 
  USING (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))

-- Políticas RLS para document_versions
CREATE POLICY "Anyone can view versions of approved documents" 
  ON public.document_versions 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM technical_documents td 
    WHERE td.id = document_id 
    AND (td.status = 'approved' OR has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  ))

CREATE POLICY "Coordinators can manage versions" 
  ON public.document_versions 
  FOR ALL 
  USING (has_role(auth.uid(), 'coordinator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role))

-- Storage bucket para documentos técnicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'technical-documents', 
  'technical-documents', 
  true,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING

-- Storage policies
CREATE POLICY "Anyone can view technical documents" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'technical-documents')

CREATE POLICY "Authenticated users can upload technical documents" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'technical-documents' AND auth.uid() IS NOT NULL)

CREATE POLICY "Coordinators can delete technical documents" 
  ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'technical-documents' AND has_role(auth.uid(), 'coordinator'::app_role))
