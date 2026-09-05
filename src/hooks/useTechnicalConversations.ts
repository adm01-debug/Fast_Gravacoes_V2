import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import { showErrorToast, createAppError, createMutationErrorHandler } from '@/lib/errorHandling';
import { logger } from '@/lib/logger';
import { defaultQueryOptions, STALE_TIMES } from '@/lib/queryConfig';

const CONVERSATIONS_ERROR_CONTEXT = {
  conversations: { entity: 'technical_conversations', operation: 'fetch' },
  messages: { entity: 'technical_messages', operation: 'fetch' },
  createConversation: { entity: 'technical_conversations', operation: 'create' },
  updateTitle: { entity: 'technical_conversations', operation: 'update_title' },
  deleteConversation: { entity: 'technical_conversations', operation: 'delete' },
  addMessage: { entity: 'technical_messages', operation: 'create' },
};

export interface TechnicalConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface TechnicalMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const useTechnicalConversations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['technical-conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        const { data, error } = await supabase
          .from('technical_conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        return data as TechnicalConversation[];
      } catch (error) {
        const appError = createAppError(error, CONVERSATIONS_ERROR_CONTEXT.conversations);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.USER,
    ...defaultQueryOptions,
  });

  // Realtime subscription for conversations
  useRealtimeChannel('technical-conversations-changes', [{ table: 'technical_conversations' }], () => {
    queryClient.invalidateQueries({ queryKey: ['technical-conversations'] });
  });

  const createConversation = useMutation({
    mutationFn: async (title?: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        const { data, error } = await supabase
          .from('technical_conversations')
          .insert([{
            user_id: user.id,
            title: title || 'Nova conversa'
          }])
          .select()
          .single();

        if (error) throw error;
        return data as TechnicalConversation;
      } catch (error) {
        const appError = createAppError(error, CONVERSATIONS_ERROR_CONTEXT.createConversation);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-conversations'] });
    },
    onError: createMutationErrorHandler('Erro ao criar conversa'),
  });

  const updateConversationTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      try {
        const { data, error } = await supabase
          .from('technical_conversations')
          .update({ title })
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Conversa não encontrada');
        return data;
      } catch (error) {
        const appError = createAppError(error, CONVERSATIONS_ERROR_CONTEXT.updateTitle);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-conversations'] });
    },
    onError: createMutationErrorHandler('Erro ao atualizar título'),
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await supabase
          .from('technical_conversations')
          .delete()
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        const appError = createAppError(error, CONVERSATIONS_ERROR_CONTEXT.deleteConversation);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-conversations'] });
    },
    onError: createMutationErrorHandler('Erro ao excluir conversa'),
  });

  return {
    conversations,
    isLoading,
    createConversation,
    updateConversationTitle,
    deleteConversation
  };
};

export const useTechnicalMessages = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['technical-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      try {
        const { data, error } = await supabase
          .from('technical_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data as TechnicalMessage[];
      } catch (error) {
        const appError = createAppError(error, CONVERSATIONS_ERROR_CONTEXT.messages);
        throw error;
      }
    },
    enabled: !!conversationId,
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  const addMessage = useMutation({
    mutationFn: async ({ role, content }: { role: 'user' | 'assistant'; content: string }) => {
      if (!conversationId) throw new Error('No conversation selected');

      try {
        const { data, error } = await supabase
          .from('technical_messages')
          .insert([{
            conversation_id: conversationId,
            role,
            content
          }])
          .select()
          .single();

        if (error) throw error;

        // Update conversation's updated_at (fire and forget, don't block on error)
        supabase
          .from('technical_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId)
          .then(({ error: updateError }) => {
            if (updateError) {
              logger.warn('Falha ao atualizar updated_at da conversa', updateError, 'useTechnicalConversations');
            }
          });

        return data as TechnicalMessage;
      } catch (error) {
        const appError = createAppError(error, CONVERSATIONS_ERROR_CONTEXT.addMessage);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['technical-conversations'] });
    },
    onError: createMutationErrorHandler('Erro ao enviar mensagem'),
  });

  return {
    messages,
    isLoading,
    addMessage
  };
};
