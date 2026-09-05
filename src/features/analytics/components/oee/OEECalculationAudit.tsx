import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Info, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MachineOEE } from '@/features/production';
import { cn } from '@/lib/utils';

interface OEECalculationAuditProps {
  machine: MachineOEE;
  className?: string;
}

export const OEECalculationAudit = memo(function OEECalculationAudit({ machine, className }: OEECalculationAuditProps) {
  const {
    availability,
    performance,
    quality,
    oee,
    plannedProductionMinutes,
    actualOperatingMinutes,
    idealCycleMinutes,
    totalPiecesProduced,
    goodPieces,
    lostPieces
  } = machine;

  const FormulaRow = ({ label, formula, result, unit = '%', info }: { label: string, formula: string, result: number, unit?: string, info: string }) => (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          {label}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-[10px]">
                {info}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
        <span className="text-sm font-bold font-mono" style={{ color: result >= 85 ? 'hsl(var(--success))' : 'inherit' }}>
          {result.toFixed(1)}{unit}
        </span>
      </div>
      <div className="text-[11px] font-mono text-primary/70 bg-black/20 px-2 py-1 rounded select-all">
        {formula}
      </div>
    </div>
  );

  return (
    <Card className={cn("border-primary/20 bg-background/50 backdrop-blur-xl", className)}>
      <CardHeader className="pb-2 border-b border-border/50">
        <CardTitle className="text-xs font-black uppercase tracking-tighter flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Auditoria de Cálculo OEE: {machine.machineName}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormulaRow 
            label="Disponibilidade"
            formula={`(${actualOperatingMinutes}m / ${plannedProductionMinutes}m) * 100`}
            result={availability}
            info="Tempo Produzindo / Tempo Planejado. Desconsidera paradas planejadas (manutenção, limpeza)."
          />
          <FormulaRow 
            label="Performance"
            formula={`(${idealCycleMinutes}m / ${actualOperatingMinutes}m) * 100`}
            result={performance}
            info="Tempo Estimado (Ideal) / Tempo Real de Operação. Mede a velocidade da produção."
          />
          <FormulaRow 
            label="Qualidade"
            formula={`((${totalPiecesProduced} - ${lostPieces}) / ${totalPiecesProduced}) * 100`}
            result={quality}
            info="Peças Boas / Total Produzido. Mede a conformidade do produto final."
          />
        </div>

        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col items-center justify-center gap-2 relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 italic">Resultado Final OEE</span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">({availability.toFixed(1)}% / 100)</span>
            <span className="text-xs text-primary">×</span>
            <span className="text-xs font-mono text-muted-foreground">({performance.toFixed(1)}% / 100)</span>
            <span className="text-xs text-primary">×</span>
            <span className="text-xs font-mono text-muted-foreground">({quality.toFixed(1)}% / 100)</span>
          </div>
          <div className="text-4xl font-black text-display-lg tracking-tighter text-primary mt-1">
            {oee.toFixed(1)}%
          </div>
          <div className="h-px w-32 bg-primary/20 mt-1" />
          <p className="text-[9px] font-medium text-muted-foreground text-center max-w-[300px] mt-2 italic">
            "Classe Mundial" é atingido quando OEE ≥ 85%. Atualmente {oee >= 85 ? 'atingido' : `faltam ${(85-oee).toFixed(1)}% para a meta`}.
          </p>
        </div>

        <div className="flex items-start gap-2 p-3 bg-muted/20 rounded-lg border border-border/40">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Os dados acima são extraídos em tempo real do sistema de apontamento da <strong>FAST GRAVAÇÕES</strong>. 
            Qualquer divergência deve ser reportada ao coordenador do Studio {machine.techniqueName}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
