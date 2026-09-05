/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Clock, AlertTriangle, AlertCircle, Calendar, Mail, MessageCircle, Settings, Check, Send, History, Layout, Users, ShieldCheck, X, ListTodo, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTPMNotifications } from '@/features/notifications';
import { useNotificationSettings } from '@/features/notifications';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TPMNotificationTemplates } from './TPMNotificationTemplates';
import { TPMNotificationLogs } from './TPMNotificationLogs';
import { TPMSeverityConfigs } from './TPMSeverityConfigs';
import { TPMNotificationQueue } from './TPMNotificationQueue';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ValidationRecipient {
  user_id: string;
  whatsapp_number?: string | null;
}
interface ValidationData {
  machine: { code: string; name: string };
  recipients: ValidationRecipient[];
}
type TestChannel = 'email' | 'whatsapp' | 'push';

export function TPMNotificationSettings() {
  const { permission, isSupported, requestPermission, sendTestNotification } = useTPMNotifications();
  const { settings, isLoading, updateSettings } = useNotificationSettings();
  const { machines } = useTPM();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [testMachineId, setTestMachineId] = useState<string>('');
  const [testChannel, setTestChannel] = useState<'email' | 'whatsapp' | 'push'>('push');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    if (settings?.whatsapp_number) {
      setWhatsappNumber(settings.whatsapp_number);
    }
  }, [settings]);

  const handleToggleType = (type: string) => {
    if (!settings) return;
    const currentTypes = settings.notification_types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];

    updateSettings.mutate({ notification_types: newTypes });
  };

  const handleToggleMachine = (machineId: string) => {
    if (!settings) return;
    const currentFilters = settings.machine_filters || [];
    const newFilters = currentFilters.includes(machineId)
      ? currentFilters.filter(id => id !== machineId)
      : [...currentFilters, machineId];

    updateSettings.mutate({ machine_filters: newFilters });
  };

  const handleSendTest = async (force: boolean = false) => {
    if (!testMachineId) {
      toast.error('Selecione uma máquina para o teste');
      return;
    }
    setIsSendingTest(true);
    const result = await sendTestNotification(testMachineId, testChannel, force);

    if (result && result.needsValidation && result.machine) {
      setValidationData({ machine: result.machine, recipients: result.recipients as ValidationRecipient[] });
      setShowValidation(true);
    } else if (result && result.success) {
      setShowValidation(false);
    }

    setIsSendingTest(false);
  };

  if (isLoading) return <div className="p-8 text-center">Carregando configurações...</div>;

  return (
    <>
    <Tabs defaultValue="channels" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4 lg:w-fit">
        <TabsTrigger value="channels" className="flex items-center gap-2">
          <Settings className="h-4 w-4" /> Canais e Regras
        </TabsTrigger>
        <TabsTrigger value="templates" className="flex items-center gap-2">
          <Layout className="h-4 w-4" /> Templates
        </TabsTrigger>
        <TabsTrigger value="queue" className="flex items-center gap-2">
          <Activity className="h-4 w-4" /> Fila e Status
        </TabsTrigger>
        <TabsTrigger value="audit" className="flex items-center gap-2">
          <History className="h-4 w-4" /> Auditoria
        </TabsTrigger>
      </TabsList>

      <TabsContent value="channels">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Configurações de Alerta TPM
              </CardTitle>
              <CardDescription>
                Personalize como e quando você deseja ser notificado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Channels */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Canais de Notificação</h3>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-secondary/10">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">E-mail</p>
                      <p className="text-xs text-muted-foreground">Alertas detalhados na sua caixa de entrada</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.email_enabled}
                    onCheckedChange={(checked) => updateSettings.mutate({ email_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-secondary/10">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium">Push (Navegador)</p>
                      <p className="text-xs text-muted-foreground">Notificações em tempo real na tela</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.push_enabled}
                    onCheckedChange={(checked) => {
                      if (checked && permission !== 'granted') {
                        requestPermission();
                      }
                      updateSettings.mutate({ push_enabled: checked });
                    }}
                  />
                </div>

                <div className="p-4 rounded-lg border border-border/50 bg-secondary/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">WhatsApp</p>
                        <p className="text-xs text-muted-foreground">Alertas críticos via WhatsApp Business</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings?.whatsapp_enabled}
                      onCheckedChange={(checked) => updateSettings.mutate({ whatsapp_enabled: checked })}
                    />
                  </div>
                  {settings?.whatsapp_enabled && (
                    <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                      <Input
                        placeholder="+55 11 99999-9999"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                      />
                      <Button size="sm" onClick={() => updateSettings.mutate({ whatsapp_number: whatsappNumber })}>Salvar</Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Notification */}
              <div className="pt-4 border-t space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Testar Notificação</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select value={testMachineId} onValueChange={setTestMachineId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar máquina" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.code} - {m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={testChannel} onValueChange={(v) => setTestChannel(v as TestChannel)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">Push (Navegador)</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleSendTest(false)}
                  disabled={isSendingTest}
                >
                  <Send className={cn("h-4 w-4 mr-2", isSendingTest && "animate-pulse")} />
                  {isSendingTest ? 'Enviando...' : 'Enviar Teste'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Regras de Severidade</CardTitle>
                <CardDescription>Configure limites e alertas por nível de severidade.</CardDescription>
              </CardHeader>
              <CardContent>
                <TPMSeverityConfigs />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Eventos de Fluxo</CardTitle>
              <CardDescription>Notificações automáticas baseadas em mudanças de status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: 'awaiting_correction', label: 'Aguardando Correção', desc: 'Quando uma execução é devolvida para ajustes.' },
                { id: 'critical_item_approved', label: 'Item Crítico Aprovado', desc: 'Quando um item marcado como crítico é aprovado.' }
              ].map(event => (
                <div key={event.id} className="p-4 rounded-lg border border-border/50 space-y-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{event.label}</span>
                    <span className="text-xs text-muted-foreground">{event.desc}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings?.event_configs?.[event.id]?.email}
                        onCheckedChange={(checked) => {
                          const currentConfigs = settings?.event_configs || {};
                          updateSettings.mutate({
                            event_configs: {
                              ...currentConfigs,
                              [event.id]: { ...currentConfigs[event.id], email: checked }
                            }
                          });
                        }}
                      />
                      <Label className="text-xs">E-mail</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings?.event_configs?.[event.id]?.in_app}
                        onCheckedChange={(checked) => {
                          const currentConfigs = settings?.event_configs || {};
                          updateSettings.mutate({
                            event_configs: {
                              ...currentConfigs,
                              [event.id]: { ...currentConfigs[event.id], in_app: checked }
                            }
                          });
                        }}
                      />
                      <Label className="text-xs">In-App</Label>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Filtros Ativos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Alert Types */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground">Tipos de Alerta Habilitados</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'upcoming', label: 'Próximas', icon: <Calendar className="h-4 w-4 text-blue-400" /> },
                      { id: 'due', label: 'Vence Hoje', icon: <Clock className="h-4 w-4 text-warning" /> },
                      { id: 'overdue', label: 'Atrasadas', icon: <AlertTriangle className="h-4 w-4 text-orange-400" /> },
                      { id: 'critical', label: 'Críticas', icon: <AlertCircle className="h-4 w-4 text-destructive" /> },
                    ].map(type => (
                      <div
                        key={type.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Alternar alerta ${type.label}`}
                        onClick={() => handleToggleType(type.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleType(type.id); } }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border border-border/50 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          settings?.notification_types.includes(type.id) ? "bg-primary/10 border-primary/40" : "bg-card hover:bg-secondary/20"
                        )}
                      >
                        {type.icon}
                        <span className="text-sm font-medium">{type.label}</span>
                        {settings?.notification_types.includes(type.id) && <Check className="h-4 w-4 ml-auto text-primary" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Machine Filters */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground">Filtro por Máquina</h3>
                    <Badge variant="outline">{settings?.machine_filters.length === 0 ? 'Todas' : `${settings?.machine_filters.length} Selecionadas`}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {machines.map(machine => (
                      <Badge
                        key={machine.id}
                        variant={settings?.machine_filters.includes(machine.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleToggleMachine(machine.id)}
                      >
                        {machine.code}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="templates">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Templates de Notificação</CardTitle>
            <CardDescription>Personalize o conteúdo das mensagens enviadas pelo sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <TPMNotificationTemplates />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="queue">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Status da Fila de Notificações</CardTitle>
            <CardDescription>Acompanhe o processamento em tempo real e gerencie retentativas.</CardDescription>
          </CardHeader>
          <CardContent>
            <TPMNotificationQueue />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="audit">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Log de Auditoria</CardTitle>
            <CardDescription>Histórico de todas as notificações tentadas e enviadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <TPMNotificationLogs />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <Dialog open={showValidation} onOpenChange={setShowValidation}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Validação de Destinatários
          </DialogTitle>
          <DialogDescription>
            Confirme os detalhes do teste antes de realizar o envio real.
          </DialogDescription>
        </DialogHeader>

        {validationData && (
          <div className="space-y-4 py-4">
            <div className="p-3 bg-secondary/20 rounded-lg border border-border/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Máquina:</span>
                <span className="font-medium">{validationData.machine.code} - {validationData.machine.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Canal:</span>
                <Badge variant="outline" className="capitalize">{testChannel}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Destinatários ({validationData.recipients.length})
              </h4>
              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                {validationData.recipients.map((r, idx) => (
                  <div key={idx} className="text-xs p-2 border rounded bg-card flex justify-between items-center">
                    <span className="truncate max-w-[150px]">{r.user_id}</span>
                    {testChannel === 'whatsapp' && r.whatsapp_number && (
                      <span className="text-muted-foreground">{r.whatsapp_number}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowValidation(false)}>Cancelar</Button>
          <Button
            onClick={() => handleSendTest(true)}
            disabled={isSendingTest}
          >
            {isSendingTest ? 'Enviando...' : 'Confirmar Envio Real'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
