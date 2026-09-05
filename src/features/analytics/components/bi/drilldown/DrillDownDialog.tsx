import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileSpreadsheet, FileText, Search, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Job } from "@/types/job";


interface DrillDownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  jobs: Job[];
  onExport: (format: 'csv' | 'pdf') => void;
}

export function DrillDownDialog({ open, onOpenChange, title, jobs, onExport }: DrillDownDialogProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredJobs = useMemo(() => {
    let result = jobs;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(job =>
        job.order_number?.toLowerCase().includes(lowerSearch) ||
        job.product?.toLowerCase().includes(lowerSearch) ||
        job.status?.toLowerCase().includes(lowerSearch)
      );
    }
    return result;
  }, [jobs, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setSearchTerm("");
    }}>
      <DialogContent className="max-w-4xl bg-black/95 border-primary/30 backdrop-blur-3xl text-white shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <DialogHeader className="flex flex-col space-y-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-2xl text-title tracking-widest text-primary uppercase">
                  {title}
                </DialogTitle>
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 h-6">
                  {jobs.length} {t('common.items', 'itens')}
                </Badge>
              </div>
              <DialogDescription className="text-muted-foreground mt-1">
                Lista detalhada de pedidos e métricas de execução para o segmento selecionado.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 bg-white/5 border-white/10 hover:bg-primary/20 text-xs text-white"
                onClick={() => onExport('csv')}
              >
                <FileSpreadsheet className="h-4 w-4 text-success" /> CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 bg-white/5 border-white/10 hover:bg-primary/20 text-xs text-white"
                onClick={() => onExport('pdf')}
              >
                <FileText className="h-4 w-4 text-primary" /> PDF
              </Button>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Pesquisar por OS, produto ou status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 transition-all h-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="mt-4">
          <ScrollArea className="h-[500px] pr-4">
            <Table>
              <TableHeader className="sticky top-0 bg-black/95 z-10">
                <TableRow className="border-white/20 hover:bg-transparent">
                  <TableHead className="text-primary text-xs uppercase font-bold w-[120px]">OS</TableHead>
                  <TableHead className="text-primary text-xs uppercase font-bold">Produto</TableHead>
                  <TableHead className="text-primary text-xs uppercase font-bold text-center">Status</TableHead>
                  <TableHead className="text-primary text-xs uppercase font-bold text-center">Qtd</TableHead>
                  <TableHead className="text-primary text-xs uppercase font-bold text-center">Perdas</TableHead>
                  <TableHead className="text-primary text-xs uppercase font-bold text-right">Eficiência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((job: Job) => (
                    <TableRow key={job.id} className="border-white/5 hover:bg-primary/10 transition-colors cursor-pointer group/row" onClick={() => navigate(`/job/${job.id}`)}>
                      <TableCell className="font-mono text-sm font-bold group-hover:text-primary transition-colors">{job.order_number}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{job.product}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                          "text-[9px] uppercase tracking-tighter",
                          job.status === 'finished' ? "text-success border-success/30 bg-success/10" :
                          job.status === 'production' ? "text-blue-400 border-blue-400/30 bg-blue-400/10" :
                          job.status === 'delayed' ? "text-primary border-primary/30 bg-primary/10" :
                          "text-warning border-warning/30 bg-warning/10"
                        )}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold text-white/90">{job.quantity}</TableCell>
                      <TableCell className="text-center">
                        {(job.lost_pieces || 0) > 0 ? (
                          <span className="text-primary font-bold text-xs">-{job.lost_pieces}</span>
                        ) : (
                          <span className="text-success/50 text-xs">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-primary/80">
                        {job.efficiency}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Filter className="h-8 w-8 text-muted-foreground/30" />
                        <p>Nenhum pedido corresponde à sua pesquisa.</p>
                        {searchTerm && (
                          <Button
                            variant="link"
                            className="text-primary h-auto p-0"
                            onClick={() => setSearchTerm("")}
                          >
                            Limpar filtros
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}

              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}