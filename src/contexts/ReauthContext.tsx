import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';

type SensitiveAction =
  | 'change_password'
  | 'change_email'
  | 'configure_mfa'
  | 'disable_mfa'
  | 'admin_action'
  | 'delete_account'
  | 'manage_users'
  | 'security_settings';

interface ReauthContextType {
  requireReauth: (action: SensitiveAction, onSuccess: () => void) => void;
  isReauthenticated: boolean;
  lastReauthAt: Date | null;
}

const ReauthContext = createContext<ReauthContextType | undefined>(undefined);

const REAUTH_VALIDITY_MINUTES = 5; // Re-auth valid for 5 minutes

/**
 * Confere a senha em um cliente Supabase descartável.
 *
 * Usar o cliente compartilhado (`supabase.auth.signInWithPassword`) trocaria a
 * sessão atual — que pode estar em AAL2 (2FA concluído) — por uma sessão AAL1
 * recém-criada. As políticas de escrita de papéis exigem AAL2
 * (`20260910120000_user_roles_writes_require_aal2.sql`), então a alteração
 * seguinte seria recusada pelo banco. O cliente de verificação fica só em
 * memória (`persistSession: false`) e é descartado no `finally`.
 */
async function verifyPassword(email: string, password: string, expectedUserId: string): Promise<void> {
  const verifier = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );

  try {
    const { data, error } = await verifier.auth.signInWithPassword({ email, password });
    // Confere o dono: a senha precisa ser a do usuário que já está na sessão.
    if (error || !data?.user || data.user.id !== expectedUserId) {
      throw new Error('Senha incorreta');
    }
  } finally {
    // Encerra a sessão extra criada pela verificação (só no cliente descartável).
    await verifier.auth.signOut({ scope: 'local' }).catch(() => undefined);
    // O SDK registra um listener de `visibilitychange` por cliente e o mantém
    // vivo até o descarte: sem isto, cada confirmação de senha deixaria um
    // cliente pendurado na aba, acionado a cada retorno ao foco.
    await verifier.auth.dispose().catch(() => undefined);
  }
}

const ACTION_LABELS: Record<SensitiveAction, string> = {
  change_password: 'Alterar Senha',
  change_email: 'Alterar Email',
  configure_mfa: 'Configurar 2FA',
  disable_mfa: 'Desativar 2FA',
  admin_action: 'Ação Administrativa',
  delete_account: 'Excluir Conta',
  manage_users: 'Gerenciar Usuários',
  security_settings: 'Configurações de Segurança',
};

export function ReauthProvider({ children }: { children: ReactNode }) {
  const [showDialog, setShowDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<SensitiveAction | null>(null);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);
  const [lastReauthAt, setLastReauthAt] = useState<Date | null>(null);
  const [reauthOwnerId, setReauthOwnerId] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  // A confirmação vale para o operador que a fez, não para o aparelho: em
  // troca de conta na mesma aba (quiosque) a janela de 5 minutos não pode
  // emprestar a verificação de quem saiu para quem entrou.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSessionUserId(data.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSessionUserId(session?.user?.id ?? null);
      if (event === 'SIGNED_OUT') {
        setLastReauthAt(null);
        setReauthOwnerId(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const isReauthenticated = useCallback(() => {
    if (!lastReauthAt) return false;
    if (!reauthOwnerId || reauthOwnerId !== sessionUserId) return false;
    const now = new Date();
    const diffMs = now.getTime() - lastReauthAt.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    return diffMinutes < REAUTH_VALIDITY_MINUTES;
  }, [lastReauthAt, reauthOwnerId, sessionUserId]);

  const requireReauth = useCallback((action: SensitiveAction, onSuccess: () => void) => {
    // If recently re-authenticated, proceed directly
    if (isReauthenticated()) {
      onSuccess();
      return;
    }

    setCurrentAction(action);
    setOnSuccessCallback(() => onSuccess);
    setShowDialog(true);
    setPassword('');
  }, [isReauthenticated]);

  const handleReauth = async () => {
    if (!password.trim()) {
      toast.error('Digite sua senha');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        throw new Error('Usuário não encontrado');
      }

      // Verify password without touching the shared client's session (keeps AAL2).
            await verifyPassword(user.email, password, user.id);

      // Log security event
      await supabase.from('security_events').insert({
        event_type: 'reauth_success',
        severity: 'info',
        user_id: user.id,
        user_email: user.email,
        details: { action: currentAction },
      });

      setLastReauthAt(new Date());
      setReauthOwnerId(user.id);
      setShowDialog(false);
      setPassword('');

      toast.success('Identidade verificada');

      if (onSuccessCallback) {
        onSuccessCallback();
      }
    } catch (error) {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Falha na verificação');

      // Log failed attempt
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('security_events').insert({
        event_type: 'reauth_failed',
        severity: 'warning',
        user_id: user?.id,
        user_email: user?.email,
        details: { action: currentAction },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setPassword('');
    setCurrentAction(null);
    setOnSuccessCallback(null);
  };

  // Memoize so password-field keystrokes (which re-render this provider) don't
  // recreate the context value and re-render every useReauth consumer.
  const contextValue = useMemo(
    () => ({
      requireReauth,
      isReauthenticated: isReauthenticated(),
      lastReauthAt,
    }),
    [requireReauth, isReauthenticated, lastReauthAt],
  );

  return (
    <ReauthContext.Provider value={contextValue}>
      {children}

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Verificação de Segurança</DialogTitle>
            <DialogDescription className="text-center">
              Para executar <strong>{currentAction ? ACTION_LABELS[currentAction] : 'esta ação'}</strong>,
              confirme sua identidade digitando sua senha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reauth-password">Senha Atual</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <PasswordInput
                  id="reauth-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password) {
                      handleReauth();
                    }
                  }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus -- foco no dialog de reautenticação é UX esperada
                  autoFocus
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleReauth} disabled={!password || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ReauthContext.Provider>
  );
}

export function useReauth() {
  const context = useContext(ReauthContext);
  if (!context) {
    throw new Error('useReauth must be used within ReauthProvider');
  }
  return context;
}

// HOC for components that require re-authentication
export function withReauth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  action: SensitiveAction
) {
  return function WithReauthComponent(props: P) {
    const { requireReauth } = useReauth();

    const handleAction = (callback: () => void) => {
      requireReauth(action, callback);
    };

    return <WrappedComponent {...props} onSecureAction={handleAction} />;
  };
}
