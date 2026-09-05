import { useSecurityEvents } from '@/features/admin';
import { useRealtimeSecurityEvents } from '@/features/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const severityConfig: Record<string, {
  icon: typeof AlertTriangle;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  info: {
    icon: Info,
    variant: 'secondary',
    className: 'text-blue-500'
  },
  warning: {
    icon: AlertTriangle,
    variant: 'outline',
    className: 'text-warning'
  },
  error: {
    icon: AlertCircle,
    variant: 'destructive',
    className: 'text-red-500'
  },
  critical: {
    icon: XCircle,
    variant: 'destructive',
    className: 'text-red-700'
  },
};

const eventTypeLabels: Record<string, string> = {
  login_success: 'Login bem-sucedido',
  login_failed: 'Falha no login',
  login_blocked: 'Login bloqueado',
  mfa_enabled: 'MFA ativado',
  mfa_disabled: 'MFA desativado',
  password_changed: 'Senha alterada',
  ip_blocked: 'IP bloqueado',
  ip_unblocked: 'IP desbloqueado',
  rate_limit_exceeded: 'Rate limit excedido',
  suspicious_activity: 'Atividade suspeita',
  permission_denied: 'Permissão negada',
  account_locked: 'Conta bloqueada',
};

export function SecurityEventsLog() {
  const { data: events, isLoading } = useSecurityEvents(200);
  const { newEvents } = useRealtimeSecurityEvents();

  // Merge realtime events
  const allEvents = [
    ...newEvents.filter(ne => !events?.some(e => e.id === ne.id)),
    ...(events || [])
  ].slice(0, 200);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Eventos de Segurança
        </CardTitle>
        <CardDescription>
          Log de atividades relacionadas à segurança do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : allEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum evento de segurança registrado</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Nível</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allEvents.map((event) => {
                  const config = severityConfig[event.severity] || severityConfig.info;
                  const Icon = config.icon;

                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Icon className={`h-4 w-4 ${config.className}`} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>
                          {eventTypeLabels[event.event_type] || event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {event.user_email || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {event.ip_address || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {(event.details?.message as string | undefined) ||
                         (event.details?.reason as string | undefined) ||
                         JSON.stringify(event.details).slice(0, 50)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(event.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
