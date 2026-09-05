import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "@/lib/recharts";
import { BarChart3, TrendingUp, Clock } from "lucide-react";

interface TelemetryRow {
  id: string;
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  severity: string;
  created_at: string;
}

interface TelemetryChartsProps {
  rows: TelemetryRow[];
  timeFilter: string;
}

function getBucketMs(timeFilter: string): number {
  switch (timeFilter) {
    case "1h": return 5 * 60 * 1000;      // 5 min
    case "6h": return 30 * 60 * 1000;     // 30 min
    case "24h": return 60 * 60 * 1000;    // 1 hora
    default: return 6 * 60 * 60 * 1000;   // 6 horas (7d/custom)
  }
}

function formatBucketTime(ts: number, timeFilter: string): string {
  const d = new Date(ts);
  if (timeFilter === "7d" || timeFilter === "custom") {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function TelemetryCharts({ rows, timeFilter }: TelemetryChartsProps) {
  // 1. Stacked AreaChart — Alertas por Severidade ao longo do tempo
  const stackedData = useMemo(() => {
    if (rows.length === 0) return [];
    const bucketMs = getBucketMs(timeFilter);
    const buckets = new Map<number, { lentas: number; muitoLentas: number; erros: number }>();

    for (const r of rows) {
      const ts = Math.floor(new Date(r.created_at).getTime() / bucketMs) * bucketMs;
      const prev = buckets.get(ts) || { lentas: 0, muitoLentas: 0, erros: 0 };
      if (r.severity === "slow") prev.lentas++;
      else if (r.severity === "very_slow") prev.muitoLentas++;
      else if (r.severity === "error") prev.erros++;
      buckets.set(ts, prev);
    }

    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ts, v]) => ({
        time: formatBucketTime(ts, timeFilter),
        lentas: v.lentas,
        muitoLentas: v.muitoLentas,
        erros: v.erros,
      }));
  }, [rows, timeFilter]);

  // 2. Duration avg/max AreaChart
  const durationData = useMemo(() => {
    if (rows.length === 0) return [];
    const bucketMs = getBucketMs(timeFilter);
    const buckets = new Map<number, { totalMs: number; maxMs: number; count: number }>();

    for (const r of rows) {
      const ts = Math.floor(new Date(r.created_at).getTime() / bucketMs) * bucketMs;
      const prev = buckets.get(ts) || { totalMs: 0, maxMs: 0, count: 0 };
      buckets.set(ts, {
        totalMs: prev.totalMs + r.duration_ms,
        maxMs: Math.max(prev.maxMs, r.duration_ms),
        count: prev.count + 1,
      });
    }

    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ts, v]) => ({
        time: formatBucketTime(ts, timeFilter),
        mediaMs: Math.round(v.totalMs / v.count),
        maxMs: v.maxMs,
      }));
  }, [rows, timeFilter]);

  // 3. Horizontal BarChart — Top 8 tabelas
  const tableData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = r.rpc_name || r.table_name || "unknown";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, alertas: value }));
  }, [rows]);

  if (rows.length === 0) return null;

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Stacked AreaChart — Alertas ao Longo do Tempo */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Alertas ao Longo do Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stackedData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="muitoLentas" stackId="1" fill="hsl(var(--destructive))" stroke="hsl(var(--destructive))" fillOpacity={0.6} name="Muito Lentas" />
              <Area type="monotone" dataKey="lentas" stackId="1" fill="hsl(45 93% 47%)" stroke="hsl(45 93% 47%)" fillOpacity={0.5} name="Lentas" />
              <Area type="monotone" dataKey="erros" stackId="1" fill="hsl(0 84% 60%)" stroke="hsl(0 84% 60%)" fillOpacity={0.5} name="Erros" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 2. Duration AreaChart — Média / Máxima */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Duração Média / Máxima
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={durationData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" unit="ms" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="maxMs" fill="hsl(var(--destructive))" stroke="hsl(var(--destructive))" fillOpacity={0.3} name="Máxima (ms)" />
              <Area type="monotone" dataKey="mediaMs" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.4} name="Média (ms)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 3. Horizontal BarChart — Por Tabela */}
      {tableData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Alertas por Tabela
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tableData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="alertas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Alertas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
