import { useOperatorRankings } from '@/features/production';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Star, TrendingUp, Package, Gauge, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

export function OperatorLeaderboard() {
  const [rankingType, setRankingType] = useState('weekly');
  const { rankings, isLoading } = useOperatorRankings(rankingType);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />;
      case 2: return <Medal className="h-6 w-6 text-slate-400" />;
      case 3: return <Medal className="h-6 w-6 text-warning" />;
      default: return <span className="font-bold text-lg text-muted-foreground">#{position}</span>;
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Leaderboard de Performance
            </CardTitle>
            <CardDescription>
              Ranking baseado em eficiência, qualidade e volume de produção
            </CardDescription>
          </div>
          <Tabs value={rankingType} onValueChange={setRankingType} className="w-fit">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="daily" className="text-xs py-1">Diário</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs py-1">Semanal</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs py-1">Mensal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {rankings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
            Dados insuficientes para gerar o ranking deste período.
          </div>
        ) : (
          <div className="space-y-3">
            {rankings.map((ranking, index) => (
              <div
                key={ranking.operatorId}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border border-border/50 transition-all animate-fade-in",
                  ranking.position === 1 ? "bg-primary/5 border-primary/20 shadow-glow-primary" : "bg-card/50",
                  "hover:scale-[1.01] hover:bg-accent/5"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="w-10 flex justify-center shrink-0">
                  {getPositionIcon(ranking.position)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold truncate">{ranking.operatorName}</p>
                    {ranking.position <= 3 && (
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                        Top Player
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold">
                      <Gauge className="h-3 w-3" />
                      {ranking.efficiencyRate}% Eficiência
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold">
                      <ShieldCheck className="h-3 w-3 text-success" />
                      {ranking.qualityRate}% Qualidade
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold">
                      <Package className="h-3 w-3" />
                      {ranking.totalProduced} Peças
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-black text-primary leading-none">{ranking.totalPoints}</p>
                  <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-tighter mt-1">Pontos Totais</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
