/* eslint-disable react-hooks/incompatible-library -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { TablesUpdate } from '@/integrations/supabase/types';
import { useState, useMemo, useRef } from 'react';
import { parseDateOnly } from "@/lib/dateUtils";
import { useFuseSearch } from "@/hooks/useFuseSearch";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { JobDetailsModal } from "@/components/jobs/JobDetailsModal";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Search,
  Filter,
  Clock,
  AlertTriangle,
  Calendar,
  Package,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Download,
  Play,
  Trash2,
  BrainCircuit,
  Zap,
  TrendingDown,
  LayoutGrid,
  List,
  History,
  Info,
  ExternalLink,
  Settings2
} from "lucide-react";
import { useSchedulingData } from "@/features/jobs";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DbJob, DbTechnique, DbMachine } from "@/features/jobs";
import { JobStatus } from "@/types/scheduling";
import { canTransition } from "@/features/jobs/services/jobStateMachine";
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { SmartSequencingPanel } from "@/components/planning/SmartSequencingPanel";
import { LoadBalancingPanel } from "@/components/planning/LoadBalancingPanel";
import { PendingQueueStats } from "@/components/planning/PendingQueueStats";
import { AISuggestionDetails } from "@/components/planning/AISuggestionDetails";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { useDataExport } from "@/features/admin";
import { useSmartSequencingWithActions } from "@/features/jobs";
import type { SequencingSuggestion } from "@/features/jobs";
import { useLoadBalancingWithActions } from "@/features/analytics/hooks/useLoadBalancingWithActions";
import type { LoadBalancingSuggestion } from "@/features/analytics";
import { useAutoBufferPromotion } from "@/features/jobs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow, isAfter, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";


type SortField = 'orderNumber' | 'client' | 'scheduledDate' | 'priority' | 'quantity' | 'created_at';
type SortDirection = 'asc' | 'desc';

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
const priorityColors = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30'
};

const priorityLabels = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa'
};

// Static list — hoisted to module scope so it stays referentially stable.
const pendingStatuses: JobStatus[] = ['queue', 'ready', 'scheduled', 'delayed', 'rework'];

export default function PendingQueue() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTechnique, setSelectedTechnique] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedJob, setSelectedJob] = useState<DbJob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSmartSectionOpen, setIsSmartSectionOpen] = useState(false);
  const [isAISidePanelOpen, setIsAISidePanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    return window.innerWidth < 1024 ? 'grid' : 'table';
  });
  const [selectedAISuggestion, setSelectedAISuggestion] = useState<
    | { type: 'setup'; data: SequencingSuggestion }
    | { type: 'balancing'; data: LoadBalancingSuggestion }
    | null
  >(null);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();
  const { triggerPromotion, isPromoting, bufferTarget } = useAutoBufferPromotion();

  const { exportData, isExporting } = useDataExport('jobs');
  const { suggestions: seqSuggestions } = useSmartSequencingWithActions();
  const { suggestions: balancingSuggestions } = useLoadBalancingWithActions();

  // Create lookup maps for AI insights
  const jobsInOptimizedSequence = useMemo(() => {
    const set = new Set<string>();
    seqSuggestions.forEach(s => {
      s.optimizedSequence.forEach(j => set.add(j.id));
    });
    return set;
  }, [seqSuggestions]);

  const jobsWithBalancingSuggestion = useMemo(() => {
    const map = new Map<string, string>();
    balancingSuggestions.forEach(s => {
      map.set(s.jobId, s.suggestedMachineName);
    });
    return map;
  }, [balancingSuggestions]);

  // Fetch real data from Supabase
  const {
    jobs,
    techniques,
    isLoading: isLoadingJobs,
    isLoadingTechniques,
    getTechniqueById,
    getMachineById
  } = useSchedulingData();

  // Pre-filter by status first
  const pendingJobs = useMemo(() => {
    return jobs.filter(job => pendingStatuses.includes(job.status as JobStatus));
  }, [jobs]);

  // Apply Fuse.js fuzzy search
  const fuseSearchedJobs = useFuseSearch(pendingJobs, searchTerm, {
    keys: ['order_number', 'client', 'product'],
    threshold: 0.3,
  });

  const filteredJobs = useMemo(() => {
    return fuseSearchedJobs
      .filter(job => {
        const matchesTechnique = selectedTechnique === "all" || job.technique_id === selectedTechnique;
        const matchesStatus = selectedStatus === "all" || job.status === selectedStatus;
        const matchesPriority = selectedPriority === "all" || job.priority === selectedPriority;

        return matchesTechnique && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        let comparison = 0;

        switch (sortField) {
          case 'orderNumber':
            comparison = a.order_number.localeCompare(b.order_number);
            break;
          case 'client':
            comparison = a.client.localeCompare(b.client);
            break;
          case 'scheduledDate': {
            const dateA = parseDateOnly(a.scheduled_date)?.getTime() ?? 0;
            const dateB = parseDateOnly(b.scheduled_date)?.getTime() ?? 0;
            comparison = dateA - dateB;
            break;
          }
          case 'priority':
            comparison = priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
            break;
          case 'quantity':
            comparison = a.quantity - b.quantity;
            break;
          case 'created_at':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [fuseSearchedJobs, selectedTechnique, selectedStatus, selectedPriority, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedTechnique("all");
    setSelectedStatus("all");
    setSelectedPriority("all");
    setSortField('scheduledDate');
    setSortDirection('asc');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  };

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const stuckThreshold = subHours(now, 4);

    return {
      total: filteredJobs.length,
      urgent: filteredJobs.filter(j => j.priority === 'urgent').length,
      delayed: filteredJobs.filter(j => j.status === 'delayed').length,
      rework: filteredJobs.filter(j => j.status === 'rework').length,
      stuck: filteredJobs.filter(j => j.status === 'ready' && isAfter(stuckThreshold, new Date(j.updated_at))).length,
      optimizationPotential: seqSuggestions.reduce((acc, s) => acc + s.estimatedSavings, 0),
    };
  }, [filteredJobs, seqSuggestions]);


  // Virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredJobs.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  const handleJobClick = (dbJob: DbJob) => {
    setSelectedJob(dbJob);
    setIsModalOpen(true);
  };

  const handleSelectJob = (id: string) => {
    setSelectedJobs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const checkIfStuck = (job: DbJob) => {
    if (job.status !== 'ready') return false;
    const now = new Date();
    const stuckThreshold = subHours(now, 4);
    return isAfter(stuckThreshold, new Date(job.updated_at));
  };


  const handleSelectAll = () => {
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filteredJobs.map(j => j.id)));
    }
  };

  const handleBulkAction = async (action: 'production' | 'ready' | 'delete') => {
    if (selectedJobs.size === 0) return;

    try {
      if (action === 'delete') {
        const { error } = await supabase.from('jobs').delete().in('id', Array.from(selectedJobs));
        if (error) throw error;
        toast.success(`${selectedJobs.size} jobs excluídos`);
      } else {
        const targetStatus = action as JobStatus;
        const selectedJobsList = filteredJobs.filter(j => selectedJobs.has(j.id));
        const invalid = selectedJobsList.filter(j => !canTransition(j.status as JobStatus, targetStatus));
        if (invalid.length > 0) {
          toast.error(`${invalid.length} job(s) não podem ser movidos para "${targetStatus}" a partir do estado atual`);
          return;
        }

        const updateData: TablesUpdate<'jobs'> = {
          status: action,
          updated_at: new Date().toISOString()
        };
        if (action === 'production') {
          updateData.actual_start_time = new Date().toISOString();
        }

        await Promise.all(
          selectedJobsList.map(j => supabase.from('jobs').update(updateData).eq('id', j.id))
        );
        toast.success(`${selectedJobs.size} jobs movidos para "${action === 'production' ? 'Em Produção' : 'No Jeito'}"`);
      }

      setSelectedJobs(new Set());
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error) {
      toast.error('Erro ao processar ação em massa');
    }
  };

  if (isLoadingJobs || isLoadingTechniques) {
    return (
      <MainLayout>
        <div className="p-4 sm:p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-background p-4 sm:p-6 space-y-4 sm:space-y-6"
      >
        <Breadcrumbs />

        <JobDetailsModal
          job={selectedJob}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />

        <AISuggestionDetails
          isOpen={isAISidePanelOpen}
          onOpenChange={setIsAISidePanelOpen}
          suggestion={selectedAISuggestion}
        />

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Fila de Produção</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Gestão de backlog e buffer automático (Target: {bufferTarget} jobs/técnica)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-muted/50 text-foreground border-border">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              {stats.total} jobs na fila
            </Badge>
            {stats.urgent > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                {stats.urgent} urgentes
              </Badge>
            )}

            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerPromotion()}
                      disabled={isPromoting}
                      className={`h-8 border-violet-500/30 text-violet-400 hover:bg-violet-500/10 ${isPromoting ? 'animate-pulse' : ''}`}
                    >
                      <Zap className={`h-4 w-4 mr-1 ${isPromoting ? 'animate-spin' : ''}`} />
                      {isPromoting ? 'Promovendo...' : 'Buffer Force'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Acionar promoção automática manual do Buffer agora</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="outline"
                size="sm"
                className="h-8 border-primary/20 hover:bg-primary/5"
                onClick={() => exportData({
                  fileName: `fila_producao_${new Date().toISOString().split('T')[0]}`,
                  filters: {
                    status: pendingStatuses,
                    ...(selectedTechnique !== 'all' && { technique_id: selectedTechnique }),
                    ...(selectedPriority !== 'all' && { priority: selectedPriority })
                  }
                })}
                disabled={isExporting || filteredJobs.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                {isExporting ? 'Exportando...' : 'Exportar CSV'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <PendingQueueStats stats={stats} />


        {/* Filters */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Filtros
            </CardTitle>
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tabela</span>
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50"
                />
              </div>

              <Select value={selectedTechnique} onValueChange={setSelectedTechnique}>
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue placeholder="Técnica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {techniques.map(technique => (
                    <SelectItem key={technique.id} value={technique.id}>
                      {technique.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="queue">Na Fila</SelectItem>
                  <SelectItem value="ready">No Jeito</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="delayed">Atrasado</SelectItem>
                  <SelectItem value="rework">Retrabalho</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={resetFilters}
                className="border-border/50 hover:bg-muted/50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Smart Recommendations Section */}
        <Collapsible
          open={isSmartSectionOpen}
          onOpenChange={setIsSmartSectionOpen}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              Otimização de Planejamento
            </h2>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-2">
                {isSmartSectionOpen ? (
                  <>Ocultar <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Ver Sugestões <ChevronDown className="h-4 w-4" /></>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="animate-accordion-down">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              <SmartSequencingPanel
                onExplain={(suggestion) => {
                  setSelectedAISuggestion({ type: 'setup', data: suggestion });
                  setIsAISidePanelOpen(true);
                }}
              />
              <LoadBalancingPanel
                onExplain={(suggestion) => {
                  setSelectedAISuggestion({ type: 'balancing', data: suggestion });
                  setIsAISidePanelOpen(true);
                }}
              />
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Dicas de Planejamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>• Agrupe jobs pela mesma cor de gravura para reduzir o tempo de setup.</p>
                  <p>• Priorize jobs urgentes, mas tente encaixá-los em grupos de cores existentes.</p>
                  <p>• Utilize o balanceamento de carga para não sobrecarregar uma única máquina.</p>
                  <p>• O sequenciamento inteligente agrupa por cor e prioridade automaticamente.</p>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Bulk Actions Bar */}
        {selectedJobs.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 sticky top-2 z-30 backdrop-blur-md shadow-lg animate-in slide-in-from-top-4 duration-300">
            <Badge variant="secondary" className="font-bold">{selectedJobs.size} selecionados</Badge>
            <div className="h-4 w-px bg-border/50 mx-1 hidden sm:block" />
            <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold tracking-wider gap-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" onClick={() => handleBulkAction('production')}>
              <Play className="h-3 w-3" /> Iniciar Produção
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold tracking-wider gap-1 border-warning/30 text-warning hover:bg-warning/10" onClick={() => handleBulkAction('ready')}>
              <Package className="h-3 w-3" /> Marcar No Jeito
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold tracking-wider gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => {
              if (window.confirm('Excluir permanentemente estes jobs?')) handleBulkAction('delete');
            }}>
              <Trash2 className="h-3 w-3" /> Excluir
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[10px] uppercase font-bold tracking-wider ml-auto text-muted-foreground" onClick={() => setSelectedJobs(new Set())}>
              Limpar seleção
            </Button>
          </div>
        )}

        {/* Main View Area */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
          <CardContent className="p-0">
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
                          onChange={handleSelectAll}
                          className="rounded border-border accent-primary"
                        />
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors w-[100px]" onClick={() => handleSort('orderNumber')}>
                        <div className="flex items-center gap-2">OS <SortIcon field="orderNumber" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('client')}>
                        <div className="flex items-center gap-2">Cliente <SortIcon field="client" /></div>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Produto</TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors hidden sm:table-cell" onClick={() => handleSort('quantity')}>
                        <div className="flex items-center gap-2">Qtd <SortIcon field="quantity" /></div>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">Técnica</TableHead>
                      <TableHead className="hidden xl:table-cell">Máquina</TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors hidden sm:table-cell" onClick={() => handleSort('created_at')}>
                        <div className="flex items-center gap-2">Criação <SortIcon field="created_at" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors hidden sm:table-cell" onClick={() => handleSort('scheduledDate')}>
                        <div className="flex items-center gap-2">Data <SortIcon field="scheduledDate" /></div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort('priority')}>
                        <div className="flex items-center gap-2">
                          <span className="hidden sm:inline">Prioridade</span>
                          <span className="sm:hidden">Prio</span>
                          <SortIcon field="priority" />
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
                            const isStuck = checkIfStuck(job);

                            return (
                              <TableRow
                                key={job.id}
                                data-index={virtualRow.index}
                                ref={rowVirtualizer.measureElement}
                                className={`border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${isStuck ? 'bg-warning/5' : ''}`}
                                onClick={() => handleJobClick(job)}
                                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                              >
                                <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                                  <input type="checkbox" checked={selectedJobs.has(job.id)} onChange={() => handleSelectJob(job.id)} className="rounded border-border accent-primary" />
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
                      const isStuck = checkIfStuck(job);
                      const isSelected = selectedJobs.has(job.id);
                      return (
                        <motion.div key={job.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2, delay: index * 0.02 }}>
                          <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer ${isSelected ? 'ring-2 ring-primary border-primary' : 'bg-card/40 border-border/50 hover:border-primary/50'} ${isStuck ? 'border-warning/50 shadow-amber-500/5' : ''}`} onClick={() => handleJobClick(job)}>
                            {isStuck && <div className="absolute top-0 right-0 p-1 bg-warning text-white rounded-bl-lg shadow-sm z-10"><AlertTriangle className="h-3 w-3 animate-pulse" /></div>}
                            <CardHeader className="p-4 pb-2">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex flex-col"><span className="text-xs text-muted-foreground font-mono">OS {job.order_number}</span><CardTitle className="text-sm font-bold line-clamp-1 mt-0.5">{job.client}</CardTitle></div>
                                <input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); handleSelectJob(job.id); }} className="rounded border-border accent-primary h-4 w-4" />
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
          </CardContent>
        </Card>
      </motion.div>
    </MainLayout>
  );
}
