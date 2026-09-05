/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RefreshCw, ArrowRight, Download, Settings2, Loader2, Check, Link2, Database, Layers, X, Trash2 } from 'lucide-react';
import { Bitrix24SyncPanel } from '@/components/integrations/Bitrix24SyncPanel';
import { Bitrix24SyncHistory } from '@/components/integrations/Bitrix24SyncHistory';
import { Bitrix24MappingDialog } from '@/features/analytics/components/bitrix24/Bitrix24MappingDialog';
import { useToast } from '@/hooks/use-toast';
import { createAppError } from '@/lib/errorHandling';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { edgeFunctionFetch } from '@/lib/edgeFunctionFetch';

interface FieldInfo {
  type: string; isRequired: boolean; isReadOnly: boolean; isImmutable: boolean; isMultiple: boolean; title: string; formLabel?: string; listLabel?: string;
}

interface MappingRecord {
  id: string; mapping_type: string; source_key: string; target_key: string; priority: number; is_active: boolean;
}

const JOB_FIELDS = [
  { id: 'client', label: 'Cliente', description: 'Nome do cliente' },
  { id: 'product', label: 'Produto', description: 'Descrição do produto' },
  { id: 'quantity', label: 'Quantidade', description: 'Quantidade de peças' },
  { id: 'technique_id', label: 'Técnica', description: 'Tipo de gravação/personalização' },
  { id: 'priority', label: 'Prioridade', description: 'Nível de urgência' },
  { id: 'scheduled_date', label: 'Data Agendada', description: 'Data prevista para produção' },
  { id: 'gravure_color', label: 'Cor da Gravura', description: 'Cor a ser aplicada' },
  { id: 'notes', label: 'Observações', description: 'Notas adicionais' },
  { id: 'estimated_duration', label: 'Duração Estimada', description: 'Tempo em minutos' },
];

