import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Bell,
  BellOff,
  BellRing,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Smartphone
} from 'lucide-react';
import { useWebPushNotifications } from '@/features/notifications';
import { cn } from '@/lib/utils';

export function PushNotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = useWebPushNotifications();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    await sendTestNotification();
    setIsSendingTest(false);
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Permitido
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <XCircle className="h-3 w-3 mr-1" />
            Bloqueado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-warning border-warning">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Não solicitado
          </Badge>
        );
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted">
              <BellOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Notificações Push</CardTitle>
              <CardDescription>
                Seu navegador não suporta notificações push
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning dark:text-warning">
              Para receber notificações push, use um navegador moderno como Chrome, Firefox, Edge ou Safari.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              isSubscribed ? "bg-green-500/10" : "bg-muted"
            )}>
              {isSubscribed ? (
                <BellRing className="h-6 w-6 text-green-500" />
              ) : (
                <Bell className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle>Notificações Push</CardTitle>
              <CardDescription>
                Receba alertas de segurança em tempo real no navegador
              </CardDescription>
            </div>
          </div>
          {getPermissionBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Principal */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="push-toggle" className="font-medium">
                Ativar notificações push
              </Label>
              <p className="text-sm text-muted-foreground">
                Receba alertas mesmo com o navegador minimizado
              </p>
            </div>
          </div>
          <Switch
            id="push-toggle"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {/* Info sobre permissão bloqueada */}
        {permission === 'denied' && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">
                  Notificações bloqueadas
                </p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                  Você bloqueou as notificações deste site. Para reativar, clique no ícone de cadeado
                  na barra de endereço e altere a permissão de notificações.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tipos de notificações */}
        {isSubscribed && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Você receberá notificações para:
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Novo dispositivo detectado na sua conta</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Tentativas de login suspeitas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Alertas de segurança do sistema</span>
              </div>
            </div>
          </div>
        )}

        {/* Botão de teste */}
        {isSubscribed && (
          <Button
            variant="outline"
            onClick={handleSendTest}
            disabled={isSendingTest}
            className="w-full"
          >
            {isSendingTest ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar notificação de teste
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
