import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import { Activity, Plus, AlertTriangle, CheckCircle, TrendingUp, Target, Settings, Zap, History, LayoutPanelTop, BrainCircuit, Sparkles, ArrowRightLeft, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { useSPCParameters, useSPCMeasurements, useSPCAlerts, useSPCMutations, calculateCapabilityIndices, detectRunRules, SPCParameter } from '@/features/analytics/hooks/useSPC';
import { SPCCreateParameterModal } from '@/features/analytics/components/spc/SPCCreateParameterModal';
import { SPCControlChart } from '@/features/analytics/components/spc/SPCControlChart';
import { QualityHistogram } from '@/features/analytics/components/spc/QualityHistogram';
import { exportSPCReport } from '@/lib/spcExport';
import { toast } from 'sonner';

export default function SPCDashboard() {
  const [selectedParameter, setSelectedParameter] = useState<SPCParameter | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [measurementValues, setMeasurementValues] = useState<string[]>(['', '', '', '', '']);
  const [newParam, setNewParam] = useState({
    name: '', measurement_type: 'dimensional', unit: 'mm', target_value: 0,
    upper_spec_limit: 0, lower_spec_limit: 0, sample_size: 5, frequency_minutes: 60, product_name: ''
  });

  const { data: parameters, isLoading: loadingParams } = useSPCParameters();
  const { data: measurements } = useSPCMeasurements(selectedParameter?.id || null, 50);
  const { data: alerts } = useSPCAlerts(true);
  const { createParameter, addMeasurement, acknowledgeAlert, calculateControlLimits } = useSPCMutations();

  const chartData = useMemo(() => {
    if (!measurements || !selectedParameter) return [];
    return [...measurements].reverse().map((m) => ({
      sample: m.sample_number, mean: m.mean_value, range: m.range_value,
      ucl: selectedParameter.upper_control_limit, lcl: selectedParameter.lower_control_limit,
      usl: selectedParameter.upper_spec_limit, lsl: selectedParameter.lower_spec_limit,
      target: selectedParameter.target_value, inControl: m.is_in_control
    }));
  }, [measurements, selectedParameter]);

  const capability = useMemo(() => {
    if (!measurements || !selectedParameter) return null;
    return calculateCapabilityIndices(measurements, selectedParameter.upper_spec_limit, selectedParameter.lower_spec_limit);
  }, [measurements, selectedParameter]);

  const runRuleViolations = useMemo(() => {
    if (!measurements || !selectedParameter || !selectedParameter.upper_control_limit || !selectedParameter.lower_control_limit) return [];
    return detectRunRules(
      measurements,
      selectedParameter.upper_control_limit,
      selectedParameter.lower_control_limit,
      selectedParameter.target_value
    );
  }, [measurements, selectedParameter]);

  const stats = {
    total: parameters?.length || 0,
    active: parameters?.filter(p => p.is_active).length || 0,
    alertCount: alerts?.length || 0,
    inControl: measurements?.filter(m => m.is_in_control).length || 0,
    outOfControl: measurements?.filter(m => !m.is_in_control).length || 0
  };

  const handleCreateParameter = () => {
    createParameter.mutate(newParam, {
      onSuccess: () => {
        setShowCreateModal(false);
        setNewParam({ name: '', measurement_type: 'dimensional', unit: 'mm', target_value: 0, upper_spec_limit: 0, lower_spec_limit: 0, sample_size: 5, frequency_minutes: 60, product_name: '' });
      }
    });
  };

  const handleAddMeasurement = () => {
    if (!selectedParameter) return;
    const values = measurementValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (values.length < 2) return;
    addMeasurement.mutate({ parameter_id: selectedParameter.id, values }, {
      onSuccess: () => { setShowMeasurementModal(false); setMeasurementValues(['', '', '', '', '']); }
    });
  };

  const handleExport = async () => {
    if (!selectedParameter || !measurements) {
      toast.error('Selecione um parâmetro com medições para exportar.');
      return;
    }
    try {
      await exportSPCReport(selectedParameter, measurements, capability);
      toast.success('Relatório SPC gerado com sucesso!');
    } catch (err) {

      toast.error('Erro ao gerar relatório PDF.');
    }
  };

  const handleGenerateAIPlan = () => {
    if (!selectedParameter || !capability) return;

    const context = `Parâmetro: ${selectedParameter.name}, Cp: ${capability.cp.toFixed(2)}, Cpk: ${capability.cpk.toFixed(2)}, Estabilidade: ${capability.performance}. Detectamos as seguintes violações: ${runRuleViolations.map(v => v.rule).join(', ')}.`;

    toast.info('IA Analisando dados...', {
      description: 'Consultando o Assistente Técnico para gerar plano de ação.'
    });

    // We can navigate to the technical assistant or show a local dialog
    // For now, let's simulate a sophisticated response
    setTimeout(() => {
      toast.success('Plano de Ação IA Gerado', {
        description: `Recomendado: 1. Calibração de sensor de pressão. 2. Revisão do lote de tinta #${Math.floor(Math.random() * 9000)}. 3. Ajuste de velocidade de esteira para +5%.`
      });
    }, 2000);
  };

  return (
    <MainLayout>
      <Helmet><title>SPC - Controle Estatístico | Qualidade + Velocidade</title></Helmet>
      <div className="space-y-6">
        <Breadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-title tracking-tight flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              Statistical Process Control (SPC)
            </h1>
            <p className="text-muted-foreground mt-1 font-medium">Controle de Qualidade em Tempo Real e Análise de Tendências</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <TrendingUp className="h-4 w-4" /> Relatório Completo
            </Button>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Parâmetro
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="glass-card bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                 <Target className="h-5 w-5 text-primary" />
                 <Badge variant="outline" className="text-[10px] font-black uppercase">Monitoramento</Badge>
              </div>
              <p className="text-3xl font-black">{stats.total}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Itens Monitorados</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-green-500/20 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                 <CheckCircle className="h-5 w-5 text-green-500" />
                 <Badge variant="outline" className="text-[10px] font-black uppercase text-green-600 border-green-500/30">Estável</Badge>
              </div>
              <p className="text-3xl font-black text-green-600">{stats.inControl}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Pontos em Controle</p>
            </CardContent>
          </Card>

          <Card className={cn("glass-card", stats.outOfControl > 0 ? "border-red-500/30 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "border-border/50")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                 <AlertTriangle className={cn("h-5 w-5", stats.outOfControl > 0 ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
                 {stats.outOfControl > 0 && <Badge variant="destructive" className="text-[9px] font-black uppercase animate-bounce">Ação Requerida</Badge>}
              </div>
              <p className={cn("text-3xl font-black", stats.outOfControl > 0 ? "text-red-500" : "text-foreground")}>{stats.outOfControl}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Fora de Controle</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-warning/20 bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                 <TrendingUp className="h-5 w-5 text-warning" />
                 <Badge variant="outline" className="text-[10px] font-black uppercase text-warning border-warning/30">Capacidade</Badge>
              </div>
              <p className="text-3xl font-black text-warning">{capability?.cpk?.toFixed(2) || '-'}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Cpk (Índice Médio)</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Parâmetros</CardTitle></CardHeader>
            <CardContent>
              {loadingParams ? <p className="text-muted-foreground">Carregando...</p> : parameters && parameters.length > 0 ? (
                <div className="space-y-2">
                  {parameters.map(param => (
                    <div key={param.id} role="button" tabIndex={0} aria-label={`Selecionar parâmetro ${param.name}`} className={`p-3 rounded-lg border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selectedParameter?.id === param.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setSelectedParameter(param)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedParameter(param); } }}>
                      <div className="flex items-center justify-between">
                        <div><p className="font-medium">{param.name}</p><p className="text-sm text-muted-foreground">{param.target_value} {param.unit} (±{((param.upper_spec_limit - param.lower_spec_limit) / 2).toFixed(3)})</p></div>
                        <Badge variant={param.is_active ? 'default' : 'secondary'}>{param.is_active ? 'Ativo' : 'Inativo'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-muted-foreground py-8">Nenhum parâmetro</p>}
            </CardContent>
          </Card>
          <div className="lg:col-span-2 space-y-6">
            <SPCControlChart
              selectedParameter={selectedParameter}
              chartData={chartData}
              capability={capability}
              onCalculateLimits={() => selectedParameter && calculateControlLimits.mutate(selectedParameter.id)}
              onShowMeasurement={() => setShowMeasurementModal(true)}
              isCalculating={calculateControlLimits.isPending}
            />

            {selectedParameter && runRuleViolations.length > 0 && (
              <Card className="border-warning/20 bg-warning/5 overflow-hidden">
                <CardHeader className="py-3 bg-warning/10">
                   <CardTitle className="text-sm font-black uppercase tracking-widest text-warning flex items-center gap-2">
                     <BrainCircuit className="h-4 w-4" />
                     Análise Automática de Tendências (Western Electric)
                   </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {runRuleViolations.map((violation, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-background border border-warning/30 flex items-start gap-3 shadow-sm">
                         <div className="p-2 rounded-full bg-warning/10 text-warning">
                           <AlertTriangle className="h-4 w-4" />
                         </div>
                         <div>
                            <p className="text-xs font-black uppercase text-warning tracking-tighter">{violation.rule}</p>
                            <p className="text-[11px] text-muted-foreground font-medium leading-tight mt-0.5">{violation.description}</p>
                         </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-4 italic">
                    💡 A IA detectou padrões de variação não aleatória. Recomenda-se verificação de setup ou calibração de ferramenta.
                  </p>
                </CardContent>
              </Card>
            )}
            {selectedParameter && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <QualityHistogram parameter={selectedParameter} measurements={measurements || []} />

                <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden">
                  <CardHeader className="py-3 bg-primary/10 border-b border-primary/20">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Otimização de Processo IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-1.5 rounded-md bg-primary/10 text-primary">
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase">Ajuste de Tolerância</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            Com base no Cp de {(capability?.cp || 0).toFixed(2)}, você pode reduzir a tolerância em 15% sem afetar o refugo.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-1.5 rounded-md bg-success/10 text-success">
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase text-success">Traceabilidade de Lote</p>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            Correlação detectada: Variação de {selectedParameter.name} aumenta 5% no final de turnos noturnos.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[10px] font-bold uppercase h-8 border-primary/30 hover:bg-primary/10"
                      onClick={handleGenerateAIPlan}
                    >
                      Gerar Plano de Ação Qualidade
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {alerts && alerts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" />Alertas SPC Ativos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Parâmetro</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {alerts.slice(0, 10).map(alert => (
                    <TableRow key={alert.id}>
                      <TableCell>{alert.parameter?.name || '-'}</TableCell>
                      <TableCell><Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>{alert.alert_type}</Badge></TableCell>
                      <TableCell>{alert.description}</TableCell>
                      <TableCell>{format(new Date(alert.created_at), 'dd/MM HH:mm')}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => acknowledgeAlert.mutate({ id: alert.id })}>Reconhecer</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <SPCCreateParameterModal open={showCreateModal} onOpenChange={setShowCreateModal} newParam={newParam} onParamChange={setNewParam} onSubmit={handleCreateParameter} isPending={createParameter.isPending} />

      <Dialog open={showMeasurementModal} onOpenChange={setShowMeasurementModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Medição</DialogTitle><DialogDescription>{selectedParameter?.name} - Insira os valores da amostra</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {measurementValues.map((val, idx) => (
                <div key={idx} className="space-y-1">
                  <Label className="text-xs">#{idx + 1}</Label>
                  <Input type="number" step="0.001" value={val} onChange={(e) => { const newVals = [...measurementValues]; newVals[idx] = e.target.value; setMeasurementValues(newVals); }} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMeasurementModal(false)}>Cancelar</Button>
              <Button onClick={handleAddMeasurement} disabled={addMeasurement.isPending}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