const Bitrix24ConfigPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [bitrixFields, setBitrixFields] = useState<Record<string, FieldInfo>>({});
  const [allMappings, setAllMappings] = useState<MappingRecord[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteMappingConfirm, setDeleteMappingConfirm] = useState<MappingRecord | null>(null);
  const [newMapping, setNewMapping] = useState({ mapping_type: 'field', source_key: '', target_key: '', priority: 0 });
  const { toast } = useToast();

  const callBitrixSync = async (action: string, body?: Record<string, unknown>): Promise<Record<string, unknown> & { customFields?: Record<string, FieldInfo>; totalCustomFields?: number; mappings?: MappingRecord[] }> => {
    const response = await edgeFunctionFetch(`bitrix24-sync?action=${action}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Request failed'); }
    return response.json();
  };

  const fetchBitrixFields = async () => {
    setIsLoading(true);
    try { const result = await callBitrixSync('fields'); setBitrixFields(result.customFields || {}); toast({ title: 'Campos carregados', description: `${result.totalCustomFields || 0} campos personalizados encontrados.` }); }
    catch (error) { toast({ title: 'Erro ao carregar campos', description: createAppError(error instanceof Error ? error : new Error(String(error))).message, variant: 'destructive' }); }
    finally { setIsLoading(false); }
  };

  const fetchMappings = async () => {
    setIsLoading(true);
    try { const result = await callBitrixSync('list-mappings'); setAllMappings(result.mappings || []); }
    catch (error) { toast({ title: 'Erro ao carregar mapeamentos', description: createAppError(error instanceof Error ? error : new Error(String(error))).message, variant: 'destructive' }); }
    finally { setIsLoading(false); }
  };

  const saveMapping = async () => {
    if (!newMapping.source_key || !newMapping.target_key) { toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos', variant: 'destructive' }); return; }
    setIsLoading(true);
    try { await callBitrixSync('save-mapping', newMapping); toast({ title: 'Mapeamento salvo' }); setAddDialogOpen(false); setNewMapping({ mapping_type: 'field', source_key: '', target_key: '', priority: 0 }); await fetchMappings(); }
    catch (error) { toast({ title: 'Erro ao salvar', description: createAppError(error instanceof Error ? error : new Error(String(error))).message, variant: 'destructive' }); }
    finally { setIsLoading(false); }
  };

  const handleDeleteMapping = async () => {
    if (!deleteMappingConfirm) return;
    setIsLoading(true);
    try { await callBitrixSync('delete-mapping', { id: deleteMappingConfirm.id }); toast({ title: 'Mapeamento removido' }); await fetchMappings(); }
    catch (error) { toast({ title: 'Erro ao remover', description: createAppError(error instanceof Error ? error : new Error(String(error))).message, variant: 'destructive' }); }
    finally { setIsLoading(false); setDeleteMappingConfirm(null); }
  };

  useEffect(() => { fetchMappings(); }, []);

  const getMappingsByType = (type: string) => allMappings.filter(m => m.mapping_type === type);
  const getFieldMappings = () => { const fieldMappings = getMappingsByType('field'); const grouped: Record<string, MappingRecord[]> = {}; for (const mapping of fieldMappings) { if (!grouped[mapping.source_key]) grouped[mapping.source_key] = []; grouped[mapping.source_key].push(mapping); } return grouped; };
  const getFieldTitle = (fieldKey: string): string => { const field = bitrixFields[fieldKey]; return field?.title || field?.formLabel || fieldKey; };

  const getPriorityColor = (target: string) => {
    switch (target) {
      case 'urgent': return 'text-red-400 border-red-500/30';
      case 'high': return 'text-orange-400 border-orange-500/30';
      case 'medium': return 'text-yellow-400 border-yellow-500/30';
      default: return 'text-green-400 border-green-500/30';
    }
  };

  const getStageColor = (target: string) => {
    switch (target) {
      case 'finished': return 'text-green-400 border-green-500/30';
      case 'production': return 'text-blue-400 border-blue-500/30';
      case 'ready': return 'text-cyan-400 border-cyan-500/30';
      case 'cancelled': return 'text-red-400 border-red-500/30';
      default: return 'text-yellow-400 border-yellow-500/30';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <Breadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-title font-bold text-foreground flex items-center gap-3"><Settings2 className="h-7 w-7 text-primary" />Configuração Bitrix24</h1>
            <p className="text-muted-foreground mt-1">Configure a integração, mapeamento de campos e categorias de deals</p>
          </div>
          <Bitrix24MappingDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} newMapping={newMapping} setNewMapping={setNewMapping} onSave={saveMapping} isLoading={isLoading} bitrixFields={bitrixFields} />
        </div>

        <Bitrix24SyncPanel />

        <Tabs defaultValue="mapping" className="space-y-4">
          <TabsList className="bg-muted/30 border border-border/50">
            <TabsTrigger value="mapping" className="gap-2"><Link2 className="h-4 w-4" />Mapeamento de Campos</TabsTrigger>
            <TabsTrigger value="values" className="gap-2"><Layers className="h-4 w-4" />Mapeamento de Valores</TabsTrigger>
            <TabsTrigger value="bitrix-fields" className="gap-2"><Database className="h-4 w-4" />Campos Bitrix24</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><RefreshCw className="h-4 w-4" />Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="mapping" className="space-y-4">
            <Card className="glass-card border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-primary" />Mapeamento de Campos</CardTitle><CardDescription>Campos do sistema mapeados para campos UF_CRM_* do Bitrix24</CardDescription></div>
                  <Button variant="outline" onClick={fetchMappings} disabled={isLoading} className="gap-2">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Atualizar</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6 bg-green-500/10 border-green-500/30"><Check className="h-4 w-4 text-green-400" /><AlertTitle className="text-green-400">Mapeamento Dinâmico Ativo</AlertTitle><AlertDescription className="text-green-300/80">Os mapeamentos são carregados do banco de dados e aplicados em tempo real.</AlertDescription></Alert>
                <div className="space-y-4">
                  {JOB_FIELDS.map(jobField => {
                    const mappings = getFieldMappings()[jobField.id] || [];
                    return (
                      <div key={jobField.id} className="p-4 rounded-lg bg-muted/20 border border-border/30">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1"><span className="font-medium text-foreground">{jobField.label}</span><Badge variant="outline" className="text-xs">{jobField.id}</Badge></div>
                            <p className="text-sm text-muted-foreground mb-3">{jobField.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">Campos Bitrix:</span>
                              {mappings.length > 0 ? mappings.map(mapping => (
                                <div key={mapping.id} className="flex items-center gap-1"><Badge variant="secondary" className="text-xs">{getFieldTitle(mapping.target_key) || mapping.target_key}<span className="text-muted-foreground ml-1">(#{mapping.priority})</span></Badge><Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => setDeleteMappingConfirm(mapping)}><X className="h-3 w-3" /></Button></div>
                              )) : <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-500/30">Não configurado</Badge>}
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground mt-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="values" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[{ type: 'technique', title: 'Mapeamento de Técnicas', desc: 'Converte valores do Bitrix24 para IDs de técnicas' }, { type: 'priority', title: 'Mapeamento de Prioridades', desc: 'Converte valores de urgência do Bitrix24' }].map(({ type, title, desc }) => (
                <Card key={type} className="glass-card border-border/50"><CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{desc}</CardDescription></CardHeader><CardContent><ScrollArea className="h-64"><div className="space-y-2">{getMappingsByType(type).map(mapping => (<div key={mapping.id} className="flex items-center justify-between p-2 rounded bg-muted/20 group"><code className="text-xs text-muted-foreground">{mapping.source_key}</code><ArrowRight className="h-3 w-3 text-muted-foreground" /><Badge variant="outline" className={`text-xs ${type === 'priority' ? getPriorityColor(mapping.target_key) : ''}`}>{mapping.target_key}</Badge><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => setDeleteMappingConfirm(mapping)}><Trash2 className="h-3 w-3" /></Button></div>))}{getMappingsByType(type).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum mapeamento configurado</p>}</div></ScrollArea></CardContent></Card>
              ))}
              <Card className="glass-card border-border/50 lg:col-span-2"><CardHeader><CardTitle className="text-base">Mapeamento de Status (Stages)</CardTitle><CardDescription>Converte estágios do funil do Bitrix24 para status do sistema</CardDescription></CardHeader><CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{getMappingsByType('stage').map(mapping => (<div key={mapping.id} className="flex items-center justify-between p-3 rounded bg-muted/20 group"><div className="text-center flex-1"><code className="text-xs text-muted-foreground block">{mapping.source_key}</code><ArrowRight className="h-3 w-3 text-muted-foreground mx-auto my-1" /><Badge variant="outline" className={`text-xs ${getStageColor(mapping.target_key)}`}>{mapping.target_key}</Badge></div><Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => setDeleteMappingConfirm(mapping)}><Trash2 className="h-3 w-3" /></Button></div>))}{getMappingsByType('stage').length === 0 && <p className="text-sm text-muted-foreground text-center py-4 col-span-full">Nenhum mapeamento configurado</p>}</div></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="bitrix-fields" className="space-y-4">
            <Card className="glass-card border-border/50"><CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" />Campos Personalizados do Bitrix24</CardTitle><CardDescription>Lista de campos UF_CRM_* disponíveis</CardDescription></div><Button onClick={fetchBitrixFields} disabled={isLoading} className="gap-2">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Carregar do Bitrix</Button></div></CardHeader><CardContent>{Object.keys(bitrixFields).length > 0 ? (<ScrollArea className="h-96"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{Object.entries(bitrixFields).map(([key, field]) => (<div key={key} className="p-3 rounded-lg bg-muted/20 border border-border/30"><div className="font-mono text-xs text-primary truncate mb-1">{key}</div><div className="text-sm text-foreground truncate">{field.title}</div><div className="flex items-center gap-2 mt-2"><Badge variant="outline" className="text-xs">{field.type}</Badge>{field.isRequired && <Badge className="text-xs bg-red-500/20 text-red-400">Obrigatório</Badge>}{field.isMultiple && <Badge className="text-xs bg-blue-500/20 text-blue-400">Múltiplo</Badge>}</div></div>))}</div></ScrollArea>) : (<div className="text-center py-12"><Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Clique em "Carregar do Bitrix" para ver os campos disponíveis</p></div>)}</CardContent></Card>
          </TabsContent>

          <TabsContent value="history"><Bitrix24SyncHistory /></TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteMappingConfirm} onOpenChange={() => setDeleteMappingConfirm(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover Mapeamento</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja remover este mapeamento?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteMapping} disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Bitrix24ConfigPage;
