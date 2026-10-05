import { Suspense } from 'react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { Calculator, Award, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary';
import { INDUSTRY_BENCHMARKS, type BenchmarkConfig } from '@/features/analytics/constants/oee';
import type { OEEData } from '@/features/production/hooks/useOEE';

const OEECalculationAudit = lazyWithRetry(() => import('@/features/analytics/components/oee/OEECalculationAudit').then(m => ({ default: m.OEECalculationAudit })));

interface OEEAuditPanelProps {
  data: OEEData;
  machineId: string;
  industryBenchmark: string;
  onBenchmarkChange: (id: string) => void;
  currentBenchmark: BenchmarkConfig;
}

export function OEEAuditPanel({ data, machineId, industryBenchmark, onBenchmarkChange, currentBenchmark }: OEEAuditPanelProps) {
  return (

          <Card className="border-indicator-info/20 bg-muted/20 animate-in slide-in-from-top-4 duration-300">
            <CardHeader className="pb-2 border-b border-border/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-indicator-info" />
                  Auditoria de Memória de Cálculo & Benchmarking
                </CardTitle>
                
                <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">Setor:</span>
                  <Select value={industryBenchmark} onValueChange={onBenchmarkChange}>
                    <SelectTrigger aria-label="Setor de referência" className="h-7 w-40 text-[10px] font-bold border-none bg-transparent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INDUSTRY_BENCHMARKS).map(([id, b]) => (
                        <SelectItem key={id} value={id} className="text-[10px] font-medium">{b.label} ({b.target}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                    <p className="text-[10px] font-black text-primary uppercase mb-2">Fórmula Disponibilidade</p>
                    <p className="text-xs font-mono mb-2">(Tempo Operação / Tempo Planejado) * 100</p>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Real / Alvo</p>
                        <p className="text-sm font-bold">{data.byMachine.reduce((s, m) => s + m.actualOperatingMinutes, 0)} / {data.byMachine.reduce((s, m) => s + m.plannedProductionMinutes, 0)} min</p>
                      </div>
                      <p className="text-xl font-black text-primary">{data.overallAvailability.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                    <p className="text-[10px] font-black text-indicator-info uppercase mb-2">Fórmula Performance</p>
                    <p className="text-xs font-mono mb-2">(Tempo Ideal / Tempo Real) * 100</p>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Ideal / Real</p>
                        <p className="text-sm font-bold">{data.byMachine.reduce((s, m) => s + m.idealCycleMinutes, 0)} / {data.byMachine.reduce((s, m) => s + m.actualOperatingMinutes, 0)} min</p>
                      </div>
                      <p className="text-xl font-black text-indicator-info">{data.overallPerformance.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                    <p className="text-[10px] font-black text-accent-purple uppercase mb-2">Fórmula Qualidade</p>
                    <p className="text-xs font-mono mb-2">(Peças Boas / Peças Produzidas) * 100</p>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Boas / Total</p>
                        <p className="text-sm font-bold">{data.byMachine.reduce((s, m) => s + m.goodPieces, 0)} / {data.byMachine.reduce((s, m) => s + m.totalPiecesProduced, 0)} pcs</p>
                      </div>
                      <p className="text-xl font-black text-accent-purple">{data.overallQuality.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="p-4 bg-black/40 rounded-xl border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary/20 text-primary border-primary/30">OEE FINAL</Badge>
                    <p className="text-xs font-medium text-muted-foreground">O OEE é o produto dos três indicadores acima (Disp x Perf x Qual)</p>
                  </div>
                  <p className="text-2xl font-black text-primary">{data.overallOEE.toFixed(1)}%</p>
                </div>

                <div className={cn(
                  "p-4 rounded-xl border flex items-center justify-between",
                  data.overallOEE >= currentBenchmark.target 
                    ? "bg-success/5 border-success/20" 
                    : "bg-destructive/5 border-destructive/20"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      data.overallOEE >= currentBenchmark.target ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                    )}>
                      {data.overallOEE >= currentBenchmark.target ? <Award className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Performance vs Benchmark</p>
                      <p className="text-xs font-medium">{currentBenchmark.label}: {currentBenchmark.target}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-xl font-black",
                      data.overallOEE >= currentBenchmark.target ? "text-success" : "text-destructive"
                    )}>
                      {(data.overallOEE - currentBenchmark.target).toFixed(1)}%
                    </p>
                    <p className="text-[9px] font-bold uppercase text-muted-foreground">{data.overallOEE >= currentBenchmark.target ? 'Acima da Média' : 'Abaixo da Média'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center text-primary/60">Detalhamento por Unidade</p>
                <SectionErrorBoundary compact><Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-xl" />}>
                  {machineId !== 'all' ? (
                    <OEECalculationAudit 
                      machine={data.byMachine.find(m => m.machineId === machineId) as (typeof data.byMachine)[number]} 
                    />
                  ) : (
                    <OEECalculationAudit 
                      machine={{
                        machineId: 'overall',
                        machineName: 'Consolidado Global FAST',
                        machineCode: 'GLOBAL',
                        techniqueId: 'all',
                        techniqueName: 'Múltiplas',
                        techniqueColor: 'hsl(var(--primary))',
                        availability: data.overallAvailability,
                        performance: data.overallPerformance,
                        quality: data.overallQuality,
                        oee: data.overallOEE,
                        plannedProductionMinutes: data.byMachine.reduce((s, m) => s + m.plannedProductionMinutes, 0),
                        actualOperatingMinutes: data.byMachine.reduce((s, m) => s + m.actualOperatingMinutes, 0),
                        idealCycleMinutes: data.byMachine.reduce((s, m) => s + m.idealCycleMinutes, 0),
                        actualCycleMinutes: data.byMachine.reduce((s, m) => s + m.actualOperatingMinutes, 0),
                        totalPiecesProduced: data.byMachine.reduce((s, m) => s + m.totalPiecesProduced, 0),
                        goodPieces: data.byMachine.reduce((s, m) => s + m.goodPieces, 0),
                        lostPieces: data.byMachine.reduce((s, m) => s + m.lostPieces, 0),
                        totalJobs: data.byMachine.reduce((s, m) => s + m.totalJobs, 0),
                        completedJobs: data.byMachine.reduce((s, m) => s + m.completedJobs, 0),
                        oeeClass: 'excellent'
                      }} 
                    />
                  )}
                </Suspense></SectionErrorBoundary>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                   <strong>Nota sobre Benchmark:</strong> {currentBenchmark.desc} Estes valores servem como referência setorial para o seu processo de melhoria contínua.
                </p>
              </div>
            </CardContent>
          </Card>
        
  );
}
