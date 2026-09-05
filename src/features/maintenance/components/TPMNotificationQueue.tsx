import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, XCircle, Clock, Search, RefreshCw, AlertCircle, PlayCircle, BarChart3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function TPMNotificationQueue() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: queue, isLoading } = useQuery({
    queryKey: ['tpm-notification-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tpm_notification_queue')
        .select(`
          *,
          machine:machines(name, code)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tpm_notification_queue')
        .update({
          status: 'pending',
          retry_count: 0,
          next_retry_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tpm-notification-queue'] });
      toast.success('Notificação reenfileirada para tentativa');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao retentar notificação');
    }
  });

  const filteredQueue = queue?.filter(item =>
    item.machine?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.machine?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.channel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    pending: queue?.filter(i => i.status === 'pending').length || 0,
    processing: queue?.filter(i => i.status === 'processing').length || 0,
    failed: queue?.filter(i => i.status === 'failed').length || 0,
    total: queue?.length || 0
  };

  if (isLoading) return <div className="p-8 text-center">Carregando fila...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs font-semibold uppercase text-blue-500 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs font-semibold uppercase text-warning flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Processando
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/20">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs font-semibold uppercase text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Falhas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-xs font-semibold uppercase text-success flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Total (Hoje)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar fila por máquina ou canal..."
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['tpm-notification-queue'] })}>
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Criação</TableHead>
              <TableHead>Máquina</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tentativas</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQueue?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Fila vazia
                </TableCell>
              </TableRow>
            ) : (
              filteredQueue?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs">
                    {item.created_at ? format(new Date(item.created_at), 'dd/MM HH:mm', { locale: ptBR }) : '-'}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-sm">{item.machine?.name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-[10px]">{item.channel}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.status === 'pending' && <Badge variant="secondary" className="animate-pulse">Aguardando</Badge>}
                    {item.status === 'processing' && <Badge variant="outline" className="border-warning text-warning">Enviando...</Badge>}
                    {item.status === 'sent' && <Badge variant="outline" className="border-success text-success">Concluído</Badge>}
                    {item.status === 'failed' && <Badge variant="destructive">Falhou</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono">{(item.retry_count || 0)}/{(item.max_retries || 3)}</span>
                      <Progress value={((item.retry_count || 0) / (item.max_retries || 3)) * 100} className="h-1 w-12" />
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={() => retryMutation.mutate(item.id)}
                        title="Tentar novamente"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
