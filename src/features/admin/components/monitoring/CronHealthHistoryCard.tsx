import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity as ActivityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCronHealthHistory } from "@/features/admin/hooks/useCronHealthHistory";

const PERIODS = [7, 30, 90] as const;

/** Mini gráfico de barras (sem dependência de chart lib) para densidade de falhas. */
function Sparkbars({ values }: { values: number[] }) {
  const slice = values.slice(-48);
  const max = Math.max(1, ...slice);
  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden="true">
      {slice.map((v, i) => (
        <div
          key={i}
          className={cn(
            "w-full min-w-[2px] rounded-sm",
            v === 0 ? "bg-muted" : v >= 3 ? "bg-destructive" : "bg-warning",
          )}
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function CronHealthHistoryCard() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(7);
  const { data, isLoading, error } = useCronHealthHistory(days);
  const trends = data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ActivityIcon className="h-4 w-4" /> Tendência das rotinas automáticas
        </CardTitle>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={days === p ? "default" : "outline"}
              className="h-7 px-2 text-xs"
              onClick={() => setDays(p)}
            >
              {p}d
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-24 w-full" />}

        {error && (
          <p className="text-sm text-muted-foreground">
            Não foi possível ler o histórico (acesso restrito a coordenadores e gestores).
          </p>
        )}

        {!isLoading && !error && trends.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ainda não há coletas registradas neste período. A coleta ocorre a cada 15 minutos.
          </p>
        )}

        {trends.map((t) => (
          <div key={t.jobid} className="rounded-md border p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium truncate">{t.jobname}</p>
              <div className="flex flex-wrap items-center gap-2">
                {t.isStale && <Badge variant="destructive">silenciosa</Badge>}
                {t.expectedIntervalMinutes != null && (
                  <Badge variant="outline">a cada {t.expectedIntervalMinutes}min</Badge>
                )}
                {t.avgDurationMs != null && (
                  <Badge variant="outline">média ~{t.avgDurationMs}ms</Badge>
                )}
                {t.p95DurationMs != null && (
                  <Badge
                    variant="outline"
                    className={cn(
                      t.avgDurationMs != null && t.p95DurationMs > t.avgDurationMs * 3
                        ? "border-warning text-warning"
                        : undefined,
                    )}
                  >
                    p95 {t.p95DurationMs}ms
                  </Badge>
                )}
                {t.p95DegradationPct != null && t.p95DegradationPct >= 50 && (
                  <Badge variant="destructive">
                    p95 +{t.p95DegradationPct}% vs. base
                  </Badge>
                )}
                <Badge variant={t.failureRatePct > 0 ? "destructive" : "outline"}>
                  {t.failureRatePct.toFixed(0)}% amostras com falha
                </Badge>
              </div>
            </div>
            <Sparkbars values={t.points.map((p) => p.failures)} />
            <p className="text-xs text-muted-foreground">
              {t.points.length} coleta(s) · pior sequência: {t.worstFailures} falha(s)
              {t.maxDurationMs != null ? ` · pico ${t.maxDurationMs}ms` : ""}
              {t.p95BaselineMs != null && t.p95RecentMs != null
                ? ` · p95 24h ${t.p95RecentMs}ms vs. base ${t.p95BaselineMs}ms`
                : ""}
            </p>

          </div>
        ))}
      </CardContent>
    </Card>
  );
}
