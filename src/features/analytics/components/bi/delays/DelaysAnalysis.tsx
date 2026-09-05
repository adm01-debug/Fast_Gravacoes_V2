import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Timer, FileSpreadsheet, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Job } from "@/types/job";

interface DelaysAnalysisProps {
  delayedJobs: Job[];
  rootCauses: { label: string; value: number; color: string }[];
  onExport: (format: 'csv' | 'pdf', type: string) => void;
}

export function DelaysAnalysis({ delayedJobs, rootCauses, onExport }: DelaysAnalysisProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Card className="bg-black/40 border-primary/20 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-3">
          <Timer className="h-5 w-5 text-primary" />
          <span className="text-title tracking-wider uppercase">{t('bi.delaysAndCauses', 'Atrasos & Causa Raiz')}</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => onExport('csv', 'Analise_Atrasos')}
          >
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => onExport('pdf', 'Analise_Atrasos')}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/5">
            <TabsTrigger value="list" className="text-xs uppercase tracking-widest data-[state=active]:bg-primary/20">{t('bi.delayList', 'Lista de Atrasos')}</TabsTrigger>
            <TabsTrigger value="causes" className="text-xs uppercase tracking-widest data-[state=active]:bg-primary/20">{t('bi.rootCauses', 'Causas Raiz')}</TabsTrigger>
          </TabsList>
          <TabsContent value="list" className="mt-4">
            <ScrollArea className="h-[250px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-muted-foreground text-xs">{t('common.order', 'Pedido')}</TableHead>
                    <TableHead className="text-muted-foreground text-xs">{t('common.delay', 'Atraso')}</TableHead>
                    <TableHead className="text-right text-muted-foreground text-xs">{t('common.responsible', 'Responsável')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delayedJobs.length > 0 ? (
                    delayedJobs.map((job: Job) => (
                      <TableRow key={job.id} className="border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => navigate(`/job/${job.id}`)}>
                        <TableCell className="text-xs font-medium">
                          {job.order_number || `OS-${job.id.slice(0, 5)}`}
                          <div className="text-[10px] text-muted-foreground">{job.product_name}</div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-rose-400 font-bold">
                            {job.delay_time || 'Atrasado'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-[10px]">
                          {job.responsible_name || job.operator_id || 'Não atribuído'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum pedido atrasado</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="causes" className="mt-4">
            <div className="space-y-4">
              {rootCauses.map((cause) => (
                <div key={cause.label} className="group/cause relative">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest mb-1">
                    <span>{cause.label}</span>
                    <span className="text-primary">{cause.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${cause.value}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full relative"
                      style={{ backgroundColor: cause.color }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </motion.div>
                  </div>
                  <div className="mt-2 opacity-0 group-hover/cause:opacity-100 transition-opacity flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground uppercase">Ação Recomendada:</span>
                    <span className="text-[9px] text-primary font-bold uppercase">
                      {cause.label.includes('Máquina') ? 'Manutenção Preventiva' :
                       cause.label.includes('Material') ? 'Revisão de Lote' :
                       'Ajuste de Fluxo'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
