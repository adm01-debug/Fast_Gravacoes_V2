import * as React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, RefreshCw } from "lucide-react";

// ============================================
// SESSION TIMEOUT HANDLER
// Gerenciamento de sessão com warning
// ============================================

interface SessionTimeoutConfig {
  /**
   * Tempo de inatividade antes do warning (em minutos)
   * @default 25
   */
  warningTimeout?: number;

  /**
   * Tempo após warning antes do logout (em minutos)
   * @default 5
   */
  logoutTimeout?: number;

  /**
   * Callback quando a sessão expirar
   */
  onSessionExpired?: () => void;

  /**
   * Callback quando a sessão for renovada
   */
  onSessionRenewed?: () => void;
}

interface SessionTimeoutState {
  showWarning: boolean;
  remainingTime: number;
  isActive: boolean;
}

export function useSessionTimeout({
  warningTimeout = 25,
  logoutTimeout = 5,
  onSessionExpired,
  onSessionRenewed,
}: SessionTimeoutConfig = {}) {
  const navigate = useNavigate();
  const [state, setState] = React.useState<SessionTimeoutState>({
    showWarning: false,
    remainingTime: logoutTimeout * 60,
    isActive: true,
  });

  const warningTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = React.useRef<number>(0);
  // Mirror of showWarning so the activity listener can read it without being a
  // dependency of the setup effect (which would tear down/rebuild all timers
  // every time the warning toggles — that bug made the warning flash and reset,
  // so the session never actually timed out).
  const showWarningRef = React.useRef(false);
  const isMountedRef = React.useRef(true);

  const warningTimeoutMs = warningTimeout * 60 * 1000;
  const logoutTimeoutMs = logoutTimeout * 60 * 1000;
  const logoutSeconds = logoutTimeout * 60;

  const clearAllTimers = React.useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  // Handle logout
  const handleLogout = React.useCallback(async () => {
    clearAllTimers();
    showWarningRef.current = false;
    if (isMountedRef.current) {
      setState({ showWarning: false, remainingTime: 0, isActive: false });
    }

    try {
      await supabase.auth.signOut();
      onSessionExpired?.();
      toast.info("Sessão expirada", {
        description: "Você foi desconectado por inatividade.",
      });
      navigate("/auth");
    } catch (error) {
      logger.warn('Falha ao encerrar sessão por inatividade', error, 'useSessionTimeout');
    }
  }, [navigate, onSessionExpired, clearAllTimers]);

  // "Latest" refs so the memoized timer callbacks never capture a stale binding.
  const handleLogoutRef = React.useRef(handleLogout);
  React.useEffect(() => {
    handleLogoutRef.current = handleLogout;
  }, [handleLogout]);

  // Start countdown when warning is shown
  const startCountdown = React.useCallback(() => {
    let remaining = logoutSeconds;

    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, remainingTime: remaining }));
      }
      if (remaining <= 0) {
        handleLogoutRef.current();
      }
    }, 1000);

    // Set logout timer as backup
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => {
      handleLogoutRef.current();
    }, logoutTimeoutMs);
  }, [logoutSeconds, logoutTimeoutMs]);

  const startCountdownRef = React.useRef(startCountdown);
  React.useEffect(() => {
    startCountdownRef.current = startCountdown;
  }, [startCountdown]);

  // Reset all timers
  const resetTimers = React.useCallback(() => {
    clearAllTimers();

    showWarningRef.current = false;
    if (isMountedRef.current) {
      setState((prev) => ({
        ...prev,
        showWarning: false,
        remainingTime: logoutSeconds,
      }));
    }

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      showWarningRef.current = true;
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, showWarning: true }));
      }
      startCountdownRef.current();
    }, warningTimeoutMs);

    lastActivityRef.current = Date.now();
  }, [logoutSeconds, warningTimeoutMs, clearAllTimers]);

  const resetTimersRef = React.useRef(resetTimers);
  React.useEffect(() => {
    resetTimersRef.current = resetTimers;
  }, [resetTimers]);

  // Extend session
  const extendSession = React.useCallback(() => {
    resetTimers();
    onSessionRenewed?.();
    toast.success("Sessão renovada", {
      description: "Sua sessão foi estendida com sucesso.",
    });
  }, [resetTimers, onSessionRenewed]);

  // Activity detection — set up ONCE on mount. Reads live state through refs so
  // it never re-binds listeners or rebuilds timers mid-cycle.
  React.useEffect(() => {
    isMountedRef.current = true;
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => {
      // `lastActivityRef` tracks the time of the last TIMER RESET (updated by
      // resetTimers), not the last raw event. Debouncing against the last reset
      // means continuous activity still re-arms the timers every minute — keying
      // it to every event would let an active user reach the inactivity timeout.
      const now = Date.now();
      const timeSinceLastReset = now - lastActivityRef.current;

      if (timeSinceLastReset > 60000 && !showWarningRef.current) {
        resetTimersRef.current();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer setup
    resetTimersRef.current();

    return () => {
      isMountedRef.current = false;
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return {
    ...state,
    extendSession,
    logout: handleLogout,
  };
}

// ============================================
// SESSION TIMEOUT DIALOG
// ============================================

interface SessionTimeoutDialogProps {
  config?: SessionTimeoutConfig;
}

export function SessionTimeoutDialog({ config }: SessionTimeoutDialogProps) {
  const { showWarning, remainingTime, extendSession, logout } = useSessionTimeout(config);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-warning/10">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <AlertDialogTitle>Sessão expirando</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Sua sessão irá expirar em breve por inatividade. Deseja continuar
              conectado?
            </p>
            <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
              <span className="text-3xl font-mono font-bold text-warning">
                {formatTime(remainingTime)}
              </span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair agora
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={extendSession}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Continuar conectado
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================
// SESSION PROVIDER
// ============================================

interface SessionProviderProps {
  children: React.ReactNode;
  config?: SessionTimeoutConfig;
  enabled?: boolean;
}

export function SessionProvider({ children, config, enabled = true }: SessionProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      {children}
      {enabled && isAuthenticated && <SessionTimeoutDialog config={config} />}
    </>
  );
}
