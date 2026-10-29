import { useState } from 'react';
import { useRateLimitSettings, useUpdateRateLimitSetting, useCreateRateLimitSetting, useDeleteRateLimitSetting } from '@/features/admin/hooks/useRateLimitLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import {
  Gauge,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Settings2
} from 'lucide-react';

export function RateLimitSettings() {
  const { data: settings, isLoading } = useRateLimitSettings();
  const updateSetting = useUpdateRateLimitSetting();
  const createSetting = useCreateRateLimitSetting();
  const deleteSetting = useDeleteRateLimitSetting();

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    endpoint_pattern: '',
    max_requests: 100,
    window_seconds: 60,
    block_duration_minutes: 15,
    is_active: true,
  });

  const handleEdit = (setting: NonNullable<typeof settings>[number]) => {
    setFormData({
      endpoint_pattern: setting.endpoint_pattern,
      max_requests: setting.max_requests,
      window_seconds: setting.window_seconds,
      block_duration_minutes: setting.block_duration_minutes,
      is_active: setting.is_active,
    });
    setEditingId(setting.id);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (editingId) {
      await updateSetting.mutateAsync({ id: editingId, ...formData });
    } else {
      await createSetting.mutateAsync(formData);
    }
    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteSetting.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingId(null);
    setFormData({
      endpoint_pattern: '',
      max_requests: 100,
      window_seconds: 60,
      block_duration_minutes: 15,
      is_active: true,
    });
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateSetting.mutateAsync({ id, is_active: isActive });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurações de Rate Limiting
            </CardTitle>
            <CardDescription>
              Configure limites de requisição por endpoint
            </CardDescription>
          </div>
          <Button onClick={() => setShowDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Regra
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead className="text-center">Max Req.</TableHead>
                <TableHead className="text-center">Janela (s)</TableHead>
                <TableHead className="text-center">Bloqueio (min)</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings?.map((setting) => (
                <TableRow key={setting.id}>
                  <TableCell className="font-mono text-sm">
                    {setting.endpoint_pattern}
                  </TableCell>
                  <TableCell className="text-center">
                    {setting.max_requests}
                  </TableCell>
                  <TableCell className="text-center">
                    {setting.window_seconds}
                  </TableCell>
                  <TableCell className="text-center">
                    {setting.block_duration_minutes}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={setting.is_active}
                      onCheckedChange={(checked) =>
                        handleToggleActive(setting.id, checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(setting)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleteId(setting.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              {editingId ? 'Editar Regra' : 'Nova Regra de Rate Limit'}
            </DialogTitle>
            <DialogDescription>
              Configure os limites de requisição para este endpoint
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="endpoint">Padrão do Endpoint</Label>
              <Input
                id="endpoint"
                placeholder="/auth/login ou * para todos"
                value={formData.endpoint_pattern}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  endpoint_pattern: e.target.value
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Use * para wildcard (ex: /api/*)
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_requests">Max Requisições</Label>
                <Input
                  id="max_requests"
                  type="number"
                  min="1"
                  value={formData.max_requests}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    max_requests: parseInt(e.target.value, 10) || 1
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="window">Janela (seg)</Label>
                <Input
                  id="window"
                  type="number"
                  min="1"
                  value={formData.window_seconds}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    window_seconds: parseInt(e.target.value, 10) || 60
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="block">Bloqueio (min)</Label>
                <Input
                  id="block"
                  type="number"
                  min="1"
                  value={formData.block_duration_minutes}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    block_duration_minutes: parseInt(e.target.value, 10) || 15
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Regra Ativa</Label>
                <p className="text-sm text-muted-foreground">
                  Ativar esta regra de rate limiting
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, is_active: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.endpoint_pattern || createSetting.isPending || updateSetting.isPending}
            >
              {(createSetting.isPending || updateSetting.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
