import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "@/lib/recharts";
import { BarChart3, PieChart as PieChartIcon, Users, Activity } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const actionColors: Record<string, string> = {
  view: "hsl(217, 91%, 60%)",
  start: "hsl(142, 76%, 36%)",
  pause: "hsl(45, 93%, 47%)",
  resume: "hsl(187, 85%, 53%)",
  finish: "hsl(271, 91%, 65%)",
};

const actionLabels: Record<string, string> = {
  view: "Visualizou",
  start: "Iniciou",
  pause: "Pausou",
  resume: "Retomou",
  finish: "Finalizou",
};

export const ScanStatsChart = () => {
  const [period, setPeriod] = useState<"7" | "14" | "30">("7");

  const { data: scans, isLoading } = useQuery({
    queryKey: ["scan-stats", period],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(period, 10));

      const { data, error } = await supabase
        .from("qr_scan_history")
        .select("*")
        .gte("scanned_at", startDate.toISOString())
        .order("scanned_at", { ascending: true });

      if (error) throw error;

      // Fetch operator names
      const operatorIds = [...new Set(data.map((s) => s.operator_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", operatorIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.id, p.full_name || "Operador"]) || []
      );

      return data.map((scan) => ({
        ...scan,
        operator_name: profileMap.get(scan.operator_id) || "Operador",
      }));
    },
  });

  // Stats by operator
  const operatorStats = useMemo(() => {
    if (!scans) return [];

    const stats = new Map<string, { name: string; scans: number }>();
    scans.forEach((scan) => {
      const current = stats.get(scan.operator_id) || { name: scan.operator_name, scans: 0 };
      current.scans += 1;
      stats.set(scan.operator_id, current);
    });

    return Array.from(stats.values())
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 10);
  }, [scans]);

  // Stats by action type
  const actionStats = useMemo(() => {
    if (!scans) return [];

    const stats = new Map<string, number>();
    scans.forEach((scan) => {
      stats.set(scan.action, (stats.get(scan.action) || 0) + 1);
    });

    return Array.from(stats.entries()).map(([action, count]) => ({
      action,
      label: actionLabels[action] || action,
      count,
      fill: actionColors[action] || "hsl(var(--primary))",
    }));
  }, [scans]);

  // Stats by day
  const dailyStats = useMemo(() => {
    if (!scans) return [];

    const stats = new Map<string, { date: string; scans: number }>();

    // Initialize all days in period
    for (let i = parseInt(period, 10) - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "dd/MM", { locale: ptBR });
      stats.set(date, { date, scans: 0 });
    }

    scans.forEach((scan) => {
      const date = format(new Date(scan.scanned_at), "dd/MM", { locale: ptBR });
      const current = stats.get(date);
      if (current) {
        current.scans += 1;
      }
    });

    return Array.from(stats.values());
  }, [scans, period]);

  const chartConfig = {
    scans: {
      label: "Scans",
      color: "hsl(var(--primary))",
    },
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Estatísticas de Scans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalScans = scans?.length || 0;
  const uniqueOperators = new Set(scans?.map((s) => s.operator_id)).size;

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Estatísticas de Scans
          </CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList className="h-8">
              <TabsTrigger value="7" className="text-xs px-3">7 dias</TabsTrigger>
              <TabsTrigger value="14" className="text-xs px-3">14 dias</TabsTrigger>
              <TabsTrigger value="30" className="text-xs px-3">30 dias</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 text-primary">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Total de Scans</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{totalScans}</p>
          </div>
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <div className="flex items-center gap-2 text-cyan-400">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Operadores Ativos</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{uniqueOperators}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="daily" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily" className="gap-1 text-xs">
              <BarChart3 className="h-3 w-3" />
              Por Dia
            </TabsTrigger>
            <TabsTrigger value="operator" className="gap-1 text-xs">
              <Users className="h-3 w-3" />
              Por Operador
            </TabsTrigger>
            <TabsTrigger value="action" className="gap-1 text-xs">
              <PieChartIcon className="h-3 w-3" />
              Por Ação
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="h-[250px]">
            {dailyStats.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={dailyStats}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="scans"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Scans"
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </TabsContent>

          <TabsContent value="operator" className="h-[250px]">
            {operatorStats.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart data={operatorStats} layout="vertical">
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="scans"
                    fill="hsl(187, 85%, 53%)"
                    radius={[0, 4, 4, 0]}
                    name="Scans"
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </TabsContent>

          <TabsContent value="action" className="h-[250px]">
            {actionStats.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <PieChart>
                  <Pie
                    data={actionStats}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ label, percent }) =>
                      `${label}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {actionStats.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
