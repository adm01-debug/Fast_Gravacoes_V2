import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardEntry {
  operator_name: string;
  tasks_completed: number;
  avg_time_minutes: number;
  quality_rate: number;
}

export function PackagingLeaderboard() {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['packaging-leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'get_packaging_leaderboard' as unknown as Parameters<typeof supabase.rpc>[0]
      );
      if (error) throw error;
      return data as unknown as LeaderboardEntry[];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Ranking de Performance - Embalagem
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaderboard?.map((entry, index) => (
            <div
              key={entry.operator_name}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 transition-all hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center font-bold">
                  {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                  {index === 1 && <Medal className="w-5 h-5 text-slate-400" />}
                  {index === 2 && <Medal className="w-5 h-5 text-amber-600" />}
                  {index > 2 && index + 1}
                </div>
                <div>
                  <p className="font-medium">{entry.operator_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.tasks_completed} tarefas concluídas
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{entry.quality_rate}% Qualidade</p>
                <p className="text-xs text-muted-foreground">{entry.avg_time_minutes} min/tarefa</p>
              </div>
            </div>
          ))}
          {(!leaderboard || leaderboard.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Nenhum dado disponível hoje.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
