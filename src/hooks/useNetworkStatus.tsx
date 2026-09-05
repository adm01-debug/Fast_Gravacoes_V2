/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ============================================
// NETWORK STATUS MONITOR
// Monitora conexão e exibe indicadores
// ============================================

interface NetworkState {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  wasOffline: boolean;
}

interface NetworkStatusContextValue extends NetworkState {
  checkConnection: () => Promise<boolean>;
  retryConnection: () => void;
}

const NetworkStatusContext = React.createContext<NetworkStatusContextValue | null>(null);

export function useNetworkStatus() {
  const context = React.useContext(NetworkStatusContext);
  if (!context) {
    throw new Error("useNetworkStatus must be used within NetworkStatusProvider");
  }
  return context;
}

// ============================================
// NETWORK STATUS PROVIDER
// ============================================

interface NetworkStatusProviderProps {
  children: React.ReactNode;
  pingUrl?: string;
  pingInterval?: number;
}

export function NetworkStatusProvider({
  children,
  pingUrl = "/auth/v1/settings",
  pingInterval = 60000,
}: NetworkStatusProviderProps) {
  const [state, setState] = React.useState<NetworkState>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    effectiveType: "4g",
    downlink: 10,
    rtt: 50,
    saveData: false,
    wasOffline: false,
  });

  // Update network info
  const updateNetworkInfo = React.useCallback(() => {
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;

    if (connection) {
      setState((prev) => ({
        ...prev,
        effectiveType: connection.effectiveType || "4g",
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 50,
        saveData: connection.saveData || false,
        isSlowConnection: connection.effectiveType === "2g" || connection.effectiveType === "slow-2g",
      }));
    }
  }, []);

  // Check actual connectivity
  const checkConnection = React.useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const fullUrl = pingUrl.startsWith('http') ? pingUrl : `${import.meta.env.VITE_SUPABASE_URL}${pingUrl}`;
      
      const response = await fetch(fullUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        }
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, [pingUrl]);

  // Retry connection
  const retryConnection = React.useCallback(() => {
    checkConnection().then((isOnline) => {
      setState((prev) => ({
        ...prev,
        isOnline,
        wasOffline: !isOnline && prev.wasOffline,
      }));
    });
  }, [checkConnection]);

  // Handle online/offline events
  React.useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({
        ...prev,
        isOnline: true,
        wasOffline: !prev.isOnline,
      }));
      updateNetworkInfo();
    };

    const handleOffline = () => {
      setState((prev) => ({
        ...prev,
        isOnline: false,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Network Information API
    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (connection) {
      connection.addEventListener("change", updateNetworkInfo);
    }

    // Initial check
    updateNetworkInfo();

    // Periodic ping check
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        checkConnection().then((isOnline) => {
          setState((prev) => ({
            ...prev,
            isOnline,
          }));
        });
      }
    }, pingInterval);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", updateNetworkInfo);
      }
      clearInterval(intervalId);
    };
  }, [updateNetworkInfo, checkConnection, pingInterval]);

  const value = React.useMemo(
    () => ({
      ...state,
      checkConnection,
      retryConnection,
    }),
    [state, checkConnection, retryConnection]
  );

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

// ============================================
// NETWORK STATUS INDICATOR
// ============================================

interface NetworkStatusIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
  position?: "top" | "bottom";
}

export function NetworkStatusIndicator({
  className,
  showWhenOnline = false,
  position = "bottom",
}: NetworkStatusIndicatorProps) {
  const { isOnline, isSlowConnection, wasOffline, retryConnection } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = React.useState(false);

  // Show reconnected message briefly
  React.useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const shouldShow = !isOnline || isSlowConnection || showReconnected || showWhenOnline;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: position === "top" ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === "top" ? -20 : 20 }}
          className={cn(
            "fixed left-0 right-0 z-50 flex items-center justify-center px-4 py-2",
            position === "top" ? "top-0" : "bottom-0",
            !isOnline && "bg-destructive text-destructive-foreground",
            isSlowConnection && isOnline && "bg-warning text-warning-foreground",
            showReconnected && "bg-success text-success-foreground",
            isOnline && !isSlowConnection && !showReconnected && "bg-muted",
            className
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {!isOnline ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Sem conexão com a internet</span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="ml-2 h-7"
                  onClick={retryConnection}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Tentar novamente
                </Button>
              </>
            ) : showReconnected ? (
              <>
                <Cloud className="h-4 w-4" />
                <span>Conexão restabelecida!</span>
              </>
            ) : isSlowConnection ? (
              <>
                <Wifi className="h-4 w-4" />
                <span>Conexão lenta detectada</span>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4" />
                <span>Conectado</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// OFFLINE OVERLAY
// ============================================

interface OfflineOverlayProps {
  className?: string;
}

export function OfflineOverlay({ className }: OfflineOverlayProps) {
  const { isOnline, retryConnection } = useNetworkStatus();
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    retryConnection();
    setTimeout(() => setIsRetrying(false), 2000);
  };

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm",
            className
          )}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="text-center p-8"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CloudOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            </motion.div>
            <h2 className="text-xl font-semibold mb-2">Você está offline</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Verifique sua conexão com a internet e tente novamente.
            </p>
            <Button onClick={handleRetry} disabled={isRetrying}>
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar novamente
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// COMPACT STATUS ICON
// ============================================

export function NetworkStatusIcon({ className }: { className?: string }) {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  return (
    <div
      className={cn(
        "relative",
        className
      )}
      title={
        !isOnline
          ? "Offline"
          : isSlowConnection
          ? "Conexão lenta"
          : "Online"
      }
    >
      {isOnline ? (
        <Wifi className={cn("h-4 w-4", isSlowConnection ? "text-warning" : "text-success")} />
      ) : (
        <WifiOff className="h-4 w-4 text-destructive" />
      )}
      <span
        className={cn(
          "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
          isOnline ? (isSlowConnection ? "bg-warning" : "bg-success") : "bg-destructive"
        )}
      />
    </div>
  );
}

// ============================================
// TYPES
// ============================================

interface NetworkInformation extends EventTarget {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}
