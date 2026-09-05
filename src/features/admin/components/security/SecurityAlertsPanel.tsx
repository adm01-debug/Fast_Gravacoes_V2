/* eslint-disable react-hooks/purity -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  AlertTriangle,
  Smartphone,
  Shield,
  CheckCircle2,
  Clock,
  Loader2,
  BellOff
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NewDeviceAlert {
  id: string;
  user_id: string;
  device_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

export function SecurityAlertsPanel() {
  const { user } = useAuth();

  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['security-alerts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('new_device_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      return data as NewDeviceAlert[];
    },
    enabled: !!user?.id,
  });

  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('new_device_alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (!error) {
      refetch();
    }
  };

  const unacknowledgedCount = alerts?.filter(a => !a.acknowledged).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas de Segurança
              {unacknowledgedCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unacknowledgedCount} novo(s)
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Notificações sobre atividades suspeitas na sua conta
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!alerts || alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum alerta de segurança</p>
            <p className="text-sm">Você será notificado sobre atividades suspeitas</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={() => acknowledgeAlert(alert.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function AlertCard({
  alert,
  onAcknowledge
}: {
  alert: NewDeviceAlert;
  onAcknowledge: () => void;
}) {
  const isRecent = new Date(alert.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;

  return (
    <div className={cn(
      "p-4 border rounded-lg transition-colors",
      !alert.acknowledged && "border-warning/50 bg-warning/5",
      alert.acknowledged && "bg-muted/30"
    )}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "p-2 rounded-full flex-shrink-0",
          !alert.acknowledged ? "bg-warning/10 text-warning" : "bg-green-500/10 text-green-600"
        )}>
          {!alert.acknowledged ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">Novo Dispositivo Detectado</span>
            {isRecent && !alert.acknowledged && (
              <Badge variant="destructive" className="text-xs">Novo</Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-1">
            Um login foi realizado a partir de um dispositivo não reconhecido.
          </p>

          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(alert.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            {alert.ip_address && (
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                IP: {alert.ip_address}
              </span>
            )}
            {alert.email_sent && (
              <Badge variant="outline" className="text-xs">
                Email enviado
              </Badge>
            )}
          </div>

          {alert.acknowledged && alert.acknowledged_at && (
            <p className="text-xs text-green-600 mt-2">
              Reconhecido {formatDistanceToNow(new Date(alert.acknowledged_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </p>
          )}
        </div>

        {/* Action */}
        {!alert.acknowledged && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAcknowledge}
            className="flex-shrink-0"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Reconhecer
          </Button>
        )}
      </div>
    </div>
  );
}
