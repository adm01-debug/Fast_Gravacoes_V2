/* eslint-disable react-hooks/purity -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Smartphone,
  Monitor,
  Tablet,
  Trash2,
  ShieldCheck,
  ShieldOff,
  MapPin,
  Clock,
  Loader2,
  Globe
} from 'lucide-react';
import { useUserDevices, UserDevice } from '@/hooks/useUserDevices';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function ActiveDevicesPanel() {
  const { devices, isLoading, trustDevice, untrustDevice, removeDevice, isTrusting, isRemoving } = useUserDevices();
  const [deviceToRemove, setDeviceToRemove] = useState<string | null>(null);

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getDeviceLabel = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return 'Celular';
      case 'tablet':
        return 'Tablet';
      default:
        return 'Computador';
    }
  };

  const handleRemove = () => {
    if (deviceToRemove) {
      removeDevice(deviceToRemove);
      setDeviceToRemove(null);
    }
  };

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
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Dispositivos Ativos
        </CardTitle>
        <CardDescription>
          Gerencie os dispositivos que acessaram sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!devices || devices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dispositivo registrado ainda</p>
            <p className="text-sm">Os dispositivos aparecerão aqui após o login</p>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onTrust={() => trustDevice(device.id)}
                onUntrust={() => untrustDevice(device.id)}
                onRemove={() => setDeviceToRemove(device.id)}
                isTrusting={isTrusting}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!deviceToRemove} onOpenChange={() => setDeviceToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Dispositivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Este dispositivo será removido da sua lista. Se alguém tentar acessar
              sua conta a partir dele novamente, você receberá um alerta de novo dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function DeviceCard({
  device,
  onTrust,
  onUntrust,
  onRemove,
  isTrusting
}: {
  device: UserDevice;
  onTrust: () => void;
  onUntrust: () => void;
  onRemove: () => void;
  isTrusting: boolean;
}) {
  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-8 w-8" />;
      case 'tablet':
        return <Tablet className="h-8 w-8" />;
      default:
        return <Monitor className="h-8 w-8" />;
    }
  };

  const isRecent = new Date(device.last_seen_at).getTime() > Date.now() - 5 * 60 * 1000; // 5 min

  return (
    <div className={cn(
      "p-4 border rounded-lg transition-colors",
      device.is_trusted ? "border-green-500/30 bg-green-500/5" : "hover:bg-muted/50"
    )}>
      <div className="flex items-start gap-4">
        {/* Device Icon */}
        <div className={cn(
          "p-3 rounded-full",
          device.is_trusted ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
        )}>
          {getDeviceIcon(device.device_type)}
        </div>

        {/* Device Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">
              {device.browser_name || 'Navegador Desconhecido'} / {device.os_name || 'Sistema Desconhecido'}
            </span>
            {device.is_trusted && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Confiável
              </Badge>
            )}
            {isRecent && (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                Ativo agora
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {device.ip_address || 'IP desconhecido'}
            </span>
            {device.city && device.country && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {device.city}, {device.country}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Visto {formatDistanceToNow(new Date(device.last_seen_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0">
          {device.is_trusted ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUntrust}
              disabled={isTrusting}
            >
              <ShieldOff className="h-4 w-4 mr-1" />
              Desconfiar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onTrust}
              disabled={isTrusting}
              className="text-green-600 hover:text-green-600 hover:bg-green-50"
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Confiar
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
