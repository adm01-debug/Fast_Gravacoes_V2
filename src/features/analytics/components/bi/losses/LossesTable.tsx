import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, FileSpreadsheet, FileText, AlertTriangle, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { Job } from "@/types/job";

interface LossesTableProps {
  jobs: Job[];
  onExport: (format: 'csv' | 'pdf', type: string) => void;
  onShowDetails?: (job: Job) => void;
}

export function LossesTable({ jobs, onExport, onShowDetails }: LossesTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Card className="bg-black/40 border-primary/20 backdrop-blur-xl group hover:border-primary/40 transition-all duration-500">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-title tracking-wider uppercase text-lg">{t('bi.lossMetrics', 'Métricas de Perda por Pedido')}</span>
            <span className="text-[10px] text-muted-foreground font-sans uppercase tracking-widest">{t('bi.anomallyIdentification', 'Identificação de anomalias críticas')}</span>
          </div>
        </CardTitle>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => onExport('csv', 'Perdas_Por_Pedido')}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => onExport('pdf', 'Perdas_Por_Pedido')}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar PDF</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] pr-4">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">{t('jobs.orderNumber', 'OS')} / {t('common.product', 'Produto')}</TableHead>
                <TableHead className="text-center text-muted-foreground text-[10px] uppercase font-bold tracking-widest">{t('bi.losses', 'Perdas')}</TableHead>
                <TableHead className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">{t('common.efficiency', 'Eficiência')}</TableHead>
                <TableHead className="text-right text-muted-foreground text-[10px] uppercase font-bold tracking-widest">{t('bi.estCost', 'Custo Est.')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length > 0 ? (
                jobs.map((job: Job) => {
                  const lostPieces = job.lost_pieces || 0;
                  const total = (job.produced_quantity || job.quantity || 1) + lostPieces;
                  const lossRate = (lostPieces / total) * 100;
                  const isCritical = lossRate > 5;
                  const isExtreme = lossRate > 15;

                  return (
                    <TableRow
                      key={job.id}
                      className={cn(
                        "border-white/5 hover:bg-white/5 cursor-pointer transition-all duration-300 relative overflow-hidden group/row",
                        isCritical && "bg-rose-500/5 hover:bg-rose-500/10 shadow-[inset_0_0_20px_rgba(244,63,94,0.05)]",
                        isExtreme && "bg-rose-500/10 hover:bg-rose-500/15"
                      )}
                      onClick={() => onShowDetails ? onShowDetails(job) : navigate(`/job/${job.id}`)}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "relative flex items-center justify-center h-8 w-8 rounded-lg transition-all",
                            isCritical ? "bg-rose-500/20 text-rose-500 animate-pulse" : "bg-primary/10 text-primary"
                          )}>
                            {isCritical ? <AlertTriangle className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                            {isExtreme && (
                              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                              </span>
                            )}
                          </div>
                          <div>
                            <div className={cn(
                              "font-bold text-sm tracking-tight transition-colors",
                              isCritical ? "text-rose-500 group-hover/row:text-rose-400" : "text-white"
                            )}>
                              {job.order_number || `OS-${job.id.slice(0, 5)}`}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-medium uppercase">{job.product_name || t('common.product', 'Produto')}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono transition-all duration-300 relative overflow-hidden",
                              isCritical
                                ? "text-rose-500 border-rose-500/50 bg-rose-500/10 shadow-[0_0_10px_rgba(244,63,94,0.3)] group-hover/row:scale-110"
                                : "text-muted-foreground border-white/10"
                            )}
                          >
                            {isCritical && (
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                              />
                            )}
                            <span className="relative z-10">{job.lost_pieces} {t('common.piecesShort', 'PCS')}</span>
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 min-w-[100px]">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className={isCritical ? "text-rose-500" : "text-muted-foreground"}>
                              {lossRate.toFixed(1)}% {t('bi.loss', 'PERDA')}
                            </span>
                            <span className="text-white/50">{(100 - lossRate).toFixed(1)}% OK</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all duration-1000",
                                isCritical ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-primary"
                              )}
                              style={{ width: `${100 - lossRate}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end group/cost relative">
                          <span className={cn(
                            "font-mono text-sm font-bold",
                            isCritical ? "text-rose-400" : "text-white"
                          )}>
                            R$ {((job.lost_pieces || 0) * 15.5).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {isCritical && (
                            <div className="flex items-center gap-1 text-[9px] text-rose-500 font-bold uppercase">
                              <TrendingDown className="h-2 w-2" />
                              {t('bi.highImpact', 'Alto Impacto')}
                            </div>
                          )}
                          <div className="absolute right-0 top-full mt-1 bg-black/95 border border-white/10 p-2 rounded-lg opacity-0 group-hover/cost:opacity-100 transition-opacity z-50 min-w-[150px] pointer-events-none shadow-2xl">
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">Impacto Financeiro</p>
                            <div className="flex justify-between text-[10px]">
                            <span>{t('bi.materialCost', 'Custo Material')}:</span>
                            <span className="text-white font-mono">R$ {((job.lost_pieces || 0) * 10).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span>{t('bi.machineHour', 'Hora Máquina')}:</span>
                            <span className="text-white font-mono">R$ {((job.lost_pieces || 0) * 5.5).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      {isCritical && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse" />
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-8 w-8 opacity-20" />
                      <span className="text-sm font-medium">{t('bi.noLosses', 'Nenhuma perda registrada no período')}</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}