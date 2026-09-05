import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings2,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Palette,
  Tag,
  List
} from 'lucide-react';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { edgeFunctionFetch } from '@/lib/edgeFunctionFetch';

interface FieldMappingData {
  fieldMapping: Record<string, string[]>;
  techniqueMapping: Record<string, string>;
  priorityMapping: Record<string, string>;
  stageToStatus: Record<string, string>;
  statusToStage: Record<string, string>;
}

interface BitrixCustomField {
  formLabel?: string;
  title?: string;
  type?: string;
}

interface BitrixFieldsData {
  customFields: Record<string, BitrixCustomField>;
  totalCustomFields: number;
  currentMapping: Record<string, string[]>;
  techniqueMapping: Record<string, string>;
  priorityMapping: Record<string, string>;
  stageMapping: Record<string, string>;
}

export const Bitrix24FieldMapping = () => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const { data: mappingData, isLoading: mappingLoading, refetch: refetchMapping } = useQuery({
    queryKey: ['bitrix24-mapping'],
    queryFn: async () => {
      const response = await edgeFunctionFetch('bitrix24-sync?action=mapping');
      const data = await response.json();
      return data as FieldMappingData;
    }
  });

  const { data: fieldsData, isLoading: fieldsLoading, refetch: refetchFields } = useQuery({
    queryKey: ['bitrix24-fields'],
    queryFn: async () => {
      const response = await edgeFunctionFetch('bitrix24-sync?action=fields');
      const data = await response.json();
      return data as BitrixFieldsData;
    },
    enabled: false // Only fetch when requested
  });

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await edgeFunctionFetch('bitrix24-sync?action=test');
      const data = await response.json();

      if (data.connected) {
        toast.success('Conexão com Bitrix24 estabelecida com sucesso!');
      } else if (data.error) {
        toast.error(`Erro de conexão: ${data.error}`);
      }
    } catch (error) {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Falha na conexão com Bitrix24');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const loadBitrixFields = async () => {
    toast.info('Carregando campos do Bitrix24...');
    await refetchFields();
    toast.success('Campos carregados!');
  };

  const isLoading = mappingLoading;

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Mapeamento de Campos
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Testar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadBitrixFields}
              disabled={fieldsLoading}
            >
              {fieldsLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Database className="h-4 w-4 mr-1" />
              )}
              Campos Bitrix
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Carregando...</div>
        ) : (
          <Tabs defaultValue="fields" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="fields" className="text-xs">
                <List className="h-3 w-3 mr-1" />
                Campos
              </TabsTrigger>
              <TabsTrigger value="techniques" className="text-xs">
                <Palette className="h-3 w-3 mr-1" />
                Técnicas
              </TabsTrigger>
              <TabsTrigger value="priorities" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                Prioridades
              </TabsTrigger>
              <TabsTrigger value="stages" className="text-xs">
                <ArrowRight className="h-3 w-3 mr-1" />
                Estágios
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fields">
              <ScrollArea className="h-[280px]">
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-3">
                    Mapeamento de campos do Bitrix24 para campos do sistema. O primeiro campo com valor será usado.
                  </p>
                  {mappingData?.fieldMapping && Object.entries(mappingData.fieldMapping).map(([jobField, bitrixFields]) => (
                    <div
                      key={jobField}
                      className="p-3 rounded-lg bg-muted/20 border border-border/30"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          {jobField}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {bitrixFields.map((field, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-[10px] font-mono"
                          >
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="techniques">
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Mapeamento de valores de técnica do Bitrix24 para IDs de técnicas do sistema.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {mappingData?.techniqueMapping && Object.entries(mappingData.techniqueMapping).map(([bitrix, system]) => (
                      <div
                        key={bitrix}
                        className="p-2 rounded-lg bg-muted/20 border border-border/30 flex items-center gap-2"
                      >
                        <span className="text-xs font-mono text-muted-foreground truncate flex-1">
                          {bitrix}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px]">
                          {system}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="priorities">
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Mapeamento de valores de prioridade do Bitrix24 para prioridades do sistema.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {mappingData?.priorityMapping && Object.entries(mappingData.priorityMapping).map(([bitrix, system]) => (
                      <div
                        key={bitrix}
                        className="p-2 rounded-lg bg-muted/20 border border-border/30 flex items-center gap-2"
                      >
                        <span className="text-xs truncate flex-1">{bitrix}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <Badge
                          className={`text-[10px] ${
                            system === 'urgent' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            system === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                            system === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            'bg-green-500/20 text-green-400 border-green-500/30'
                          }`}
                        >
                          {system}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="stages">
              <ScrollArea className="h-[280px]">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Estágios Bitrix24 → Status do Sistema
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {mappingData?.stageToStatus && Object.entries(mappingData.stageToStatus).map(([stage, status]) => (
                        <div
                          key={stage}
                          className="p-2 rounded-lg bg-muted/20 border border-border/30 flex items-center gap-2"
                        >
                          <span className="text-xs font-mono truncate flex-1">{stage}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <Badge variant="outline" className="text-[10px]">
                            {status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        {/* Bitrix24 Custom Fields Section */}
        {fieldsData && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Campos Personalizados Bitrix24</span>
              <Badge variant="outline" className="text-xs">
                {fieldsData.totalCustomFields} campos
              </Badge>
            </div>
            <ScrollArea className="h-[150px]">
              <div className="space-y-1">
                {fieldsData.customFields && Object.entries(fieldsData.customFields).map(([fieldId, fieldData]) => (
                  <div
                    key={fieldId}
                    className="p-2 rounded bg-muted/10 border border-border/20 flex items-center justify-between"
                  >
                    <span className="text-xs font-mono text-primary">{fieldId}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {fieldData?.formLabel || fieldData?.title || fieldData?.type || 'Campo'}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {fieldsData?.totalCustomFields === 0 && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-yellow-400">
                Nenhum campo personalizado (UF_CRM_*) encontrado no Bitrix24.
                Verifique a configuração do webhook.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
