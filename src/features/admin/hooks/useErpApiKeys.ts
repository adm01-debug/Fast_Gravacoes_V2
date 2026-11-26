import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Chaves da API ERP (@see public.erp_api_keys).
 *
 * A tabela guarda apenas o hash SHA-256 da chave — o mesmo valor conferido por
 * `supabase/functions/erp-api` (`hashKey`). A chave crua e gerada no navegador,
 * exibida uma unica vez na criacao e nunca mais recuperavel: quem perdeu a
 * copia precisa revogar e emitir outra.
 */
export interface ErpApiKey {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  created_by: string | null;
}

const ERP_API_KEYS_KEY = ['erp-api-keys'];

/**
 * SHA-256 em hexadecimal. Tem que ser identico ao `hashKey` da edge function
 * `erp-api` (supabase/functions/erp-api/index.ts), senao a chave criada pela
 * tela nao autentica no endpoint.
 */
export const hashErpApiKey = async (rawKey: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

/** Prefixo legivel + 48 caracteres aleatorios (192 bits). */
export const generateErpApiKey = (): string => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const aleatorio = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `fgv_live_${aleatorio}`;
};

export const useErpApiKeys = () => {
  const queryClient = useQueryClient();

  const keysQuery = useQuery({
    queryKey: ERP_API_KEYS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_api_keys')
        .select('id,name,is_active,created_at,last_used_at,created_by')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ErpApiKey[];
    },
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const rawKey = generateErpApiKey();
      const keyHash = await hashErpApiKey(rawKey);
      const { data: sessao } = await supabase.auth.getUser();
      const { error } = await supabase.from('erp_api_keys').insert({
        name,
        key_hash: keyHash,
        is_active: true,
        created_by: sessao?.user?.id ?? null,
      });
      if (error) throw new Error(error.message);
      return rawKey;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ERP_API_KEYS_KEY });
      toast.success('Chave criada. Copie agora — ela não é exibida de novo.');
    },
    onError: (error: Error) => {
      toast.error('Não foi possível criar a chave: ' + error.message);
    },
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('erp_api_keys')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ERP_API_KEYS_KEY });
      toast.success('Chave revogada');
    },
    onError: (error: Error) => {
      toast.error('Não foi possível revogar a chave: ' + error.message);
    },
  });

  const keys = keysQuery.data ?? [];

  return {
    keys,
    ativas: keys.filter((key) => key.is_active).length,
    isLoading: keysQuery.isLoading,
    error: keysQuery.error,
    create,
    revoke,
  };
};