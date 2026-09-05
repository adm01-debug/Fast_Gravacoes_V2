import { Bell, Check, CheckCheck, Trash2, Sparkles, BrainCircuit, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/features/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const typeColors: Record<string, string> = {
  info: 'bg-blue-500', success: 'bg-green-500', warning: 'bg-yellow-500', error: 'bg-red-500', urgent: 'bg-red-600',
};

export function NotificationCenter() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (actionUrl: string | null | undefined) => {
    if (!actionUrl) return;
    // Only allow same-origin relative paths to prevent open redirect
    if (actionUrl.startsWith('/') && !actionUrl.startsWith('//')) {
      navigate(actionUrl);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0 overflow-hidden" align="end">
        <Tabs defaultValue="notifications" className="w-full">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <TabsList className="bg-transparent h-8 p-0 gap-4">
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 px-0 text-xs font-bold uppercase tracking-wider"
              >
                Notificações
              </TabsTrigger>
              <TabsTrigger
                value="insights"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 px-0 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Sparkles className="h-3 w-3 text-warning" />
                Insights IA
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => markAllAsRead()} disabled={unreadCount === 0} title="Marcar todas como lidas">
                <CheckCheck className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="notifications" className="m-0">
            <ScrollArea className="h-[450px]">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground text-xs">Carregando...</div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-10" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y border-b">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Notificação: ${n.title || n.type}`}
                      className={cn(
                        "p-4 hover:bg-accent/40 cursor-pointer transition-colors relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        !n.is_read && "bg-primary/[0.03]"
                      )}
                      onClick={() => { markAsRead(n.id); handleNotificationClick(n.action_url); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markAsRead(n.id); handleNotificationClick(n.action_url); } }}
                    >
                      {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                      <div className="flex items-start gap-3">
                        <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", typeColors[n.type] || 'bg-gray-500')} />
                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn("text-sm truncate", !n.is_read ? "font-bold text-foreground" : "text-muted-foreground")}>{n.title}</p>
                            {n.is_grouped && n.group_count > 1 && <Badge variant="secondary" className="text-[10px] h-4 px-1">{n.group_count}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-tighter">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.is_read && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/10 hover:text-primary" onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="insights" className="m-0">
            <ScrollArea className="h-[450px]">
              <div className="p-4 space-y-4">
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 relative overflow-hidden group hover:border-warning/40 transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <BrainCircuit className="h-12 w-12 text-warning" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[9px] font-black uppercase tracking-tighter">
                      Otimização de Setup
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-warning">Recomendação de Fluxo</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Mover <span className="text-foreground font-bold">Job #4521</span> para a <span className="text-foreground font-bold">Máquina 08</span> reduzirá o tempo de setup em 22 minutos devido à similaridade de cor da tinta atual.
                  </p>
                  <Button variant="link" className="text-warning p-0 h-auto text-[10px] font-bold mt-3 uppercase tracking-wider">
                    Aplicar recomendação →
                  </Button>
                </div>

                <div className="p-4 rounded-xl bg-success/5 border border-success/20 relative overflow-hidden group hover:border-success/40 transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-12 w-12 text-success" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[9px] font-black uppercase tracking-tighter">
                      High Performance
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-success">Recorde de Eficiência</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Operador <span className="text-foreground font-bold">Marcos Silva</span> está operando com <span className="text-foreground font-bold">98.2% de OEE</span> na última hora. Considerar envio de badge de "Mestre da Eficiência".
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 relative overflow-hidden group hover:border-rose-500/40 transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Zap className="h-12 w-12 text-rose-500" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[9px] font-black uppercase tracking-tighter">
                      Risco de Gargalo
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-rose-700">Manutenção Preditiva</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    A <span className="text-foreground font-bold">Máquina 03</span> apresenta variação de vibração fora do normal. Risco de parada nas próximas 4 horas de 68%.
                  </p>
                  <Button variant="link" className="text-rose-600 p-0 h-auto text-[10px] font-bold mt-3 uppercase tracking-wider">
                    Agendar inspeção agora →
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
