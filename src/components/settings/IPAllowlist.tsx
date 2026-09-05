import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { Globe, Plus, Trash2, Loader2, Shield, User, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IPEntry {
  id: string;
  ip_address: string;
  description: string | null;
  is_global: boolean;
  user_id: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export function IPAllowlist() {
  const { user, isCoordinator } = useAuth();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [description, setDescription] = useState('');
  const [isGlobal, setIsGlobal] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { data: ipList = [], isLoading } = useQuery({
    queryKey: ['ip-allowlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_allowlist')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as IPEntry[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-ip'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const addIPMutation = useMutation({
    mutationFn: async () => {
      // Validate IP format
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
      if (!ipRegex.test(newIP)) {
        throw new Error('Formato de IP inválido. Use: xxx.xxx.xxx.xxx ou xxx.xxx.xxx.xxx/xx');
      }

      const { error } = await supabase.from('ip_allowlist').insert({
        ip_address: newIP,
        description: description || null,
        is_global: isGlobal,
        user_id: isGlobal ? null : (selectedUserId || null),
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-allowlist'] });
      toast.success('IP adicionado com sucesso');
      setShowAddDialog(false);
      setNewIP('');
      setDescription('');
      setIsGlobal(true);
      setSelectedUserId('');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao adicionar IP');
    },
  });

  const toggleIPMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('ip_allowlist')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-allowlist'] });
      toast.success('Status atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const deleteIPMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ip_allowlist')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-allowlist'] });
      toast.success('IP removido');
    },
    onError: () => {
      toast.error('Erro ao remover IP');
    },
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    const profile = profiles.find(p => p.id === userId);
    return profile?.full_name || 'Usuário desconhecido';
  };

  if (!isCoordinator) {
    return null;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Lista de IPs Permitidos
            </CardTitle>
            <CardDescription>
              Configure quais endereços IP podem acessar o sistema
            </CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar IP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar IP à Lista</DialogTitle>
                <DialogDescription>
                  Adicione um endereço IP ou range de IPs permitidos
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ip">Endereço IP</Label>
                  <Input
                    id="ip"
                    placeholder="192.168.1.1 ou 192.168.1.0/24"
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use notação CIDR para ranges (ex: /24 para 256 IPs)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Escritório matriz"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP Global</Label>
                    <p className="text-xs text-muted-foreground">
                      Aplicar para todos os usuários
                    </p>
                  </div>
                  <Switch
                    checked={isGlobal}
                    onCheckedChange={setIsGlobal}
                  />
                </div>

                {!isGlobal && (
                  <div className="space-y-2">
                    <Label>Usuário específico</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name || 'Sem nome'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => addIPMutation.mutate()}
                    disabled={!newIP || addIPMutation.isPending}
                  >
                    {addIPMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {ipList.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">Nenhum IP configurado</p>
            <p className="text-sm text-muted-foreground">
              Quando não há IPs configurados, o acesso é permitido de qualquer local.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border bg-warning/10 border-warning/30 p-3 mb-4">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                <p className="text-sm text-warning">
                  Quando há IPs na lista, apenas conexões desses endereços serão permitidas.
                  Certifique-se de incluir seu IP atual.
                </p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipList.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono">{entry.ip_address}</TableCell>
                    <TableCell>{entry.description || '-'}</TableCell>
                    <TableCell>
                      {entry.is_global ? (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Global
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <User className="h-3 w-3" />
                          {getUserName(entry.user_id)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={entry.is_active}
                        onCheckedChange={(checked) =>
                          toggleIPMutation.mutate({ id: entry.id, isActive: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteIPMutation.mutate(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
