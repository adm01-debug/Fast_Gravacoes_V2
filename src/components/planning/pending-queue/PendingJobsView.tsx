import type { RefObject } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowUpDown,
  BrainCircuit,
  Calendar,
  ChevronDown,
  ChevronUp,
  Package,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { parseDateOnly } from '@/lib/dateUtils';
import { useSchedulingData } from '@/features/jobs';
import type { DbJob } from '@/features/jobs';
import {
  isJobStuck,
  priorityColors,
  priorityLabels,
  type SortDirection,
  type SortField,
} from '@/features/jobs/lib/pending-queue';

interface PendingJobsViewProps {
  viewMode: 'table' | 'grid';
  filteredJobs: DbJob[];
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  tableContainerRef: RefObject<HTMLDivElement>;
  selectedJobs: Set<string>;
  jobsInOptimizedSequence: Set<string>;
  jobsWithBalancingSuggestion: Map<string, string>;
  onJobClick: (job: DbJob) => void;
  onSelectJob: (id: string) => void;
  onSelectAll: () => void;
  onSort: (field: SortField) => void;
  sortField: SortField;
  sortDirection: SortDirection;
}

export function PendingJobsView({
  viewMode,
  filteredJobs,
  rowVirtualizer,
  tableContainerRef,
  selectedJobs,
  jobsInOptimizedSequence,
  jobsWithBalancingSuggestion,
  onJobClick,
  onSelectJob,
  onSelectAll,
  onSort,
  sortField,
  sortDirection,
}: PendingJobsViewProps) {
  const { getTechniqueById, getMachineById } = useSchedulingData();

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <>
      {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                {/* Fixed Header */}
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="w-[40px]">
                        <input
                          type="checkbox"
                          checked={selectedJobs.size === filteredJobs.length && filteredJobs.length > 0}
                          onChange={onSelectAll}
                          className="rounded border-border accent-primary"
                        />
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors w-[100px]" onClick={() => onSort('orderNumber')}>
                        <div className="flex items-center gap-2">OS {renderSortIcon('orderNumber')}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors" onClick={() => onSort('client')}>
                        <div className="flex items-center gap-2">Cliente {renderSortIcon('client')}</div>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Produto</TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors hidden sm:table-cell" onClick={() => onSort('quantity')}>
                        <div className="flex items-center gap-2">Qtd {renderSortIcon('quantity')}</div>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">Técnica</TableHead>
                      <TableHead className="hidden xl:table-cell">Máquina</TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors hidden sm:table-cell" onClick={() => onSort('created_at')}>
                        <div className="flex items-center gap-2">Criação {renderSortIcon('created_at')}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors hidden sm:table-cell" onClick={() => onSort('scheduledDate')}>
                        <div className="flex items-center gap-2">Data {renderSortIcon('scheduledDate')}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors" onClick={() => onSort('priority')}>
                        <div className="flex items-center gap-2">
                          <span className="hidden sm:inline">Prioridade</span>
                          <span className="sm:hidden">Prio</span>
                          {renderSortIcon('priority')}
                        </div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Insight IA</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>

                {/* Virtualized Body */}
                {filteredJobs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                    <Package className="h-10 w-10 opacity-20" />
                    <p>Nenhum job pendente encontrado.</p>
                  </div>
                ) : (
                  <div ref={tableContainerRef} className="max-h-[600px] overflow-auto scrollbar-thin scrollbar-thumb-primary/20">
                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
                      <Table>
                        <TableBody>
                          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const job = filteredJobs[virtualRow.index];
                            const technique = getTechniqueById(job.technique_id);
                            const machine = job.machine_id ? getMachineById(job.machine_id) : null;
                            const isStuck = isJobStuck(job);

                            return (
                              <TableRow
                                key={job.id}
                                data-index={virtualRow.index}
                                ref={rowVirtualizer.measureElement}
                                className={`border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${isStuck ? 'bg-warning/5' : ''}`}
                                onClick={() => onJobClick(job)}
                                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                              >
                                <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                                  <input type="checkbox" checked={selectedJobs.has(job.id)} onChange={() => onSelectJob(job.id)} className="rounded border-border accent-primary" />
                                </TableCell>
                                <TableCell className="font-medium text-foreground text-xs sm:text-sm w-[100px] flex items-center gap-1.5">
                                  {job.order_number}
                                  {isStuck && <AlertTriangle className="h-3 w-3 text-warning animate-pulse" />}
                                </TableCell>
                                <TableCell className="text-foreground text-xs sm:text-sm max-w-[120px] truncate">{job.client}</TableCell>
                                <TableCell className="text-muted-foreground max-w-[150px] truncate hidden md:table-cell text-xs sm:text-sm">{job.product}</TableCell>
                                <TableCell className="text-foreground hidden sm:table-cell text-xs sm:text-sm">{job.quantity.toLocaleString()}</TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  <Badge variant="outline" className="text-[10px] px-1.5 h-5" style={{ backgroundColor: `${technique?.color}20`, borderColor: `${technique?.color}50`, color: technique?.color }}>{technique?.short_name || technique?.name}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground hidden xl:table-cell text-xs sm:text-sm">{machine?.code || <Badge variant="outline" className="text-red-400 bg-red-400/5 border-red-400/10 text-[10px] animate-pulse">NÃO ATRIBUÍDA</Badge>}</TableCell>
                                <TableCell className="text-muted-foreground hidden sm:table-cell text-xs sm:text-sm">
                                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ptBR })}
                                </TableCell>
                                <TableCell className="text-foreground hidden sm:table-cell text-xs sm:text-sm">
                                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-muted-foreground" /> {job.scheduled_date ? (parseDateOnly(job.scheduled_date)?.toLocaleDateString('pt-BR') ?? '-') : '-'}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={`${priorityColors[job.priority]} border text-[10px] px-1.5 h-5`}>
                                    <span className="hidden sm:inline">{priorityLabels[job.priority]}</span>
                                    <span className="sm:hidden">{job.priority.charAt(0).toUpperCase()}</span>
                                  </Badge>
                                </TableCell>
                                <TableCell><StatusBadge status={job.status} /></TableCell>
                                <TableCell className="hidden lg:table-cell">
                                  <div className="flex flex-wrap gap-1">
                                    {jobsInOptimizedSequence.has(job.id) && <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px] gap-1 px-1.5 h-5"><Zap className="h-2.5 w-2.5" /> Setup</Badge>}
                                    {jobsWithBalancingSuggestion.has(job.id) && <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] gap-1 px-1.5 h-5"><BrainCircuit className="h-2.5 w-2.5" /> Equilíbrio</Badge>}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20">
                <AnimatePresence>
                  {filteredJobs.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-muted-foreground flex flex-col items-center gap-2">
                      <Package className="h-12 w-12 opacity-20" />
                      <p>Nenhum job pendente encontrado.</p>
                    </div>
                  ) : (
                    filteredJobs.map((job, index) => {
                      const technique = getTechniqueById(job.technique_id);
                      const isStuck = isJobStuck(job);
                      const isSelected = selectedJobs.has(job.id);
                      return (
                        <motion.div key={job.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, delay: index * 0.02 }}>
                          <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer ${isSelected ? 'ring-2 ring-primary border-primary' : 'bg-card/40 border-border/50 hover:border-primary/50'} ${isStuck ? 'border-warning/50 shadow-amber-500/5' : ''}`} onClick={() => onJobClick(job)}>
                            {isStuck && <div className="absolute top-0 right-0 p-1 bg-warning text-white rounded-bl-lg shadow-sm z-10"><AlertTriangle className="h-3 w-3 animate-pulse" /></div>}
                            <CardHeader className="p-4 pb-2">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex flex-col"><span className="text-xs text-muted-foreground font-mono">OS {job.order_number}</span><CardTitle className="text-sm font-bold line-clamp-1 mt-0.5">{job.client}</CardTitle></div>
                                <input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); onSelectJob(job.id); }} className="rounded border-border accent-primary h-4 w-4" />
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-2 space-y-3">
                              <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{job.product || 'Sem descrição do produto'}</p>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-bold" style={{ backgroundColor: `${technique?.color}15`, borderColor: `${technique?.color}30`, color: technique?.color }}>{technique?.name || 'Técnica Indefinida'}</Badge>
                                <Badge className={`${priorityColors[job.priority]} border text-[10px] px-1.5 h-5`}>{priorityLabels[job.priority]}</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
                                <div className="flex flex-col gap-0.5"><span className="text-[10px] text-muted-foreground uppercase">Quantidade</span><span className="text-xs font-medium">{job.quantity.toLocaleString()} un</span></div>
                                <div className="flex flex-col gap-0.5"><span className="text-[10px] text-muted-foreground uppercase">Entrega</span><span className="text-xs font-medium flex items-center gap-1"><Calendar className="h-2.5 w-2.5 text-muted-foreground" /> {job.scheduled_date ? (parseDateOnly(job.scheduled_date)?.toLocaleDateString('pt-BR') ?? '-') : '-'}</span></div>
                              </div>
                            </CardContent>
                            <CardFooter className="p-4 pt-0 flex justify-between items-center gap-2">
                              <StatusBadge status={job.status} />
                              {isStuck && <span className="text-[10px] text-warning font-medium">Estagnado</span>}
                            </CardFooter>
                          </Card>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            )}
    </>
  );
}
