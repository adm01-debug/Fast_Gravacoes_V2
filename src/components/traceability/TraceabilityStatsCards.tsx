import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Layers, CheckCircle, AlertTriangle, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { ProductionLot } from '@/features/inventory';

interface TraceabilityStatsCardsProps {
  lots: ProductionLot[];
}

export function TraceabilityStatsCards({ lots }: TraceabilityStatsCardsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const total = lots.length;
    const active = lots.filter(l => l.status === 'active').length;
    const quarantine = lots.filter(l => l.status === 'quarantine').length;
    const blocked = lots.filter(l => l.status === 'blocked').length;

    // Expiration alerts
    const expiringIn7Days = lots.filter(l => {
      if (!l.expiration_date || l.status !== 'active') return false;
      const daysLeft = differenceInDays(parseDateOnly(l.expiration_date) ?? now, now);
      return daysLeft >= 0 && daysLeft <= 7;
    }).length;

    const expired = lots.filter(l => {
      if (!l.expiration_date) return false;
      return differenceInDays(parseDateOnly(l.expiration_date) ?? now, now) < 0;
    }).length;

    // Trends (last 30 days vs previous 30)
    const last30 = lots.filter(l => differenceInDays(now, new Date(l.created_at)) <= 30).length;
    const prev30 = lots.filter(l => {
      const days = differenceInDays(now, new Date(l.created_at));
      return days > 30 && days <= 60;
    }).length;
    const trend = prev30 > 0 ? ((last30 - prev30) / prev30 * 100) : 0;

    return { total, active, quarantine, blocked, expiringIn7Days, expired, trend, last30 };
  }, [lots]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard
        icon={Layers}
        iconClass="text-primary"
        bgClass="bg-primary/10"
        label="Total de Lotes"
        value={stats.total}
        trend={stats.trend}
        trendLabel={`${stats.last30} nos últimos 30d`}
      />
      <StatCard
        icon={CheckCircle}
        iconClass="text-success"
        bgClass="bg-success/10"
        label="Lotes Ativos"
        value={stats.active}
      />
      <StatCard
        icon={AlertTriangle}
        iconClass="text-yellow-500"
        bgClass="bg-yellow-500/10"
        label="Em Quarentena"
        value={stats.quarantine}
        alert={stats.quarantine > 0}
      />
      <StatCard
        icon={XCircle}
        iconClass="text-destructive"
        bgClass="bg-destructive/10"
        label="Bloqueados"
        value={stats.blocked}
        alert={stats.blocked > 0}
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className={stats.expiringIn7Days > 0 ? 'border-orange-500/50 animate-pulse' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Clock className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expirando</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{stats.expiringIn7Days}</p>
                      {stats.expired > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                          +{stats.expired} expirados
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>Lotes que expiram nos próximos 7 dias</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function StatCard({ icon: Icon, iconClass, bgClass, label, value, trend, trendLabel, alert }: {
  icon: React.ElementType;
  iconClass: string;
  bgClass: string;
  label: string;
  value: number;
  trend?: number;
  trendLabel?: string;
  alert?: boolean;
}) {
  return (
    <Card className={alert ? 'border-destructive/30' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bgClass}`}>
            <Icon className={`h-5 w-5 ${iconClass}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend !== undefined && trend !== 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className={`text-[10px] gap-0.5 ${trend > 0 ? 'text-success' : 'text-destructive'}`}>
                        {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(trend).toFixed(0)}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{trendLabel}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
