import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Contas e IPs bloqueados por tentativas de login (@@see public.login_lockouts).
 *
 * A tabela e service_role only: o app nao tem SELECT nela, por isso a leitura
 * e a liberacao passam pelas RPCs `list_login_lockouts` / `release_login_lockout`,
 * ambas com checagem de papel (admin ou manager) no banco.
 */
export interface LoginLockout {
  id: string;
  identifier: string;
  identifier_type: string;
  failed_attempts: number;
  last_failed_at: string | null;
  locked_until: string | null;
  lockout_count: number;
}

export interface LoginLockoutRow extends LoginLockout {
  /** Calculado na consulta: `locked_until` ainda no futuro. */
  is_active: boolean;
}

type RpcResult<T> = { data: T | null; error: { message: string } | null };
const callRpc = supabase.rpc as unknown as <T>(
  fn: string,
  args: Record<string, unknown>,
) => Promise<RpcResult<T>>;

const LOGIN_LOCKOUTS_KEY = ['login-lockouts'];

export const useLoginLockouts = (limit = 50) => {
  const queryClient = useQueryClient();

  const lockoutsQuery = useQuery({
    queryKey: [...LOGIN_LOCKOUTS_KEY, limit],
    queryFn: async () => {
      const { data, error } = await callRpc<LoginLockoutRow[]>('list_login_lockouts', { p_limit: limit });
      if (error) throw new Error(error.message);
      // `is_active` e resolvido aqui (fora do render) para o componente nao
      // precisar ler o relogio durante a renderizacao.
      const agora = Date.now();
      return (data ?? []).map((lockout) => ({
        ...lockout,
        is_active:
          lockout.locked_until !== null && new Date(lockout.locked_until).getTime() > agora,
      }));
    },
    staleTime: 30_000,
  });

  const release = useMutation({
    mutationFn: async (lockout: Pick<LoginLockout, 'identifier' | 'identifier_type'>) => {
      const { data, error } = await callRpc<boolean>('release_login_lockout', {
        p_identifier: lockout.identifier,
        p_identifier_type: lockout.identifier_type,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error('registro de bloqueio nao encontrado');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LOGIN_LOCKOUTS_KEY });
      toast.success('Bloqueio liberado');
    },
    onError: (error: Error) => {
      toast.error('Não foi possível liberar o bloqueio: ' + error.message);
    },
  });

  const lockouts = lockoutsQuery.data ?? [];
  const ativos = lockouts.filter((l) => l.is_active).length;

  return {
    lockouts,
    ativos,
    isLoading: lockoutsQuery.isLoading,
    error: lockoutsQuery.error,
    release,
  };
};
