import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ElementType } from 'react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon | ElementType;
  trend: 'up' | 'down';
  trendValue: number;
  color: string;
  bgColor: string;
}

export function ExecutiveKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color,
  bgColor
}: KPICardProps) {
  return (
    <Card className="glass-card hover:shadow-glow-primary transition-all duration-300 group">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl transition-colors", bgColor)}>
            <Icon className={cn("h-6 w-6", color)} />
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
            trend === 'up' ? "bg-success/10 text-success" : "bg-rose-500/10 text-rose-500"
          )}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trendValue).toFixed(1)}%
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black tracking-tighter group-hover:scale-105 transition-transform origin-left">
            {value}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{title}</p>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium italic">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExecutiveKPICardsGrid({ kpiCards }: { kpiCards: KPICardProps[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpiCards.map((kpi, i) => (
        <ExecutiveKPICard key={i} {...kpi} />
      ))}
    </div>
  );
}
