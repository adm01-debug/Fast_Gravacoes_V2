import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createAppError } from '@/lib/errorHandling';
import { defaultQueryOptions, STALE_TIMES } from '@/lib/queryConfig';

export interface TechnicalDocument {
  id: string;
  technical_sheet_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  version: number;
  is_current: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  technical_sheets?: { id: string; title: string };
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  file_url: string;
  file_name: string;
  file_size: number;
  change_notes: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export const useDocuments = (technicalSheetId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents
  const documentsQuery = useQuery({
    queryKey: ['technical-documents', technicalSheetId],
    queryFn: async () => {
      let query = supabase
        .from('technical_documents')
        .select(`
          *,
          technical_sheets (id, title)
        `)
        .eq('is_current', true)
        .order('created_at', { ascending: false });

      if (technicalSheetId) {
        query = query.eq('technical_sheet_id', technicalSheetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TechnicalDocument[];
    },
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  // Upload document
  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      title,
      description,
      technicalSheetId: sheetId,
    }: {
      file: File;
      title: string;
      description?: string;
      technicalSheetId?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('technical-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('technical-documents')
        .getPublicUrl(filePath);

      // Insert document record
      const { data, error } = await supabase
        .from('technical_documents')
        .insert([{
          title,
          description: description || null,
          technical_sheet_id: sheetId || null,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          version: 1,
          is_current: true,
          status: 'pending',
          uploaded_by: userData.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-documents'] });
      toast({ title: 'Documento enviado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar documento',
        description: createAppError(error).message,
        variant: 'destructive'
      });
    },
  });

  // Create new version
  const createVersion = useMutation({
    mutationFn: async ({
      documentId,
      file,
      changeNotes,
    }: {
      documentId: string;
      file: File;
      changeNotes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();

      // Get current document
      const { data: currentDoc, error: fetchError } = await supabase
        .from('technical_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Save old version to history
      const { error: historyError } = await supabase
        .from('document_versions')
        .insert([{
          document_id: documentId,
          version: currentDoc.version,
          file_url: currentDoc.file_url,
          file_name: currentDoc.file_name,
          file_size: currentDoc.file_size,
          change_notes: changeNotes || null,
          uploaded_by: currentDoc.uploaded_by,
        }]);

      if (historyError) throw historyError;

      // Upload new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('technical-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('technical-documents')
        .getPublicUrl(filePath);

      // Update document with new version
      const { data, error } = await supabase
        .from('technical_documents')
        .update({
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          version: currentDoc.version + 1,
          status: 'pending',
          uploaded_by: userData.user?.id,
          approved_by: null,
          approved_at: null,
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-versions'] });
      toast({ title: 'Nova versão criada!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar versão',
        description: createAppError(error).message,
        variant: 'destructive'
      });
    },
  });

  // Approve document
  const approveDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('technical_documents')
        .update({
          status: 'approved',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-documents'] });
      toast({ title: 'Documento aprovado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao aprovar documento', description: createAppError(error).message, variant: 'destructive' });
    },
  });

  // Reject document
  const rejectDocument = useMutation({
    mutationFn: async ({
      documentId,
      reason,
    }: {
      documentId: string;
      reason: string;
    }) => {
      const { error } = await supabase
        .from('technical_documents')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-documents'] });
      toast({ title: 'Documento rejeitado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao rejeitar documento', description: createAppError(error).message, variant: 'destructive' });
    },
  });

  // Delete document
  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('technical_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-documents'] });
      toast({ title: 'Documento removido!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover documento', description: createAppError(error).message, variant: 'destructive' });
    },
  });

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    uploadDocument,
    createVersion,
    approveDocument,
    rejectDocument,
    deleteDocument,
  };
};

export const useDocumentVersions = (documentId: string | null) => {
  return useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: async () => {
      if (!documentId) return [];

      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version', { ascending: false });

      if (error) throw error;
      return data as DocumentVersion[];
    },
    enabled: !!documentId,
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });
};
