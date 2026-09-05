import { useGamification, OperatorRanking } from '@/hooks/useGamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Crown, TrendingUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function LeaderboardWidget() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const { rankings, isLoading } = useGamification(period);

  const topRankings = rankings.slice(0, 5);

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2: return <Medal className="h-4 w-4 text-slate-300" />;
      case 3: return <Medal className="h-4 w-4 text-warning" />;
      default: return <Star className="h-4 w-4 text-muted-foreground/30" />;
    }
  };

  const getPeriodLabel = (p: string) => {
    switch (p) {
      case 'daily': return 'Hoje';
      case 'weekly': return 'Semana';
      case 'monthly': return 'Mês';
      default: return '';
    }
  };

  return (
    <Card className="glass-card card-interactive animate-fade-in-up opacity-0 [animation-fill-mode:forwards] [animation-delay:0.4s]">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm text-title flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-yellow-500/20">
              <Trophy className="h-3.5 w-3.5 text-yellow-400" />
            </div>
            <span className="gradient-text">Ranking de Operadores</span>
          </div>
          <div className="flex gap-1">
            {(['daily', 'weekly', 'monthly'] as const).map(p => (
              <Button
                key={p}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-5 text-[9px] px-1.5 font-bold uppercase",
                  period === p ? "bg-primary/20 text-primary" : "text-muted-foreground"
                )}
                onClick={() => setPeriod(p)}
              >
                {getPeriodLabel(p)}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : topRankings.length > 0 ? (
          <div className="space-y-1">
            {topRankings.map((rank: OperatorRanking) => (
              <div
                key={rank.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border border-transparent transition-all",
                  rank.position === 1 ? "bg-yellow-500/5 border-yellow-500/10" : "hover:bg-secondary/20"
                )}
              >
                <div className="flex items-center justify-center w-6 h-6 shrink-0">
                  {getMedalIcon(rank.position)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-[11px] font-bold truncate",
                      rank.position === 1 ? "text-yellow-500" : ""
                    )}>
                      {rank.profile?.full_name?.split(' ')[0] || 'Operador'}
                    </p>
                    <div className="flex items-center gap-1 text-primary">
                      <TrendingUp className="h-2.5 w-2.5" />
                      <p className="text-[10px] font-mono font-bold">{rank.total_points}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-muted-foreground uppercase font-medium">OEE</span>
                      <span className="text-[9px] font-bold">{(rank.efficiency_rate || 0).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] text-muted-foreground uppercase font-medium">Qual.</span>
                      <span className="text-[9px] font-bold">{(rank.quality_rate || 0).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center opacity-50">
            <Trophy className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-[10px] text-muted-foreground">Dados insuficientes para este período</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
