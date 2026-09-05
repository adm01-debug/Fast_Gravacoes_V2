import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { EfficiencyAlertHistory } from "@/features/analytics/hooks/useEfficiencyAlertHistory";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis } from "@/lib/recharts";

const chartConfig = {
  bottleneck: { label: "Gargalo", color: "hsl(var(--chart-1))" },
  load_balancing: { label: "Balanceamento", color: "hsl(var(--chart-2))" },
  total: { label: "Total", color: "hsl(var(--chart-3))" },
};

export function EfficiencyAlertTrendChart({ alerts }: { alerts: EfficiencyAlertHistory[] }) {
  const trendData = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({ start: subDays(today, 13), end: today });
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dayAlerts = alerts.filter(alert => { const d = new Date(alert.detected_at); return d >= dayStart && d <= dayEnd; });
      const bottleneckCount = dayAlerts.filter(a => a.alert_type === 'bottleneck').length;
      const loadBalancingCount = dayAlerts.filter(a => a.alert_type === 'load_balancing').length;
      return { date: format(day, 'dd/MM', { locale: ptBR }), bottleneck: bottleneckCount, load_balancing: loadBalancingCount, total: bottleneckCount + loadBalancingCount };
    });
  }, [alerts]);

  if (!trendData.some(d => d.total > 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
        <TrendingUp className="h-12 w-12 mb-3" /><p>Sem dados de tendência</p><p className="text-sm">Alertas aparecerão aqui quando forem detectados</p>
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fillBottleneck" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} /><stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} /></linearGradient>
            <linearGradient id="fillLoadBalancing" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} /><stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} /></linearGradient>
          </defs>
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area type="monotone" dataKey="bottleneck" stackId="1" stroke="hsl(var(--chart-1))" fill="url(#fillBottleneck)" name="Gargalo" />
          <Area type="monotone" dataKey="load_balancing" stackId="1" stroke="hsl(var(--chart-2))" fill="url(#fillLoadBalancing)" name="Balanceamento" />
        </AreaChart>
      </ChartContainer>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-1))' }} /><span className="text-xs text-muted-foreground">Gargalo</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} /><span className="text-xs text-muted-foreground">Balanceamento</span></div>
      </div>
    </div>
  );
}
