import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp as TrendingUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCronP95Daily } from "@/features/admin/hooks/useCronP95Daily";

const PERIODS = [30, 90, 365] as const;

/** Sparkline de barras do p95 diário (sem dependência de chart lib). */
function P95Sparkbars({ values }: { values: Array<number | null> }) {
  const slice = values.slice(-60);
  const max = Math.max(1, ...slice.map((v) => v ?? 0));
  return (
    <div className="flex h-10 items-end gap-[2px]" aria-hidden="true">
      {slice.map((v, i) => (
        <div
          key={i}
          className={cn(
            "w-full min-w-[2px] rounded-sm",
            v === null ? "bg-muted" : v >= max * 0.8 ? "bg-warning" : "bg-primary/60",
          )}
          style={{ height: `${Math.max(8, ((v ?? 0) / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Tendência de longo prazo (até 365 dias) do p95 de duração por rotina,
 * consolidada diariamente no banco. Complementa o histórico bruto de 90 dias.
 */
export function CronP95TrendCard() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(90);
  const { data, isLoading, error } = useCronP95Daily(days);
  const series = data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUpIcon className="h-4 w-4" /> Degradação de p95 (longo prazo)
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
            Não foi possível ler a tendência (acesso restrito a coordenadores e gestores).
          </p>
        )}

        {!isLoading && !error && series.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ainda não há consolidação diária. O agregado é atualizado a cada hora.
          </p>
        )}

        {series.map((s) => (
          <div key={s.jobid} className="rounded-md border p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium truncate">{s.jobname}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  p95 {s.latestP95Ms != null ? `${s.latestP95Ms}ms` : "—"}
                </Badge>
                {s.driftPct != null && (
                  <Badge
                    variant={s.driftPct >= 50 ? "destructive" : "outline"}
                    className={cn(s.driftPct <= -20 && "border-success/30 text-success")}
                  >
                    {s.driftPct > 0 ? "+" : ""}
                    {s.driftPct}% vs. mediana
                  </Badge>
                )}
                <Badge variant="outline">{s.points.length} dia(s)</Badge>
              </div>
            </div>
            <P95Sparkbars values={s.points.map((p) => p.p95Ms)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
