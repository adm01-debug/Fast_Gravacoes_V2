import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  Plus,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  History,
  Settings,
  MapPin
} from 'lucide-react';
import { useGeoBlockingSettings, useGeoBlockingRules, useGeoBlockingLogs, useUpdateGeoSettings, useAddCountryRule, useRemoveCountryRule, COMMON_COUNTRIES } from '@/features/admin/hooks/useGeoBlocking';
import { useAuth } from '@/features/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function GeoBlockingSettings() {
  const { isCoordinator } = useAuth();
  const { data: settings, isLoading: loadingSettings } = useGeoBlockingSettings();
  const { data: rules, isLoading: loadingRules } = useGeoBlockingRules();
  const { data: logs } = useGeoBlockingLogs();
  const updateSettings = useUpdateGeoSettings();
  const addCountry = useAddCountryRule();
  const removeCountry = useRemoveCountryRule();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [reason, setReason] = useState('');

  // Países permitidos (no modo allowlist, is_blocked=false significa permitido)
  const allowedCountries = rules?.filter(r => !r.is_blocked || r.block_type === 'allow') || [];

  // Países disponíveis para adicionar
  const availableCountries = COMMON_COUNTRIES.filter(
    c => !rules?.some(r => r.country_code === c.code)
  );

  const handleAddCountry = async () => {
    const country = COMMON_COUNTRIES.find(c => c.code === selectedCountry);
    if (!country) return;

    await addCountry.mutateAsync({
      countryCode: country.code,
      countryName: country.name,
      isAllowed: true,
      reason: reason || undefined
    });

    setSelectedCountry('');
    setReason('');
    setIsAddDialogOpen(false);
  };

  const handleRemoveCountry = async (ruleId: string) => {
    await removeCountry.mutateAsync(ruleId);
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    await updateSettings.mutateAsync({ is_enabled: enabled });
  };

  const handleToggleBlockUnknown = async (block: boolean) => {
    await updateSettings.mutateAsync({ block_unknown_countries: block });
  };

  const handleToggleLogging = async (log: boolean) => {
    await updateSettings.mutateAsync({ log_blocked_attempts: log });
  };

  if (!isCoordinator) return null;
  if (loadingSettings || loadingRules) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando configurações...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configurações Gerais */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <div>
                <CardTitle>Bloqueio Geográfico</CardTitle>
                <CardDescription>
                  Controle de acesso baseado em localização geográfica
                </CardDescription>
              </div>
            </div>
            <Badge variant={settings?.is_enabled ? 'default' : 'secondary'}>
              {settings?.is_enabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle Principal */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Ativar Bloqueio Geográfico</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, apenas países na lista de permitidos terão acesso
              </p>
            </div>
            <Switch
              checked={settings?.is_enabled || false}
              onCheckedChange={handleToggleEnabled}
            />
          </div>

          {/* Modo - Fixo como Whitelist */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              <Label className="text-base font-medium">Modo: Whitelist (Lista de Permitidos)</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Apenas países adicionados à lista abaixo terão permissão de acesso ao sistema.
              Todos os outros países serão bloqueados automaticamente.
            </p>
          </div>

          {/* Opções Adicionais */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Bloquear Países Desconhecidos</Label>
                <p className="text-xs text-muted-foreground">
                  Bloquear quando não for possível identificar o país
                </p>
              </div>
              <Switch
                checked={settings?.block_unknown_countries || false}
                onCheckedChange={handleToggleBlockUnknown}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label>Registrar Tentativas Bloqueadas</Label>
                <p className="text-xs text-muted-foreground">
                  Manter log de acessos bloqueados
                </p>
              </div>
              <Switch
                checked={settings?.log_blocked_attempts || false}
                onCheckedChange={handleToggleLogging}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Países Permitidos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <div>
                <CardTitle>Países Permitidos</CardTitle>
                <CardDescription>
                  Lista de países com acesso autorizado ao sistema
                </CardDescription>
              </div>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar País
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar País à Lista de Permitidos</DialogTitle>
                  <DialogDescription>
                    Selecione um país para permitir acesso ao sistema
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>País</Label>
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um país" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {availableCountries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name} ({country.code})
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo (opcional)</Label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex: Sede da empresa"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddCountry}
                    disabled={!selectedCountry || addCountry.isPending}
                  >
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {allowedCountries.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhum país adicionado à lista de permitidos.
                {settings?.is_enabled && ' Se o bloqueio estiver ativo, nenhum acesso será permitido.'}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {settings?.is_enabled && (
                <Alert className="mb-4 border-green-500/50 bg-green-500/10">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    <strong>Whitelist ativa:</strong> Apenas os {allowedCountries.length} país(es)
                    listado(s) abaixo têm permissão de acesso.
                  </AlertDescription>
                </Alert>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>País</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Adicionado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allowedCountries.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                          {rule.country_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.country_code}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rule.reason || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(rule.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveCountry(rule.id)}
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

      {/* Logs de Bloqueio */}
      {settings?.log_blocked_attempts && logs && logs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <div>
                <CardTitle>Histórico de Bloqueios</CardTitle>
                <CardDescription>
                  Últimas tentativas de acesso bloqueadas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {String(log.ip_address)}
                      </TableCell>
                      <TableCell>
                        {log.country_name ? (
                          <Badge variant="outline">
                            {log.country_name} ({log.country_code})
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Desconhecido</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={log.action === 'blocked' ? 'destructive' : 'default'}
                        >
                          {log.action === 'blocked' ? 'Bloqueado' : log.action}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
