/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Filter, Volume2, VolumeX, BarChart3, List, LayoutGrid } from "lucide-react";
import { startOfDay, endOfDay, isWithinInterval, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { playNotificationSound } from "./scanHistorySounds";
import { ScanHistoryFilters } from "./ScanHistoryFilters";
import { ScanHistoryCharts } from "./ScanHistoryCharts";
import { ScanHistoryPagination } from "./ScanHistoryPagination";
import { ScanHistoryItem } from "./ScanHistoryItem";
import { ScanHistoryOperatorCounters } from "./ScanHistoryOperatorCounters";
import { Eye, Play, Pause, RotateCcw, CheckCircle2 } from "lucide-react";
import { useRealtimeChannel } from "@/lib/realtimeChannel";
import { toast as sonnerToast } from "sonner";

interface ScanHistoryProps {
  jobId?: string;
  limit?: number;
}

const actionConfig: Record<string, { label: string; icon: typeof Play; color: string }> = {
  view: { label: "Visualizou", icon: Eye, color: "text-blue-400 bg-blue-500/20" },
  start: { label: "Iniciou", icon: Play, color: "text-green-400 bg-green-500/20" },
  pause: { label: "Pausou", icon: Pause, color: "text-yellow-400 bg-yellow-500/20" },
  resume: { label: "Retomou", icon: RotateCcw, color: "text-cyan-400 bg-cyan-500/20" },
  finish: { label: "Finalizou", icon: CheckCircle2, color: "text-purple-400 bg-purple-500/20" },
};

export const ScanHistory = ({ jobId, limit = 200 }: ScanHistoryProps) => {
  const [operatorFilter, setOperatorFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"charts" | "list" | "both">("both");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newScanIds, setNewScanIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const queryClient = useQueryClient();

  const { data: scans, isLoading } = useQuery({
    queryKey: ['scan-history', jobId, limit],
    queryFn: async () => {
      let query = supabase.from("qr_scan_history").select(`*, jobs:job_id (order_number, product, client)`).order("scanned_at", { ascending: false }).limit(limit);
      if (jobId) query = query.eq("job_id", jobId);
      const { data, error } = await query;
      if (error) throw error;
      const operatorIds = [...new Set(data.map(s => s.operator_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", operatorIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      return data.map(scan => ({ ...scan, operator_name: profileMap.get(scan.operator_id) || "Operador" }));
    }
  });

  const soundEnabledRef = useRef(soundEnabled);
  const setNewScanIdsRef = useRef(setNewScanIds);
  const highlightTimeoutRef = useRef<number | null>(null);
  // Keep the refs mirroring the latest props without mutating them during
  // render (React refs must only be read/written in effects or handlers).
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    setNewScanIdsRef.current = setNewScanIds;
  }, [soundEnabled, setNewScanIds]);

  // Ref-based callback for the realtime listener — avoids stale closures and
  // ensures the channel uses the shared singleton from realtimeChannel.ts.
  const handleNewScan = useCallback(async (payload: { new: Record<string, unknown> }) => {
    const newScan = payload.new as { id: string; job_id: string; operator_id: string; action: string };
    if (jobId && newScan.job_id !== jobId) return;
    if (soundEnabledRef.current) playNotificationSound(newScan.action);
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", newScan.operator_id).maybeSingle();
    const actionLabel = actionConfig[newScan.action]?.label || newScan.action;
    sonnerToast("Novo scan registrado", { description: `${profile?.full_name || "Operador"} ${actionLabel.toLowerCase()} uma produção`, duration: 4000 });
    setNewScanIdsRef.current(prev => new Set(prev).add(newScan.id));
    if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = window.setTimeout(() => {
      setNewScanIdsRef.current(prev => { const u = new Set(prev); u.delete(newScan.id); return u; });
    }, 3000);
    queryClient.invalidateQueries({ queryKey: ['scan-history'] });
  }, [jobId, queryClient]);

  useRealtimeChannel(
    () => `scan-history-realtime-${jobId ?? 'all'}`,
    [{ event: 'INSERT', schema: 'public', table: 'qr_scan_history' }],
    handleNewScan,
  );

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  const operators = useMemo(() => {
    if (!scans) return [];
    const m = new Map<string, string>();
    scans.forEach(s => { if (!m.has(s.operator_id)) m.set(s.operator_id, s.operator_name); });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [scans]);

  const operatorScanCounts = useMemo(() => {
    if (!scans) return [];
    const counts = new Map<string, { name: string; count: number; lastAction: string }>();
    scans.forEach(s => { const e = counts.get(s.operator_id); if (e) e.count += 1; else counts.set(s.operator_id, { name: s.operator_name, count: 1, lastAction: s.action }); });
    return Array.from(counts.entries()).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.count - a.count);
  }, [scans]);

  const filteredScans = useMemo(() => {
    if (!scans) return [];
    return scans.filter(scan => {
      if (operatorFilter !== "all" && scan.operator_id !== operatorFilter) return false;
      if (actionFilter !== "all" && scan.action !== actionFilter) return false;
      if (dateRange?.from) {
        const scanDate = new Date(scan.scanned_at);
        if (!isWithinInterval(scanDate, { start: startOfDay(dateRange.from), end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from) })) return false;
      }
      return true;
    });
  }, [scans, operatorFilter, actionFilter, dateRange]);

  const actionDistribution = useMemo(() => {
    if (!filteredScans.length) return [];
    const counts = new Map<string, number>();
    filteredScans.forEach(s => counts.set(s.action, (counts.get(s.action) || 0) + 1));
    const colors: Record<string, string> = { view: "hsl(217, 91%, 60%)", start: "hsl(142, 76%, 36%)", pause: "hsl(45, 93%, 47%)", resume: "hsl(187, 85%, 53%)", finish: "hsl(271, 91%, 65%)" };
    return Array.from(counts.entries()).map(([action, count]) => ({ action, label: actionConfig[action]?.label || action, count, fill: colors[action] || "hsl(var(--primary))", percentage: ((count / filteredScans.length) * 100).toFixed(0) }));
  }, [filteredScans]);

  const dailyEvolution = useMemo(() => {
    if (!filteredScans.length) return [];
    const stats = new Map<string, { date: string; fullDate: string; scans: number }>();
    for (let i = 6; i >= 0; i--) { const d = subDays(new Date(), i); const k = format(d, "yyyy-MM-dd"); stats.set(k, { date: format(d, "dd/MM", { locale: ptBR }), fullDate: k, scans: 0 }); }
    filteredScans.forEach(s => { const k = format(new Date(s.scanned_at), "yyyy-MM-dd"); const e = stats.get(k); if (e) e.scans += 1; });
    return Array.from(stats.values());
  }, [filteredScans]);

  const totalPages = Math.ceil(filteredScans.length / itemsPerPage);
  const paginatedScans = useMemo(() => filteredScans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredScans, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [operatorFilter, actionFilter, dateRange]);

  const hasActiveFilters = operatorFilter !== "all" || actionFilter !== "all" || !!dateRange?.from;
  const clearFilters = () => { setOperatorFilter("all"); setActionFilter("all"); setDateRange(undefined); setCurrentPage(1); };

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5 text-primary" />Histórico de Scans</CardTitle></CardHeader>
        <CardContent><div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div></CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />Histórico de Scans
            {filteredScans.length > 0 && <Badge variant="secondary" className="ml-2">{filteredScans.length}{hasActiveFilters && scans && ` / ${scans.length}`}</Badge>}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border/50 p-0.5">
              <Button variant={viewMode === "charts" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("charts")} className="h-7 px-2"><BarChart3 className="h-4 w-4" /></Button>
              <Button variant={viewMode === "both" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("both")} className="h-7 px-2"><LayoutGrid className="h-4 w-4" /></Button>
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-7 px-2"><List className="h-4 w-4" /></Button>
            </div>
            <Button variant={soundEnabled ? "secondary" : "ghost"} size="sm" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button variant={showFilters ? "secondary" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
              <Filter className="h-4 w-4" />Filtros
              {hasActiveFilters && <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-xs">!</Badge>}
            </Button>
          </div>
        </div>
        <ScanHistoryOperatorCounters operatorScanCounts={operatorScanCounts} hasNewScans={newScanIds.size > 0} />
      </CardHeader>

      <CardContent className="space-y-4">
        {showFilters && (
          <ScanHistoryFilters operatorFilter={operatorFilter} actionFilter={actionFilter} dateRange={dateRange} operators={operators} hasActiveFilters={hasActiveFilters} onOperatorFilterChange={setOperatorFilter} onActionFilterChange={setActionFilter} onDateRangeChange={setDateRange} onClear={clearFilters} />
        )}

        {(viewMode === "charts" || viewMode === "both") && (
          <ScanHistoryCharts actionDistribution={actionDistribution} dailyEvolution={dailyEvolution} />
        )}

        {(viewMode === "list" || viewMode === "both") && (
          <>
            <ScrollArea className="h-[350px] pr-4">
              {filteredScans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{hasActiveFilters ? "Nenhum scan encontrado com os filtros aplicados" : "Nenhum scan registrado"}</p>
                  {hasActiveFilters && <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">Limpar filtros</Button>}
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedScans.map(scan => (
                    <ScanHistoryItem key={scan.id} scan={scan} isNew={newScanIds.has(scan.id)} showJobInfo={!jobId} />
                  ))}
                </div>
              )}
            </ScrollArea>
            {filteredScans.length > 0 && (
              <ScanHistoryPagination currentPage={currentPage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={filteredScans.length} onPageChange={setCurrentPage} onItemsPerPageChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
