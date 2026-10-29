import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, BellRing, Check, X, AlertTriangle, Volume2, VolumeX } from "lucide-react";
import { usePushNotifications } from '@/features/notifications/hooks/usePushNotifications';
import { useNotificationSounds } from '@/features/notifications/hooks/useNotificationSounds';
import { cn } from "@/lib/utils";

interface NotificationPreferences {
  delayedJobs: boolean;
  lowBuffer: boolean;
  bottleneck: boolean;
  statusChanges: boolean;
  productionComplete: boolean;
}

const defaultPreferences: NotificationPreferences = {
  delayedJobs: true,
  lowBuffer: true,
  bottleneck: true,
  statusChanges: false,
  productionComplete: false
};

export const PushNotificationManager = () => {
  const { permission, isSupported, requestPermission, sendNotification } = usePushNotifications();
  const { isEnabled, setEnabled, playCompleteAlert } = useNotificationSounds();
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(() => isEnabled());
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const saved = localStorage.getItem('notification-preferences');
    return saved ? JSON.parse(saved) : defaultPreferences;
  });

  useEffect(() => {
    localStorage.setItem('notification-preferences', JSON.stringify(preferences));
  }, [preferences]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSoundsToggle = () => {
    const newValue = !soundsEnabled;
    setSoundsEnabled(newValue);
    setEnabled(newValue);
    if (newValue) {
      playCompleteAlert();
    }
  };

  const handleTestNotification = () => {
    sendNotification({
      title: '🔔 Teste de Notificação',
      body: 'As notificações estão funcionando corretamente!',
      tag: 'test'
    });
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <Check className="h-3 w-3 mr-1" />
            Ativadas
          </Badge>
        );
      case 'denied':
        return (
          <Badge className="bg-destructive/20 text-destructive border-destructive/30">
            <X className="h-3 w-3 mr-1" />
            Bloqueadas
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Não configuradas
          </Badge>
        );
    }
  };

  if (!isSupported) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Notificações não suportadas
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificações Push
            </CardTitle>
            <CardDescription>
              Receba alertas críticos diretamente no seu navegador
            </CardDescription>
          </div>
          {getPermissionBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {permission !== 'granted' ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <BellRing className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Habilite as notificações para receber alertas sobre jobs atrasados,
              gargalos de produção e atualizações importantes.
            </p>
            <Button onClick={requestPermission} className="gap-2">
              <Bell className="h-4 w-4" />
              Ativar Notificações
            </Button>
            {permission === 'denied' && (
              <p className="text-xs text-muted-foreground text-center">
                As notificações estão bloqueadas. Por favor, habilite nas configurações do navegador.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Configurações gerais</h4>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {soundsEnabled ? (
                      <Volume2 className="h-4 w-4 text-primary" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-foreground">Sons de Notificação</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tocar sons distintos para cada tipo de alerta
                  </p>
                </div>
                <Switch checked={soundsEnabled} onCheckedChange={handleSoundsToggle} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Tipos de alertas</h4>

              <NotificationToggle
                label="Jobs Atrasados"
                description="Alertar quando um job ultrapassar o tempo estimado"
                checked={preferences.delayedJobs}
                onChange={() => handleToggle('delayedJobs')}
                priority="high"
              />

              <NotificationToggle
                label="Buffer Baixo"
                description="Alertar quando uma técnica tiver menos de 3 jobs prontos"
                checked={preferences.lowBuffer}
                onChange={() => handleToggle('lowBuffer')}
                priority="high"
              />

              <NotificationToggle
                label="Gargalos"
                description="Alertar quando uma técnica estiver próxima da saturação"
                checked={preferences.bottleneck}
                onChange={() => handleToggle('bottleneck')}
                priority="medium"
              />

              <NotificationToggle
                label="Mudanças de Status"
                description="Alertar quando o status de um job mudar"
                checked={preferences.statusChanges}
                onChange={() => handleToggle('statusChanges')}
                priority="low"
              />

              <NotificationToggle
                label="Produções Finalizadas"
                description="Alertar quando uma produção for concluída"
                checked={preferences.productionComplete}
                onChange={() => handleToggle('productionComplete')}
                priority="low"
              />
            </div>

            <div className="pt-4 border-t border-border/30">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                className="gap-2"
              >
                <BellRing className="h-4 w-4" />
                Testar Notificação
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

interface NotificationToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  priority: 'high' | 'medium' | 'low';
}

const NotificationToggle = ({ label, description, checked, onChange, priority }: NotificationToggleProps) => {
  const priorityColors = {
    high: 'bg-red-500/20 text-red-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-blue-500/20 text-blue-400'
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <Badge
            variant="outline"
            className={cn("text-xs px-1.5 py-0", priorityColors[priority])}
          >
            {priority === 'high' ? 'Crítico' : priority === 'medium' ? 'Médio' : 'Baixo'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
};
