/* eslint-disable react-hooks/immutability -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { createAppError } from '@/lib/errorHandling';
import { edgeFunctionFetch } from '@/lib/edgeFunctionFetch';

interface SyncResult {
  synced?: string[];
  errors?: string[];
  total?: number;
  success?: boolean;
  skipped?: boolean;
  error?: string;
  message?: string;
}

interface OAuthStatus {
  tokenStatus: 'valid' | 'expired' | 'no_tokens';
  tokenExpiry: string | null;
  needsReauthorization: boolean;
  reauthorizationReason: string;
  hasClientCredentials: boolean;
  authorizationUrl: string;
}

interface ClearTokensResult {
  message: string;
}

export const useBitrix24Sync = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [oauthStatus, setOAuthStatus] = useState<OAuthStatus | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const callBitrixSync = useCallback(async <T = SyncResult>(action: string, body?: Record<string, unknown>, retryCount = 0): Promise<T> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    try {
      const response = await edgeFunctionFetch(`bitrix24-sync?action=${action}`, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed');
      }

      return result;
    } catch (error: unknown) {
      // Retry on network errors or 5xx server errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMessage.includes('fetch') ||
                          errorMessage.includes('network') ||
                          errorMessage.includes('timeout') ||
                          errorMessage.includes('500') ||
                          errorMessage.includes('502') ||
                          errorMessage.includes('503') ||
                          errorMessage.includes('504');

      if (isRetryable && retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, retryCount)));
        return callBitrixSync(action, body, retryCount + 1);
      }

      throw error;
    }
  }, []);

  const checkOAuthStatus = useCallback(async (): Promise<OAuthStatus> => {
    setIsLoading(true);
    try {
      const result = await callBitrixSync<OAuthStatus>('oauth-status');
      setOAuthStatus(result);
      return result;
    } catch (error: unknown) {
      toast({
        title: 'Erro ao verificar OAuth',
        description: createAppError(error instanceof Error ? error : new Error(String(error))).message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [callBitrixSync, toast]);

  const clearTokens = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await callBitrixSync<ClearTokensResult>('clear-tokens');
      toast({
        title: 'Tokens removidos',
        description: result.message
      });
      await checkOAuthStatus();
      return result;
    } catch (error: unknown) {
      toast({
        title: 'Erro ao limpar tokens',
        description: createAppError(error instanceof Error ? error : new Error(String(error))).message,
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [callBitrixSync, toast, checkOAuthStatus]);

  const testConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await callBitrixSync('test');
      toast({
        title: 'Conexão OK',
        description: 'Conexão com Bitrix24 estabelecida com sucesso.'
      });
      return result;
    } catch (error: unknown) {
      const rawMsg = error instanceof Error ? error.message : String(error);
      // Check if it's an auth error
      if (rawMsg.includes('invalid_token') || rawMsg.includes('expired')) {
        await checkOAuthStatus();
        toast({
          title: 'Token expirado',
          description: 'Reautorização necessária. Use o botão "Reautorizar" abaixo.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Erro de conexão',
          description: createAppError(error instanceof Error ? error : new Error(rawMsg)).message,
          variant: 'destructive'
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [callBitrixSync, toast, checkOAuthStatus]);

  const pullFromBitrix = useCallback(async (categoryId?: string) => {
    setIsLoading(true);
    try {
      const result = await callBitrixSync('pull', { categoryId });

      setLastSync(new Date());
      queryClient.invalidateQueries({ queryKey: ['jobs'] });

      toast({
        title: 'Sincronização concluída',
        description: `${result.synced?.length || 0} jobs sincronizados do Bitrix24.`
      });

      return result;
    } catch (error: unknown) {
      const rawMsg = error instanceof Error ? error.message : String(error);
      // Check if it's an auth error
      if (rawMsg.includes('invalid_token') || rawMsg.includes('expired') || rawMsg.includes('authentication')) {
        await checkOAuthStatus();
        toast({
          title: 'Token expirado',
          description: 'Reautorização necessária. Use o botão "Reautorizar" abaixo.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Erro na sincronização',
          description: createAppError(error instanceof Error ? error : new Error(rawMsg)).message,
          variant: 'destructive'
        });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [callBitrixSync, toast, queryClient, checkOAuthStatus]);

  const pushToBitrix = useCallback(async (jobId: string, status: string) => {
    try {
      const result = await callBitrixSync('push', { jobId, status });

      if (!result.skipped) {
        toast({
          title: 'Status atualizado',
          description: 'Status sincronizado com Bitrix24.'
        });
      }

      return result;
    } catch (error: unknown) {
      // Don't show error toast for non-Bitrix jobs
      return { error: createAppError(error instanceof Error ? error : new Error(String(error))).message };
    }
  }, [callBitrixSync, toast]);

  return {
    isLoading,
    lastSync,
    oauthStatus,
    testConnection,
    pullFromBitrix,
    pushToBitrix,
    checkOAuthStatus,
    clearTokens
  };
};
