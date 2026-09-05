import { memo, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChevronRight, 
  ChevronDown, 
  ArrowLeft, 
  Target, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  Gauge,
  X,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProductionLosses } from '@/features/production';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface OEELossDrilldownProps {
  filters: {
    shift?: string;
    machineId?: string;
    techniqueId?: string;
    startDate?: string;
    endDate?: string;
  };
}

interface PathItem {
  id: string;
  label: string;
  type: 'category' | 'reason' | 'job';
}

interface LossRecord {
  id: string;
  quantity: number;
  loss_type?: string | null;
  notes?: string | null;
  job_id: string;
  job?: { order_number?: string | null; client?: string | null } | null;
}

interface DrilldownItem {
  id: string;
  label: string;
  sublabel?: string;
  value: number;
  type: 'category' | 'reason' | 'job';
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const OEELossDrilldown = memo(function OEELossDrilldown({ filters }: OEELossDrilldownProps) {
  const [path, setPath] = useState<PathItem[]>([]);
  const { losses, isLoading } = useProductionLosses(undefined, filters);

  const currentLevel = path.length > 0 ? path[path.length - 1] : { id: 'root', type: 'root', label: 'Início' };

  const drilldownData = useMemo(() => {
    if (!losses) return [];

    if (path.length === 0) {
      // Level 0: Categories
      const categories = losses.reduce((acc: Record<string, number>, loss: LossRecord) => {
        const cat = loss.loss_type || (loss.notes?.includes('Qualidade') ? 'quality' : 
                     loss.notes?.includes('Performance') ? 'performance' : 
                     'availability');
        acc[cat] = (acc[cat] || 0) + loss.quantity;
        return acc;
      }, {});

      return Object.entries(categories).map(([id, value]) => ({
        id,
        label: id === 'quality' ? 'Qualidade' : id === 'performance' ? 'Performance' : 'Disponibilidade',
        value: value as number,
        type: 'category' as const,
        color: id === 'quality' ? 'text-warning' : id === 'performance' ? 'text-blue-500' : 'text-red-500',
        icon: id === 'quality' ? Target : id === 'performance' ? Gauge : Clock
      }));
    }

    if (path.length === 1 && path[0].type === 'category') {
      // Level 1: Reasons within category
      const category = path[0].id;
      const filteredLosses = losses.filter((l: LossRecord) => {
        const cat = l.loss_type || (l.notes?.includes('Qualidade') ? 'quality' : 
                     l.notes?.includes('Performance') ? 'performance' : 
                     'availability');
        return cat === category;
      });

      const reasons = filteredLosses.reduce((acc: Record<string, number>, loss: LossRecord) => {
        const reason = loss.notes || 'Causa não especificada';
        acc[reason] = (acc[reason] || 0) + loss.quantity;
        return acc;
      }, {});

      return Object.entries(reasons).map(([id, value]) => ({
        id,
        label: id,
        value: value as number,
        type: 'reason' as const,
        color: 'text-muted-foreground',
        icon: AlertTriangle
      })).sort((a, b) => (b.value as number) - (a.value as number));
    }

    if (path.length === 2 && path[1].type === 'reason') {
      // Level 2: Jobs for a specific reason
      const reason = path[1].id;
      const filteredLosses = losses.filter((l: LossRecord) => l.notes === reason);

      return filteredLosses.map((l: LossRecord) => ({
        id: l.id,
        label: `Job #${l.job?.order_number || l.job_id.slice(0, 8)}`,
        sublabel: l.job?.client || 'Cliente não informado',
        value: l.quantity,
        type: 'job' as const,
        color: 'text-primary',
        icon: CheckCircle2
      }));
    }

    return [];
  }, [losses, path]);

  const navigateTo = (item: DrilldownItem) => {
    setPath([...path, { id: item.id, label: item.label, type: item.type }]);
  };

  const goBack = () => {
    setPath(path.slice(0, -1));
  };

  const reset = () => {
    setPath([]);
  };

  return (
    <Card className="border-primary/20 bg-muted/5 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Análise Hierárquica de Perdas
            </CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">
              {path.length === 0 ? 'Visão Geral por Categoria' : path.length === 1 ? 'Detalhamento por Motivo' : 'Relação de Ordens de Produção'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {path.length > 0 && (
              <div className="flex items-center gap-1 border-r border-border/50 pr-2 mr-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-full hover:bg-primary/10 transition-colors"
                  onClick={goBack}
                  title="Voltar um nível"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={reset}
                  title="Fechar caminho"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Badge variant="outline" className="text-[10px] font-black border-primary/30">
              {losses?.length || 0} REGISTROS
            </Badge>
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 mt-4 overflow-x-auto pb-1 no-scrollbar bg-black/20 p-1 rounded-lg">
          <button 
            onClick={reset}
            className={cn(
              "text-[10px] font-black uppercase transition-all px-3 py-1.5 rounded-md flex items-center gap-1.5",
              path.length === 0 
                ? "text-primary bg-primary/10 shadow-[0_0_10px_rgba(var(--primary),0.2)]" 
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            Início
          </button>
          
          {path.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
              <button 
                onClick={() => setPath(path.slice(0, idx + 1))}
                className={cn(
                  "text-[10px] font-black uppercase transition-all px-3 py-1.5 rounded-md whitespace-nowrap",
                  idx === path.length - 1 
                    ? "text-primary bg-primary/10 shadow-[0_0_10px_rgba(var(--primary),0.2)]" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {item.label}
              </button>
            </div>
          ))}
        </nav>
      </CardHeader>
      
      <CardContent className="p-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={path.length}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : drilldownData.length > 0 ? (
              <div className="space-y-2">
                {drilldownData.map((item: DrilldownItem) => (
                  <button
                    key={item.id}
                    onClick={() => item.type !== 'job' && navigateTo(item)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                      "border-border/50 hover:border-primary/50 hover:bg-primary/5 bg-background",
                      item.type === 'job' && "cursor-default"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-lg bg-muted/50 group-hover:bg-primary/20 transition-colors")}>
                        <item.icon className={cn("h-4 w-4", item.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight">{item.label}</p>
                        {item.sublabel && <p className="text-[10px] text-muted-foreground uppercase">{item.sublabel}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-black text-primary">{item.value}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">UNID.</p>
                      </div>
                      {item.type !== 'job' && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-all group-hover:translate-x-1" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl border-border/50">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm italic">Nenhum dado disponível neste nível de detalhe.</p>
                {path.length > 0 && (
                  <Button variant="link" onClick={goBack} className="mt-2 text-primary">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
});

// Removed local cn implementation to use project utility
