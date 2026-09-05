import { PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from "@/lib/recharts";
import { Eye, Play, Pause, CheckCircle2, RotateCcw } from "lucide-react";

const actionConfig: Record<string, { label: string; icon: typeof Play }> = {
  view: { label: "Visualizou", icon: Eye },
  start: { label: "Iniciou", icon: Play },
  pause: { label: "Pausou", icon: Pause },
  resume: { label: "Retomou", icon: RotateCcw },
  finish: { label: "Finalizou", icon: CheckCircle2 },
};

interface ActionDistribution {
  action: string;
  label: string;
  count: number;
  fill: string;
  percentage: string;
}

interface DailyEvolution {
  date: string;
  fullDate: string;
  scans: number;
}

interface ScanHistoryChartsProps {
  actionDistribution: ActionDistribution[];
  dailyEvolution: DailyEvolution[];
}

export function ScanHistoryCharts({ actionDistribution, dailyEvolution }: ScanHistoryChartsProps) {
  return (
    <>
      {actionDistribution.length > 0 && (
        <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <PieChartIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Distribuição de Ações</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-[100px] w-[100px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={actionDistribution} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={40} innerRadius={20}>
                    {actionDistribution.map((entry, index) => (<Cell key={index} fill={entry.fill} />))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [`${value} scans`, name]}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {actionDistribution.map((item) => {
                const Icon = actionConfig[item.action]?.icon || Eye;
                return (
                  <div key={item.action} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                    <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate">{item.label}</span>
                    <span className="font-medium text-foreground ml-auto">{item.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {dailyEvolution.some(d => d.scans > 0) && (
        <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-foreground">Evolução Diária (últimos 7 dias)</span>
          </div>
          <div className="h-[120px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyEvolution}>
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} width={25} allowDecimals={false} />
                <RechartsTooltip
                  formatter={(value: number) => [`${value} scans`, 'Scans']}
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="scans" fill="hsl(187, 85%, 53%)" radius={[4, 4, 0, 0]} name="Scans" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
