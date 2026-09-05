/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, AlertTriangle, AlertCircle, Zap, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMLPredictionNotifications, saveMLNotificationPreferences } from '@/features/notifications';
import { toast } from 'sonner';

interface NotificationPreferences {
  criticalRisk: boolean;
  highRisk: boolean;
  mediumRisk: boolean;
  failurePredictions: boolean;
  maintenanceNeeded: boolean;
  soundEnabled: boolean;
}

export function MLNotificationSettings() {
  const { permission, isSupported, requestPermission, getPreferences } = useMLPredictionNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>(getPreferences());

  useEffect(() => {
    setPreferences(getPreferences());
  }, []);

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key];
    const updated = saveMLNotificationPreferences({ [key]: newValue });
    setPreferences(updated);
    toast.success('Configuração atualizada');
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success('Notificações de ML ativadas!');
    }
  };

  if (!isSupported) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Notificações Não Suportadas
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="glass-card hover:shadow-glow-primary/20 transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notificações de Predições ML
        </CardTitle>
        <CardDescription>
          Configure alertas para previsões de falhas de máquinas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <Bell className="h-5 w-5 text-success" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">Status das Notificações</p>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted'
                  ? 'Notificações ativadas'
                  : permission === 'denied'
                  ? 'Bloqueadas no navegador'
                  : 'Não configuradas'}
              </p>
            </div>
          </div>
          {permission !== 'granted' && (
            <Button onClick={handleRequestPermission} size="sm">
              Ativar
            </Button>
          )}
          {permission === 'granted' && (
            <Badge variant="default" className="bg-success">
              Ativo
            </Badge>
          )}
        </div>

        {/* Risk Level Settings */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">Por Nível de Risco</h4>

          <NotificationToggle
            icon={<AlertCircle className="h-5 w-5 text-destructive" />}
            label="Risco Crítico (80%+)"
            description="Alerta urgente para falhas iminentes"
            checked={preferences.criticalRisk}
            onCheckedChange={() => handleToggle('criticalRisk')}
            priority="Crítica"
            disabled={permission !== 'granted'}
          />

          <NotificationToggle
            icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
            label="Alto Risco (60-79%)"
            description="Notificação para riscos significativos"
            checked={preferences.highRisk}
            onCheckedChange={() => handleToggle('highRisk')}
            priority="Alta"
            disabled={permission !== 'granted'}
          />

          <NotificationToggle
            icon={<Zap className="h-5 w-5 text-warning" />}
            label="Risco Médio (40-59%)"
            description="Aviso para riscos moderados"
            checked={preferences.mediumRisk}
            onCheckedChange={() => handleToggle('mediumRisk')}
            disabled={permission !== 'granted'}
          />
        </div>

        {/* Prediction Type Settings */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h4 className="font-medium text-sm text-muted-foreground">Por Tipo de Predição</h4>

          <NotificationToggle
            icon={<AlertCircle className="h-5 w-5 text-destructive" />}
            label="Risco de Falha"
            description="Previsões de falhas de equipamentos"
            checked={preferences.failurePredictions}
            onCheckedChange={() => handleToggle('failurePredictions')}
            disabled={permission !== 'granted'}
          />

          <NotificationToggle
            icon={<Wrench className="h-5 w-5 text-blue-500" />}
            label="Manutenção Necessária"
            description="Recomendações de manutenção preventiva"
            checked={preferences.maintenanceNeeded}
            onCheckedChange={() => handleToggle('maintenanceNeeded')}
            disabled={permission !== 'granted'}
          />
        </div>

        {/* Sound Settings */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {preferences.soundEnabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Sons de Alerta</p>
                <p className="text-sm text-muted-foreground">
                  Tocar som para riscos altos e críticos
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.soundEnabled}
              onCheckedChange={() => handleToggle('soundEnabled')}
              disabled={permission !== 'granted'}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface NotificationToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
  priority?: string;
  disabled?: boolean;
}

function NotificationToggle({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  priority,
  disabled,
}: NotificationToggleProps) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
      checked && !disabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
    } ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{label}</p>
            {priority && (
              <Badge
                variant={priority === 'Crítica' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {priority}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
