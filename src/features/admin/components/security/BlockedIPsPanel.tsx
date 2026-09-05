import { useState } from 'react';
import {
  useBlockedIPs,
  useBlockedIPsHistory,
  useBlockIP,
  useUnblockIP
} from '@/features/admin';
import { useRealtimeBlockedIPs } from '@/features/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield,
  ShieldOff,
  Plus,
  Loader2,
  Unlock,
  Clock,
  AlertTriangle,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function BlockedIPsPanel() {
  const { data: blockedIPs, isLoading } = useBlockedIPs();
  const { data: history } = useBlockedIPsHistory();
  const { newBlocks } = useRealtimeBlockedIPs();
  const blockIP = useBlockIP();
  const unblockIP = useUnblockIP();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [ipToUnblock, setIpToUnblock] = useState<string | null>(null);
  const [newIP, setNewIP] = useState('');
  const [reason, setReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);
  const [expiresHours, setExpiresHours] = useState('24');

  const handleBlock = async () => {
    if (!newIP.trim() || !reason.trim()) return;

    const expiresAt = isPermanent
      ? undefined
      : new Date(Date.now() + parseInt(expiresHours, 10) * 60 * 60 * 1000).toISOString();

    await blockIP.mutateAsync({
      ipAddress: newIP.trim(),
      reason: reason.trim(),
      isPermanent,
      expiresAt,
    });

    setShowAddDialog(false);
    setNewIP('');
    setReason('');
    setIsPermanent(false);
    setExpiresHours('24');
  };

  const handleUnblock = async () => {
    if (!ipToUnblock) return;
    await unblockIP.mutateAsync(ipToUnblock);
    setIpToUnblock(null);
  };

  // Merge realtime new blocks with existing
  const allBlocked = [
    ...newBlocks.filter(nb => !blockedIPs?.some(b => b.id === nb.id)),
    ...(blockedIPs || [])
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              IPs Bloqueados
            </CardTitle>
            <CardDescription>
              Gerencie IPs bloqueados manual ou automaticamente
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Bloquear IP
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="gap-2">
              <ShieldOff className="h-4 w-4" />
              Ativos ({allBlocked.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : allBlocked.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum IP bloqueado no momento</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Bloqueado em</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allBlocked.map((ip) => (
                      <TableRow key={ip.id}>
                        <TableCell className="font-mono">{ip.ip_address}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {ip.reason}
                        </TableCell>
                        <TableCell>
                          {format(new Date(ip.blocked_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {ip.is_permanent ? (
                            <Badge variant="destructive">Permanente</Badge>
                          ) : ip.expires_at ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {format(new Date(ip.expires_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          ) : (
                            <Badge variant="secondary">Indefinido</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIpToUnblock(ip.id)}
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Desbloquear
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Bloqueado</TableHead>
                    <TableHead>Desbloqueado</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.map((ip) => (
                    <TableRow key={ip.id}>
                      <TableCell className="font-mono">{ip.ip_address}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {ip.reason}
                      </TableCell>
                      <TableCell>
                        {format(new Date(ip.blocked_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {ip.unblocked_at
                          ? format(new Date(ip.unblocked_at), "dd/MM/yy HH:mm", { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={ip.unblocked_at ? 'secondary' : 'destructive'}>
                          {ip.unblocked_at ? 'Desbloqueado' : 'Bloqueado'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Add Block Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Bloquear IP
            </DialogTitle>
            <DialogDescription>
              Adicione um endereço IP à lista de bloqueio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ip">Endereço IP</Label>
              <Input
                id="ip"
                placeholder="192.168.1.1"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo do bloqueio..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bloqueio Permanente</Label>
                <p className="text-sm text-muted-foreground">
                  O IP ficará bloqueado indefinidamente
                </p>
              </div>
              <Switch
                checked={isPermanent}
                onCheckedChange={setIsPermanent}
              />
            </div>

            {!isPermanent && (
              <div className="space-y-2">
                <Label htmlFor="expires">Duração (horas)</Label>
                <Input
                  id="expires"
                  type="number"
                  min="1"
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleBlock}
              disabled={!newIP.trim() || !reason.trim() || blockIP.isPending}
            >
              {blockIP.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Confirmation */}
      <AlertDialog open={!!ipToUnblock} onOpenChange={() => setIpToUnblock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desbloquear IP?</AlertDialogTitle>
            <AlertDialogDescription>
              Este IP poderá acessar o sistema novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock}>
              Desbloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
