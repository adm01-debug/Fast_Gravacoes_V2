import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Code2,
  Terminal,
  Copy,
  Key,
  Activity,
  Server,
  Zap,
  ShieldCheck,
  Globe,
  Database,
  Lock,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function MasterAPIPage() {
  const [apiKey, setApiKey] = useState('sk_live_fast_9283749123847');
  const [showKey, setShowKey] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const ENDPOINTS = [
    { method: 'GET', path: '/api/v1/jobs', desc: 'Listar todos os jobs ativos', params: 'technique_id, status' },
    { method: 'POST', path: '/api/v1/jobs', desc: 'Criar novo job via ERP', params: 'client, order_number, quantity' },
    { method: 'GET', path: '/api/v1/inventory', desc: 'Sincronizar saldo de estoque', params: 'category' },
    { method: 'PATCH', path: '/api/v1/machines/:id', desc: 'Atualizar status de máquina', params: 'is_active, maintenance_mode' },
  ];

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
        <Breadcrumbs />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl text-title font-bold flex items-center gap-3">
              <Code2 className="h-8 w-8 text-primary" />
              Master API Master Hub
            </h1>
            <p className="text-muted-foreground mt-1">Conecte sua fábrica a qualquer ERP, CRM ou BI Externo</p>
          </div>
          <div className="flex gap-2">
             <Badge variant="outline" className="bg-success/10 text-success border-success/20 uppercase font-black px-3 py-1">
               <div className="w-1.5 h-1.5 rounded-full bg-success mr-2 animate-pulse" />
               Sistemas Operantes
             </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* API Key Section */}
          <Card className="glass-card lg:col-span-1 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Credenciais Master
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                 <Label className="text-[10px] font-black uppercase text-muted-foreground">API Secret Key</Label>
                 <div className="flex gap-2">
                    <div className="flex-1 bg-background/50 border border-border/50 rounded-lg px-3 py-2 font-mono text-xs flex items-center overflow-hidden">
                       {showKey ? apiKey : '••••••••••••••••••••••••'}
                    </div>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowKey(!showKey)}>
                       <Lock className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => copyToClipboard(apiKey)}>
                       <Copy className="h-4 w-4" />
                    </Button>
                 </div>
              </div>
              <div className="pt-4 border-t border-border/30 space-y-3">
                 <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Requisições (24h)</span>
                    <span className="font-bold">12,482</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Tempo Médio Resposta</span>
                    <span className="font-bold text-success">42ms</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status do Gateway</span>
                    <Badge className="bg-success h-4 text-[9px] font-black">ONLINE</Badge>
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Config */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card className="glass-card hover:border-primary/40 transition-all cursor-pointer">
                <CardContent className="pt-6">
                   <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                         <Globe className="h-6 w-6" />
                      </div>
                      <div>
                         <h4 className="font-bold text-sm">Webhooks de Eventos</h4>
                         <p className="text-xs text-muted-foreground mt-1">Configure URLs para receber notificações em tempo real de fim de produção.</p>
                      </div>
                   </div>
                </CardContent>
             </Card>
             <Card className="glass-card hover:border-primary/40 transition-all cursor-pointer">
                <CardContent className="pt-6">
                   <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600">
                         <Database className="h-6 w-6" />
                      </div>
                      <div>
                         <h4 className="font-bold text-sm">Data Warehouse Sync</h4>
                         <p className="text-xs text-muted-foreground mt-1">Exportação bruta diária via SFTP ou Azure Blob Storage.</p>
                      </div>
                   </div>
                </CardContent>
             </Card>
          </div>
        </div>

        <Tabs defaultValue="docs" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
             <TabsTrigger value="docs" className="gap-2">
                <Terminal className="h-4 w-4" />
                Documentação Master (Swagger)
             </TabsTrigger>
             <TabsTrigger value="logs" className="gap-2">
                <Activity className="h-4 w-4" />
                API Health & Logs
             </TabsTrigger>
          </TabsList>

          <TabsContent value="docs" className="space-y-6">
             <Card className="glass-card overflow-hidden">
                <CardHeader className="bg-muted/10 border-b border-border/50 flex flex-row items-center justify-between">
                   <div>
                      <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-primary">
                         <Server className="h-5 w-5" />
                         Endpoints Restful v1
                      </CardTitle>
                      <CardDescription>Siga o padrão JSON:API para integração bidirecional</CardDescription>
                   </div>
                   <Button variant="link" className="text-xs font-bold gap-1 text-primary p-0">
                      Abrir no OpenAPI <ExternalLink className="h-3 w-3" />
                   </Button>
                </CardHeader>
                <CardContent className="p-0">
                   <div className="divide-y divide-border/30">
                      {ENDPOINTS.map((ep, idx) => (
                        <div key={idx} className="p-6 hover:bg-muted/10 transition-colors group">
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                 <Badge className={cn(
                                   "font-black text-[10px] w-16 flex justify-center",
                                   ep.method === 'GET' ? "bg-success" :
                                   ep.method === 'POST' ? "bg-blue-500" : "bg-warning"
                                 )}>
                                    {ep.method}
                                 </Badge>
                                 <code className="bg-muted px-2 py-1 rounded text-xs font-bold">{ep.path}</code>
                              </div>
                              <span className="text-sm font-medium text-foreground">{ep.desc}</span>
                           </div>
                           <div className="mt-4 flex flex-wrap gap-2">
                              {ep.params.split(', ').map(p => (
                                <Badge key={p} variant="secondary" className="text-[9px] bg-muted/50 text-muted-foreground border-none">
                                   {p}
                                </Badge>
                              ))}
                           </div>
                        </div>
                      ))}
                   </div>
                </CardContent>
             </Card>

             <Card className="glass-card bg-slate-900 border-slate-800 text-slate-100 overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-800">
                   <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Exemplo de Requisição (Node.js)</CardTitle>
                      <Badge variant="secondary" className="bg-slate-800 text-slate-400 border-slate-700">fetch API</Badge>
                   </div>
                </CardHeader>
                <CardContent className="p-0">
                   <ScrollArea className="h-48 font-mono text-[11px] p-6 leading-relaxed">
<pre className="text-success">
{`const response = await fetch('https://api.fastgravacoes.com/v1/jobs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_fast_XXXX',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    order_number: "2024-001",
    client: "Nike Global",
    quantity: 500,
    technique_id: "728a-..."
  })
});

const data = await response.json();
`}
</pre>
                   </ScrollArea>
                </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="logs">
             <div className="flex flex-col items-center justify-center py-24 text-muted-foreground italic border-2 border-dashed rounded-3xl">
                <Activity className="h-12 w-12 opacity-20 mb-4" />
                <p>Nenhuma atividade suspeita detectada nos últimos 7 dias.</p>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
