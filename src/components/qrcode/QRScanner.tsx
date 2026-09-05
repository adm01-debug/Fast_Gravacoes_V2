import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";
import {
  Camera,
  CameraOff,
  Play,
  Pause,
  CheckCircle2,
  Loader2,
  QrCode
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";
import { useOfflineSync } from "@/hooks/useOfflineSync";

interface ScannedJob {
  id: string;
  order_number: string;
  product: string;
  client: string;
  status: string;
  technique_id: string;
  quantity: number;
  produced_quantity: number | null;
}

export const QRScanner = () => {
  const { user } = useAuth();
  const { isOnline, recordQRScanOffline, updateJobOffline, getCachedJobs } = useOfflineSync();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedJob, setScannedJob] = useState<ScannedJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const recordScan = async (jobId: string, action: string) => {
    if (!user?.id) return;
    try {
      const deviceInfo = navigator.userAgent;
      await recordQRScanOffline(jobId, user.id, action, deviceInfo);
    } catch (error) {
      logger.warn('Falha ao registrar leitura de QR offline', error, 'QRScanner');
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch((e) => logger.debug('Parada do scanner no cleanup', e, 'QRScanner'));
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      if (!containerRef.current) return;
      scannerRef.current = new Html5Qrcode("qr-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        () => {}
      );
      setIsScanning(true);
    } catch (error) {
      toast.error("Não foi possível acessar a câmera");
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      setIsScanning(false);
    } catch (error) {
      logger.warn('Falha ao parar o leitor de QR', error, 'QRScanner');
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.type !== "job" || !data.id) {
        toast.error("QR Code inválido");
        return;
      }
      await stopScanner();
      setIsLoading(true);

      let job;
      if (isOnline) {
        const { data: res, error } = await supabase.from("jobs").select("*").eq("id", data.id).maybeSingle();
        if (error) throw error;
        job = res;
      } else {
        const cached = getCachedJobs() as unknown as ScannedJob[];
        job = cached.find(j => j.id === data.id);
      }

      if (!job) {
        toast.error("Job não encontrado");
        setIsLoading(false);
        return;
      }

      setScannedJob(job);
      await recordScan(job.id, 'view');
      toast.success(`Job ${job.order_number} identificado!`);
    } catch (error) {
      toast.error("Erro ao processar QR Code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string, action: string) => {
    if (!scannedJob) return;
    setActionLoading(true);
    try {
      await updateJobOffline(scannedJob.id, {
        status,
        ...(status === "production" ? { actual_start_time: new Date().toISOString() } : {}),
        ...(status === "finished" ? { actual_end_time: new Date().toISOString() } : {})
      });
      await recordScan(scannedJob.id, action);
      setScannedJob({ ...scannedJob, status });
      toast.success(status === "production" ? "Produção iniciada!" : status === "paused" ? "Produção pausada!" : "Produção finalizada!");
    } catch (error) {
      toast.error("Erro ao atualizar status");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      queue: { label: "Na Fila", variant: "secondary" },
      scheduled: { label: "Agendado", variant: "outline" },
      production: { label: "Em Produção", variant: "default" },
      paused: { label: "Pausado", variant: "destructive" },
      finished: { label: "Finalizado", variant: "secondary" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card className="w-full max-w-md mx-auto glass-card border-border/50">
      <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5 text-primary" />Scanner de Produção</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!scannedJob ? (
          <>
            <div ref={containerRef} id="qr-reader" className="w-full aspect-square bg-muted/50 rounded-lg overflow-hidden relative">
              {!isScanning && (<div className="absolute inset-0 flex flex-col items-center justify-center gap-4"><Camera className="h-16 w-16 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Clique para iniciar o scanner</p></div>)}
            </div>
            {isLoading && (<div className="flex items-center justify-center gap-2 py-4"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Buscando job...</span></div>)}
            <Button onClick={isScanning ? stopScanner : startScanner} className="w-full" variant={isScanning ? "destructive" : "default"}>
              {isScanning ? (<><CameraOff className="h-4 w-4 mr-2" />Parar Scanner</>) : (<><Camera className="h-4 w-4 mr-2" />Iniciar Scanner</>)}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <div className="flex items-center justify-between"><span className="text-sm font-medium">OS: {scannedJob.order_number}</span>{getStatusBadge(scannedJob.status)}</div>
              <p className="text-sm text-foreground font-medium">{scannedJob.product}</p>
              <p className="text-sm text-muted-foreground">{scannedJob.client}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50"><span>Quantidade: {scannedJob.quantity}</span><span>Produzido: {scannedJob.produced_quantity || 0}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['queue', 'scheduled'].includes(scannedJob.status) ? (
                <Button onClick={() => handleUpdateStatus("production", "start")} disabled={actionLoading} className="col-span-2">{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}Iniciar Produção</Button>
              ) : scannedJob.status === "production" ? (
                <><Button onClick={() => handleUpdateStatus("paused", "pause")} variant="outline" disabled={actionLoading}>{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pause className="h-4 w-4 mr-2" />}Pausar</Button>
                  <Button onClick={() => handleUpdateStatus("finished", "finish")} disabled={actionLoading}>{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}Finalizar</Button></>
              ) : scannedJob.status === "paused" ? (
                <Button onClick={() => handleUpdateStatus("production", "resume")} disabled={actionLoading} className="col-span-2">{actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}Retomar Produção</Button>
              ) : scannedJob.status === "finished" ? (
                <div className="col-span-2 flex items-center justify-center gap-2 py-3 text-green-500"><CheckCircle2 className="h-5 w-5" /><span className="font-medium">Produção Finalizada</span></div>
              ) : null}
            </div>
            <Button onClick={() => { setScannedJob(null); startScanner(); }} variant="outline" className="w-full"><QrCode className="h-4 w-4 mr-2" />Escanear Outro</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
