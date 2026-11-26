import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Code2,
  Terminal,
  Activity,
  Server,
  Globe,
  Database,
  ExternalLink
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ErpApiKeysPanel } from '@/features/admin/components/integrations/ErpApiKeysPanel';
import { useErpApiKeys } from '@/features/admin/hooks/useErpApiKeys';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const OPENAPI_SPEC_URL =
  'https://github.com/adm01-debug/Fast_Gravacoes_V2/blob/main/docs/operacoes/openapi-edge-functions.yaml';

const formatarUso = (valor: string | null) =>
  valor ? new Date(valor).toLocaleString('pt-BR') : 'nunca usada';

export default function MasterAPIPage() {
  const { keys: chaves, ativas, isLoading, error: erroChaves } = useErpApiKeys();
  const chavesOk = !erroChaves && !isLoading && ativas > 0;
  const rotuloChaves = erroChaves
    ? 'Chaves sem acesso'
    : isLoading
      ? 'Consultando chaves…'
      : `${ativas} ${ativas === 1 ? 'chave ativa' : 'chaves ativas'}`;

  // Caminhos reais servidos por supabase/functions/erp-api (API_DOCS da função e
  // docs/operacoes/openapi-edge-functions.yaml). Os anteriores
  // (/api/v1/..., /inventory) nunca existiram e induziam a integração ao erro.
  const ENDPOINTS = [
    { method: 'GET', path: '/jobs', desc: 'Lista jobs de produção', params: 'status, date, limit, offset' },
    { method: 'GET', path: '/jobs/:id', desc: 'Busca job por ID', params: 'id' },
    { method: 'POST', path: '/jobs', desc: 'Cria novo job (external_ref evita duplicidade)', params: 'order_number, client, product, quantity, technique_id, priority, scheduled_date, external_ref' },
    { method: 'PATCH', path: '/jobs/:id', desc: 'Atualiza job existente', params: 'status, machine_id, scheduled_date, priority, produced_quantity, lost_pieces, notes' },
    { method: 'GET', path: '/machines', desc: 'Lista máquinas ativas', params: '' },
    { method: 'GET', path: '/operators', desc: 'Lista operadores', params: '' },
    { method: 'GET', path: '/production/summary', desc: 'Resumo de produção do dia', params: 'date' },
    { method: 'GET', path: '/lots', desc: 'Lista lotes', params: 'limit, offset' },
    { method: 'POST', path: '/lots', desc: 'Cria lote de produção', params: 'job_id, lot_number, quantity, operator_id, notes' },
    { method: 'GET', path: '/kpis', desc: 'KPIs de produção', params: 'date' },
  ];

  const apiBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/erp-api`;

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
          <div className="flex gap-2 items-center">
             <Badge
               variant="outline"
               className={cn(
                 'uppercase font-black px-3 py-1',
                 chavesOk
                   ? 'bg-success/10 text-success border-success/20'
                   : 'bg-muted/50 text-muted-foreground border-border',
               )}
             >
               <div className={cn('w-1.5 h-1.5 rounded-full mr-2', chavesOk && 'bg-success animate-pulse')} />
               {rotuloChaves}
             </Badge>
          </div>
        </div>

        {/* Chaves da API ERP — antes esta área exibia a chave fictícia
            `sk_live_fast_XXXX` e métricas fixas ("12,482", "42ms"); agora lê
            public.erp_api_keys e emite/revoga chaves de verdade. */}
        <ErpApiKeysPanel />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                   <a href={OPENAPI_SPEC_URL} target="_blank" rel="noopener noreferrer">
                      <Button variant="link" className="text-xs font-bold gap-1 text-primary p-0">
                         Abrir no OpenAPI <ExternalLink className="h-3 w-3" />
                      </Button>
                   </a>
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
                           {ep.params && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                 {ep.params.split(', ').map(p => (
                                   <Badge key={p} variant="secondary" className="text-[9px] bg-muted/50 text-muted-foreground border-none">
                                      {p}
                                   </Badge>
                                 ))}
                              </div>
                           )}
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
{`const response = await fetch('${apiBase}/jobs', {
  method: 'POST',
  headers: {
    // Chave emitida em "Chaves da API ERP" (exibida uma única vez na criação)
    'x-api-key': 'fgv_live_<sua_chave>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    order_number: "2026-001",
    client: "Promo Design",
    product: "Camiseta Dry Fit",
    quantity: 500,
    technique_id: "laser-co2",
    external_ref: "OS-12345"   // idempotência: reenvio devolve o mesmo job
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
             <Card className="glass-card">
                <CardHeader className="pb-3">
                   <CardTitle className="text-sm font-black uppercase tracking-widest">Uso das chaves da API</CardTitle>
                   <CardDescription>
                      Último acesso registrado por chave (public.erp_api_keys.last_used_at). A API não guarda
                      histórico por requisição.
                   </CardDescription>
                </CardHeader>
                <CardContent>
                   {erroChaves ? (
                      <p className="text-sm text-muted-foreground">
                         Sem acesso ao registro de uso: {erroChaves.message}
                      </p>
                   ) : isLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando chaves…</p>
                   ) : chaves.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma chave emitida ainda.</p>
                   ) : (
                      <div className="space-y-2">
                         {chaves.map((chave) => (
                            <div
                              key={chave.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/30 pb-2 last:border-0 last:pb-0"
                            >
                               <span className="text-sm font-bold">{chave.name}</span>
                               <span className="text-xs text-muted-foreground">
                                  {chave.is_active ? 'Ativa' : 'Revogada'} · último uso: {formatarUso(chave.last_used_at)}
                               </span>
                            </div>
                         ))}
                      </div>
                   )}
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
