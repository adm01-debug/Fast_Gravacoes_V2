import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  CheckCircle2,
  RefreshCw,
  Clock,
  Package,
  AlertTriangle,
  Wifi,
  WifiOff,
  Maximize,
  Minimize,
  History,
  Activity,
  Zap,
  DollarSign,
  Target,
  Eye,
  EyeOff
} from "lucide-react";

interface KioskJob {
  id: string;
  client: string;
  product: string;
  quantity: number;
  produced?: number;
  status: "ready" | "production" | "paused" | "completed";
  priority?: "normal" | "high" | "urgent";
  technique?: string;
  techniqueColor?: string;
  machine?: string;
  orderNumber?: string;
}

interface KioskModeProps {
  jobs: KioskJob[];
  machineName: string;
  operatorName?: string;
  onStartProduction: (jobId: string) => void;
  onPauseProduction: (jobId: string) => void;
  onCompleteProduction: (jobId: string) => void;
  onRefresh: () => void;
  isOnline?: boolean;
}

export function KioskMode({
  jobs,
  machineName,
  operatorName,
  onStartProduction,
  onPauseProduction,
  onCompleteProduction,
  onRefresh,
  isOnline = true,
}: KioskModeProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isFocusMode, setIsFocusMode] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(new Date());

  const activeJob = React.useMemo(() =>
    jobs.find(j => j.status === "production"),
    [jobs]
  );

  // Update time every minute
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const priorityConfig = {
    urgent: { label: "Urgente", color: "bg-destructive text-destructive-foreground" },
    high: { label: "Alta", color: "bg-warning text-warning-foreground" },
    normal: { label: "Normal", color: "bg-secondary text-secondary-foreground" },
  };

  const statusConfig = {
    ready: { label: "Pronto", color: "text-blue-500", icon: Clock },
    production: { label: "Em Produção", color: "text-green-500", icon: Play },
    paused: { label: "Pausado", color: "text-yellow-500", icon: Pause },
    completed: { label: "Concluído", color: "text-gray-500", icon: CheckCircle2 },
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">{machineName}</h1>
          {operatorName && (
            <p className="text-muted-foreground">Operador: {operatorName}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-mono">
              {currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-sm text-muted-foreground">
              {currentTime.toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-destructive" />
            )}
            <Button
              variant={isFocusMode ? "default" : "outline"}
              size="icon"
              onClick={() => setIsFocusMode(!isFocusMode)}
              title={isFocusMode ? "Desativar Foco" : "Ativar Modo Foco"}
            >
              {isFocusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Jobs Content */}
      {isFocusMode ? (
        <div className="flex flex-col items-center justify-center flex-1 h-[70vh]">
          {activeJob ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl"
            >
              <Card className="bg-primary/5 border-primary/20 shadow-2xl">
                <CardContent className="p-8 md:p-12 space-y-8">
                  <div className="flex justify-between items-start border-b border-primary/10 pb-6">
                    <div>
                      <Badge variant="outline" className="mb-2 text-primary border-primary/30 uppercase tracking-widest font-black">Em Produção Agora</Badge>
                      <h2 className="text-4xl md:text-6xl font-black tracking-tighter">{activeJob.client}</h2>
                      <p className="text-xl text-muted-foreground mt-2">{activeJob.product}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-muted-foreground">{activeJob.orderNumber}</p>
                      <Badge className="bg-destructive mt-2">{priorityConfig[activeJob.priority || 'normal'].label}</Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-4xl font-bold">{activeJob.produced || 0} <span className="text-xl text-muted-foreground font-medium">/ {activeJob.quantity} peças</span></span>
                      <span className="text-4xl font-black text-primary">{Math.round(((activeJob.produced || 0) / activeJob.quantity) * 100)}%</span>
                    </div>
                    <Progress value={((activeJob.produced || 0) / activeJob.quantity) * 100} className="h-6 rounded-full" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6">
                     <div className="bg-background/50 p-4 rounded-xl border border-border/50 text-center">
                        <Activity className="h-5 w-5 mx-auto mb-2 text-primary" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">OEE Estimado</p>
                        <p className="text-xl font-black">94.2%</p>
                     </div>
                     <div className="bg-background/50 p-4 rounded-xl border border-border/50 text-center">
                        <Zap className="h-5 w-5 mx-auto mb-2 text-warning" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Consumo (kWh)</p>
                        <p className="text-xl font-black">1.2</p>
                     </div>
                     <div className="bg-background/50 p-4 rounded-xl border border-border/50 text-center">
                        <Target className="h-5 w-5 mx-auto mb-2 text-success" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Tempo Médio</p>
                        <p className="text-xl font-black">42s</p>
                     </div>
                     <div className="bg-background/50 p-4 rounded-xl border border-border/50 text-center">
                        <Clock className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Previsão Fim</p>
                        <p className="text-xl font-black">16:45</p>
                     </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1 h-20 text-2xl font-bold rounded-2xl"
                      onClick={() => onPauseProduction(activeJob.id)}
                    >
                      <Pause className="h-8 w-8 mr-3" /> Pausar
                    </Button>
                    <Button
                      className="flex-1 h-20 text-2xl font-bold rounded-2xl bg-primary hover:bg-primary/90"
                      onClick={() => onCompleteProduction(activeJob.id)}
                    >
                      <CheckCircle2 className="h-8 w-8 mr-3" /> Finalizar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="text-center space-y-6">
              <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center mx-auto animate-pulse">
                <Play className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-bold">Nenhum Job em Produção</h3>
                <p className="text-muted-foreground">Desative o Modo Foco para selecionar uma tarefa da fila.</p>
              </div>
              <Button size="lg" onClick={() => setIsFocusMode(false)}>Ver Lista de Tarefas</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {jobs.map((job) => {
            const status = statusConfig[job.status];
            const priority = priorityConfig[job.priority || "normal"];
            const progress = job.produced && job.quantity
              ? Math.round((job.produced / job.quantity) * 100)
              : 0;

            return (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={cn(
                  "overflow-hidden transition-shadow hover:shadow-lg",
                  job.status === "production" && "ring-2 ring-green-500"
                )}>
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                           <span className="text-[10px] font-mono text-muted-foreground">{job.orderNumber}</span>
                           <h3 className="font-bold truncate text-lg leading-tight">{job.client}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{job.product}</p>
                      </div>
                      <Badge className={priority.color}>{priority.label}</Badge>
                    </div>

                    {/* Technique */}
                    {job.technique && (
                      <div className="mb-3">
                        <Badge
                          variant="outline"
                          style={{ borderColor: job.techniqueColor, color: job.techniqueColor }}
                        >
                          {job.technique}
                        </Badge>
                      </div>
                    )}

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          <span>{job.produced || 0} / {job.quantity}</span>
                        </div>
                        <span className={status.color}>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Status */}
                    <div className={cn("flex items-center gap-2 text-sm mb-4", status.color)}>
                      <status.icon className="h-4 w-4" />
                      <span>{status.label}</span>
                    </div>

                    {/* Extra Info Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                       <Badge variant="secondary" className="h-5 px-1.5 text-[9px] bg-secondary/50 flex items-center gap-1">
                          <Activity className="h-2.5 w-2.5" /> OEE
                       </Badge>
                       <Badge variant="secondary" className="h-5 px-1.5 text-[9px] bg-secondary/50 flex items-center gap-1">
                          <History className="h-2.5 w-2.5" /> Hist.
                       </Badge>
                       <Badge variant="secondary" className="h-5 px-1.5 text-[9px] bg-secondary/50 flex items-center gap-1">
                          <Zap className="h-2.5 w-2.5" /> Ener.
                       </Badge>
                       <Badge variant="secondary" className="h-5 px-1.5 text-[9px] bg-secondary/50 flex items-center gap-1">
                          <DollarSign className="h-2.5 w-2.5" /> ABC
                       </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {job.status === "ready" && (
                        <Button
                          className="flex-1"
                          onClick={() => onStartProduction(job.id)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Iniciar
                        </Button>
                      )}
                      {job.status === "production" && (
                        <>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => onPauseProduction(job.id)}
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pausar
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() => onCompleteProduction(job.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Finalizar
                          </Button>
                        </>
                      )}
                      {job.status === "paused" && (
                        <Button
                          className="flex-1"
                          onClick={() => onStartProduction(job.id)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Retomar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      )}

      {/* Empty state */}
      {jobs.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold">Nenhum job disponível</h3>
          <p className="text-muted-foreground">Aguardando novos jobs para produção</p>
        </div>
      )}
    </div>
  );
}

export function KioskModeButton() {
  return (
    <Button variant="outline" size="sm">
      <Maximize className="h-4 w-4 mr-2" />
      Modo Kiosk
    </Button>
  );
}
