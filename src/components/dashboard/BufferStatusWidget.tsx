import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Loader2,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBufferStatus, BufferTechniqueStatus } from '@/features/jobs';
import { useAutoBufferPromotion } from '@/features/jobs';
import { Skeleton } from '@/components/ui/skeleton';

const BUFFER_TARGET = 3;

interface BufferRowProps {
  data: BufferTechniqueStatus;
  onPromote: () => void;
  isPromoting: boolean;
}

const BufferRow = memo(function BufferRow({ data, onPromote, isPromoting }: BufferRowProps) {
  const { technique, readyCount, queueCount, isHealthy, isCritical } = data;
  const progress = Math.min((readyCount / BUFFER_TARGET) * 100, 100);
  const canPromote = !isHealthy && queueCount > 0;

  return (
    <div
      className={cn(
        "p-2 rounded-lg border transition-all duration-200",
        isCritical && "bg-primary/10 border-primary/30",
        !isCritical && !isHealthy && "bg-warning/10 border-warning/30",
        isHealthy && "bg-green-500/10 border-green-500/30"
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: technique.color }}
          />
          <span className="font-medium text-xs">{technique.name}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-muted-foreground">Fila: <span className="font-semibold text-foreground">{queueCount}</span></span>
          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
          <span className={cn(
            isCritical && "text-primary",
            !isCritical && !isHealthy && "text-warning",
            isHealthy && "text-green-400"
          )}>
            Prontos: <span className="font-bold">{readyCount}/{BUFFER_TARGET}</span>
          </span>
        </div>
      </div>

      <Progress
        value={progress}
        className={cn(
          "h-1.5",
          isCritical && "[&>div]:bg-primary",
          !isCritical && !isHealthy && "[&>div]:bg-warning",
          isHealthy && "[&>div]:bg-green-500"
        )}
      />

      <div className="flex items-center justify-between mt-1">
        <div>
          {isCritical && (
            <p className="text-[10px] text-primary flex items-center gap-1">
              <AlertCircle className="h-2.5 w-2.5" />
              Buffer vazio!
            </p>
          )}
          {!isCritical && !isHealthy && (
            <p className="text-[10px] text-warning flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" />
              +{BUFFER_TARGET - readyCount} job(s)
            </p>
          )}
        </div>
        {canPromote && (
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-5 text-[10px] px-1.5",
              isCritical && "text-primary hover:text-primary/80 hover:bg-primary/10",
              !isCritical && "text-warning hover:text-warning hover:bg-warning/10"
            )}
            onClick={onPromote}
            disabled={isPromoting}
          >
            {isPromoting ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <Zap className="h-2.5 w-2.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
});
BufferRow.displayName = 'BufferRow';

function BufferStatusWidgetComponent() {
  const { bufferByTechnique, isLoading } = useBufferStatus();
  const { triggerPromotion, promoteForTechnique, isPromoting } = useAutoBufferPromotion({
    showToasts: true
  });


  const { criticalCount, warningCount, healthyCount, hasUnhealthyTechniques } = useMemo(() => ({
    criticalCount: bufferByTechnique.filter((b: BufferTechniqueStatus) => b.isCritical).length,
    warningCount: bufferByTechnique.filter((b: BufferTechniqueStatus) => b.isWarning).length,
    healthyCount: bufferByTechnique.filter((b: BufferTechniqueStatus) => b.isHealthy).length,
    hasUnhealthyTechniques: bufferByTechnique.some((b: BufferTechniqueStatus) => !b.isHealthy && b.queueCount > 0),
  }), [bufferByTechnique]);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4 text-warning" />
            Buffer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-3 pb-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card card-interactive animate-fade-in-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0.1s]">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-title flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-warning/20 flex items-center justify-center">
              <Package className="h-3 w-3 text-warning" />
            </div>
            <span className="gradient-text">Buffer</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            {hasUnhealthyTechniques && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-warning hover:bg-warning/10"
                onClick={() => triggerPromotion()}
                disabled={isPromoting}
                title="Promover Todos"
              >
                {isPromoting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            )}
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-0.5 text-[10px] h-5 px-1.5">
                <AlertCircle className="h-2.5 w-2.5" />
                {criticalCount}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="border-warning text-warning gap-0.5 text-[10px] h-5 px-1.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                {warningCount}
              </Badge>
            )}
            {healthyCount > 0 && (
              <Badge variant="outline" className="border-green-500 text-green-500 gap-0.5 text-[10px] h-5 px-1.5">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {healthyCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3 max-h-[280px] overflow-y-auto scrollbar-thin">
        {bufferByTechnique.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-1 opacity-30" />
            <p className="text-xs">Nenhum job</p>
          </div>
        ) : (
          bufferByTechnique.map((data: BufferTechniqueStatus) => (
            <BufferRow
              key={data.technique.id}
              data={data}
              onPromote={() => promoteForTechnique(data.technique.id)}
              isPromoting={isPromoting}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export const BufferStatusWidget = memo(BufferStatusWidgetComponent);
BufferStatusWidget.displayName = 'BufferStatusWidget';
