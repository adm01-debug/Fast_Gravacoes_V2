import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, CheckCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { DbJob } from "@/features/jobs";

interface JobQuickActionsProps {
  job: DbJob;
  handleAction: (action: string) => void;
}

export function JobQuickActions({ job, handleAction }: JobQuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {(job.status === 'queue' || job.status === 'ready' || job.status === 'scheduled') && (
        <Button
          onClick={() => handleAction('start')}
          className="bg-indicator-success/20 text-indicator-success hover:bg-indicator-success/30 border border-indicator-success/30"
        >
          <Play className="h-4 w-4 mr-2" />
          Iniciar Produção
        </Button>
      )}

      {job.status === 'production' && (
        <>
          <Button
            onClick={() => handleAction('pause')}
            className="bg-indicator-warning/20 text-indicator-warning hover:bg-indicator-warning/30 border border-indicator-warning/30"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pausar
          </Button>
          <Button
            onClick={() => handleAction('finish')}
            className="bg-indicator-success/20 text-indicator-success hover:bg-indicator-success/30 border border-indicator-success/30"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalizar
          </Button>
        </>
      )}

      {job.status === 'paused' && (
        <Button
          onClick={() => handleAction('start')}
          className="bg-indicator-success/20 text-indicator-success hover:bg-indicator-success/30 border border-indicator-success/30"
        >
          <Play className="h-4 w-4 mr-2" />
          Retomar
        </Button>
      )}

      {job.status !== 'rework' && job.status !== 'finished' && job.status !== 'cancelled' && (
        <Button
          onClick={() => handleAction('rework')}
          variant="outline"
          className="border-accent-purple/30 text-accent-purple hover:bg-accent-purple/20"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Marcar Retrabalho
        </Button>
      )}

      {job.status === 'delayed' && (
        <Badge className="bg-indicator-danger/20 text-indicator-danger border border-indicator-danger/30 px-3 py-2">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Job Atrasado
        </Badge>
      )}
    </div>
  );
}
