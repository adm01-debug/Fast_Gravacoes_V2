import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Bell, Wrench, Brain, Calendar, AlertTriangle, CheckCircle, Clock, BellOff, Trash2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';

interface NotificationItem {
  id: string;
  type: 'maintenance' | 'prediction' | 'summary';
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  timestamp: string;
  isRead?: boolean;
  isResolved?: boolean;
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'warning': return <Clock className="h-4 w-4 text-warning" />;
    case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'maintenance': return <Wrench className="h-4 w-4" />;
    case 'prediction': return <Brain className="h-4 w-4" />;
    case 'summary': return <Calendar className="h-4 w-4" />;
    default: return <Bell className="h-4 w-4" />;
  }
}

interface NotificationsListProps {
  notifications: NotificationItem[];
  isLoading: boolean;
}

export function NotificationsList({ notifications, isLoading }: NotificationsListProps) {
  const { markAsRead, deleteNotification } = useNotifications();
  return (
    <ScrollArea className="h-[500px]">
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <BellOff className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Nenhuma notificação encontrada</p>
          <p className="text-sm">Tente ajustar os filtros ou período</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <div key={notification.id} className={cn(
              "flex items-start gap-4 p-4 rounded-lg border transition-all relative group",
              notification.severity === 'critical' && "border-destructive/30 bg-destructive/5",
              notification.severity === 'warning' && "border-warning/30 bg-warning/5",
              notification.severity === 'success' && "border-green-500/30 bg-green-500/5",
              !notification.isRead && "border-primary/20",
              notification.isResolved && "opacity-60"
            )}>
              {!notification.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg" />}
              <div className="flex-shrink-0 mt-0.5">{getSeverityIcon(notification.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{notification.title}</span>
                  <Badge variant="outline" className="gap-1 text-xs">
                    {getTypeIcon(notification.type)}
                    {notification.type === 'maintenance' ? 'Manutenção' : notification.type === 'prediction' ? 'ML' : 'Resumo'}
                  </Badge>
                  {notification.isResolved && <Badge variant="secondary" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Resolvido</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] uppercase font-bold tracking-tighter text-muted-foreground/60">
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true, locale: ptBR })}
                  </p>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* s- (daily_summaries) é registro imutável: sem ações. */}
                    {!notification.isRead && !notification.id.startsWith('s-') && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={() => markAsRead(notification.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {/* Lixeira só existe para push_notifications — alertas de
                        manutenção e predições são registros operacionais
                        compartilhados: "excluir" não pode marcá-los como
                        resolvidos/inativos para toda a equipe. */}
                    {notification.id.startsWith('push-') && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteNotification(notification.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
