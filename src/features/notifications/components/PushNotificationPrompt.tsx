import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import { useAuth } from "@/features/auth";

interface PushNotificationPromptProps {
  /** Delay em ms antes de mostrar o prompt */
  delay?: number;
  /** Mostrar apenas uma vez por sessão */
  showOnce?: boolean;
}

/**
 * Prompt flutuante para solicitar permissão de Push Notifications
 * Aparece automaticamente após delay se o usuário ainda não aceitou
 */
export function PushNotificationPrompt({
  delay = 10000,
  showOnce = true
}: PushNotificationPromptProps) {
  const { user } = useAuth();
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    requestPermission
  } = usePushNotifications();

  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Não mostra se:
    // - Não suportado
    // - Já subscrito
    // - Permissão negada
    // - Usuário não logado
    // - Já dispensado nesta sessão
    if (
      !isSupported ||
      isSubscribed ||
      permission === "denied" ||
      !user ||
      isDismissed
    ) {
      return;
    }

    // Verifica se já foi mostrado nesta sessão
    if (showOnce && sessionStorage.getItem("push_prompt_shown")) {
      return;
    }

    const timeout = setTimeout(() => {
      setIsVisible(true);
      if (showOnce) {
        sessionStorage.setItem("push_prompt_shown", "true");
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [isSupported, isSubscribed, permission, user, isDismissed, delay, showOnce]);

  const handleAccept = async () => {
    await requestPermission();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
        >
          <Card className="border-primary/20 bg-background/95 backdrop-blur-lg shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground">
                      Ativar Notificações
                    </h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mt-1 -mr-2"
                      onClick={handleDismiss}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground mt-1">
                    Receba alertas de manutenção, produção e eficiência em tempo real.
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleAccept}
                      disabled={isLoading}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Bell className="w-4 h-4 mr-1" />
                      )}
                      Ativar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                    >
                      Agora não
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Toggle button para ativar/desativar notificações
 * Pode ser usado em settings ou header
 */
export function PushNotificationToggle() {
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    requestPermission,
    unsubscribe
  } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await requestPermission();
    }
  };

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={isLoading || permission === "denied"}
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="w-4 h-4" />
      ) : (
        <BellOff className="w-4 h-4" />
      )}
      {isSubscribed ? "Notificações Ativas" : "Ativar Notificações"}
    </Button>
  );
}
