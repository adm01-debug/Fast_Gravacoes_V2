import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getOEEColor } from '@/features/production';

interface OEEHeatmapProps {
  data: {
    machineId: string;
    machineName: string;
    data: {
      date: string;
      oee: number;
      availability: number;
      performance: number;
      quality: number;
    }[];
  }[];
}

export const OEEHeatmap = memo(function OEEHeatmap({ data }: OEEHeatmapProps) {
  const { t } = useTranslation();

  const dates = useMemo(() => {
    if (!data.length || !data[0].data.length) return [];
    return data[0].data.map(d => d.date);
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-background/50 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          Mapa de Calor de Produtividade: OEE Diário por Máquina
        </CardTitle>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-sm bg-destructive" />
             <span className="text-[10px] text-muted-foreground">Crítico</span>
           </div>
           <div className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-sm bg-indicator-warning" />
             <span className="text-[10px] text-muted-foreground">Atenção</span>
           </div>
           <div className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-sm bg-success" />
             <span className="text-[10px] text-muted-foreground">Meta</span>
           </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- região rolável focável (WCAG scrollable-region-focusable) */}
        <div className="overflow-x-auto" role="region" aria-label="Heatmap de OEE por máquina" tabIndex={0}>
          <table className="w-full border-separate border-spacing-x-1 border-spacing-y-2">
            <thead>
              <tr>
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase p-1 sticky left-0 bg-background/80 backdrop-blur-sm z-10 w-24">
                  Máquina
                </th>
                {dates.map((date, idx) => (
                  <th key={date} className="text-center text-[10px] font-bold text-muted-foreground uppercase p-1 min-w-[30px]">
                    {idx % 3 === 0 ? format(parseISO(date), 'dd/MM', { locale: ptBR }) : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((machine) => (
                <tr key={machine.machineId}>
                  <td className="text-left text-[11px] font-medium p-1 sticky left-0 bg-background/80 backdrop-blur-sm z-10 whitespace-nowrap border-r border-border/50">
                    {machine.machineName}
                  </td>
                  {machine.data.map((day) => (
                    <td key={day.date} className="p-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-full h-8 rounded-sm transition-all hover:scale-110 hover:z-20 cursor-help",
                                day.oee === 0 ? "bg-muted/10" : ""
                              )}
                              style={{ 
                                backgroundColor: day.oee > 0 ? getOEEColor(day.oee) : undefined,
                                opacity: day.oee > 0 ? 0.85 : 0.2
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="bg-black/95 border-primary/20 backdrop-blur-md">
                            <div className="text-[10px] space-y-1">
                              <p className="font-bold text-primary">{machine.machineName}</p>
                              <p className="text-muted-foreground">{format(parseISO(day.date), 'PPPP', { locale: ptBR })}</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                                <p className="text-white font-black text-xs">OEE: {day.oee}%</p>
                                <p className="text-indicator-info font-bold text-[10px]">Disp: {day.availability}%</p>
                                <p className="text-indicator-warning font-bold text-[10px]">Perf: {day.performance}%</p>
                                <p className="text-accent-purple font-bold text-[10px]">Qual: {day.quality}%</p>
                              </div>
                              <p className="text-[9px] italic opacity-70 mt-2">
                                {day.oee >= 85 ? 'Desempenho de classe mundial' : 
                                 day.oee >= 65 ? 'Dentro da faixa operacional' : 
                                 day.oee > 0 ? 'Necessita investigação de perdas' : 'Sem produção registrada'}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
             <p className="text-[9px] text-muted-foreground uppercase font-black">Scroll horizontal para ver histórico completo →</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
