/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertTriangle as AlertTriangleIcon,
  ShieldAlert as ShieldAlertIcon,
  ServerCrash as ServerCrashIcon,
  Gauge as GaugeIcon,
  UserX as UserXIcon,
  Settings as SettingsIcon,
  RefreshCw as RefreshCwIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useMonitoringData,
  loadThresholds,
  saveThresholds,
  DEFAULT_THRESHOLDS,
  type AlertThresholds,
  type MonitoringWindow,
} from "@/features/admin/hooks/useMonitoringData";
import { CronHealthCard } from "@/features/admin/components/monitoring/CronHealthCard";
import { CronHealthHistoryCard } from "@/features/admin/components/monitoring/CronHealthHistoryCard";
import { CronEmailPreferenceCard } from "@/features/admin/components/monitoring/CronEmailPreferenceCard";
import { CronP95TrendCard } from "@/features/admin/components/monitoring/CronP95TrendCard";

function StatCard({
  title,
  value,
  hint,
  breached,
  Icon,
}: {
  title: string;
  value: string | number;
  hint: string;
  breached: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className={breached ? "border-destructive/60" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${breached ? "text-destructive" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${breached ? "text-destructive" : ""}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function SystemMonitoringPage() {
  const [windowKey, setWindowKey] = useState<MonitoringWindow>("24h");
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);
  const [draft, setDraft] = useState<AlertThresholds>(DEFAULT_THRESHOLDS);
  const { data, isLoading, refetch, isFetching } = useMonitoringData(windowKey);

  useEffect(() => {
    const t = loadThresholds();
    setThresholds(t);
    setDraft(t);
  }, []);

  const windowHours = windowKey === "1h" ? 1 : windowKey === "24h" ? 24 : 168;

  const breaches = useMemo(() => {
    if (!data) return { rls: false, errors: false, slow: false, logins: false, avg: false };
    const perHour = (n: number) => n / windowHours;
    return {
      rls: perHour(data.totals.rls) > thresholds.rlsPerHour,
      errors: perHour(data.totals.apiErrors) > thresholds.errorsPerHour,
      slow: perHour(data.totals.slowQueries) > thresholds.slowPerHour,
      logins: perHour(data.totals.failedLogins) > thresholds.failedLoginsPerHour,
      avg: data.totals.avgQueryMs > thresholds.avgQueryMs,
    };
  }, [data, thresholds, windowHours]);

  const anyBreach = Object.values(breaches).some(Boolean);

  const handleSaveThresholds = () => {
    saveThresholds(draft);
    setThresholds(draft);
    toast.success("Limiares de alerta salvos");
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GaugeIcon className="h-7 w-7" /> Monitoramento do Sistema
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Falhas RLS, erros de API, performance de queries e tentativas de login.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={windowKey} onValueChange={(v) => setWindowKey(v as MonitoringWindow)}>
              <TabsList>
                <TabsTrigger value="1h">1h</TabsTrigger>
                <TabsTrigger value="24h">24h</TabsTrigger>
                <TabsTrigger value="7d">7d</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Atualizar">
              <RefreshCwIcon className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Configurar limiares">
                  <SettingsIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-3">
                <p className="font-medium text-sm">Limiares por hora</p>
                {(
                  [
                    ["rlsPerHour", "Falhas RLS/h"],
                    ["errorsPerHour", "Erros de API/h"],
                    ["slowPerHour", "Queries lentas/h"],
                    ["failedLoginsPerHour", "Logins falhos/h"],
                    ["avgQueryMs", "Duração média (ms)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) || 0 })}
                    />
                  </div>
                ))}
                <Button className="w-full" size="sm" onClick={handleSaveThresholds}>
                  Salvar limiares
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {anyBreach && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Alerta ativo</AlertTitle>
            <AlertDescription>
              Um ou mais indicadores excederam o limiar configurado na janela de {windowKey}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Falhas RLS"
            value={data?.totals.rls ?? "—"}
            hint={`limite ${thresholds.rlsPerHour}/h`}
            breached={breaches.rls}
            Icon={ShieldAlertIcon}
          />
          <StatCard
            title="Erros de API"
            value={data?.totals.apiErrors ?? "—"}
            hint={`limite ${thresholds.errorsPerHour}/h`}
            breached={breaches.errors}
            Icon={ServerCrashIcon}
          />
          <StatCard
            title="Queries lentas"
            value={data?.totals.slowQueries ?? "—"}
            hint={`limite ${thresholds.slowPerHour}/h`}
            breached={breaches.slow}
            Icon={GaugeIcon}
          />
          <StatCard
            title="Logins falhos"
            value={data?.totals.failedLogins ?? "—"}
            hint={`limite ${thresholds.failedLoginsPerHour}/h`}
            breached={breaches.logins}
            Icon={UserXIcon}
          />
          <StatCard
            title="Duração média"
            value={data ? `${data.totals.avgQueryMs} ms` : "—"}
            hint={`limite ${thresholds.avgQueryMs} ms`}
            breached={breaches.avg}
            Icon={GaugeIcon}
          />
        </div>

        <CronHealthCard />

        <CronHealthHistoryCard />
        <CronP95TrendCard />
        <CronEmailPreferenceCard />


        <Card>
          <CardHeader>
            <CardTitle>Timeline por hora</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {isLoading || !data ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Carregando…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeline}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" name="Erros API" dot={false} />
                  <Line type="monotone" dataKey="slow" stroke="hsl(var(--primary))" name="Queries lentas" dot={false} />
                  <Line type="monotone" dataKey="rls" stroke="hsl(var(--warning, 38 92% 50%))" name="Falhas RLS" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="rls">
          <TabsList>
            <TabsTrigger value="rls">Falhas RLS</TabsTrigger>
            <TabsTrigger value="errors">Erros API</TabsTrigger>
            <TabsTrigger value="slow">Queries lentas</TabsTrigger>
            <TabsTrigger value="logins">Logins falhos</TabsTrigger>
          </TabsList>

          <TabsContent value="rls">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card border-b">
                      <tr className="text-left">
                        <th className="p-3">Quando</th>
                        <th className="p-3">Evento</th>
                        <th className="p-3">Usuário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.rlsViolations ?? []).map((r) => (
                        <tr key={r.id} className="border-b hover:bg-muted/40">
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {format(new Date(r.created_at), "dd/MM HH:mm:ss")}
                          </td>
                          <td className="p-3">
                            <Badge variant="destructive">{r.event_type}</Badge>
                          </td>
                          <td className="p-3">{r.user_email ?? "—"}</td>
                        </tr>
                      ))}
                      {data && data.rlsViolations.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-muted-foreground">
                            Sem falhas RLS na janela selecionada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card border-b">
                      <tr className="text-left">
                        <th className="p-3">Quando</th>
                        <th className="p-3">Componente</th>
                        <th className="p-3">Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.apiErrors ?? []).map((r) => (
                        <tr key={r.id} className="border-b hover:bg-muted/40">
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {format(new Date(r.created_at), "dd/MM HH:mm:ss")}
                          </td>
                          <td className="p-3 whitespace-nowrap">{r.component_name ?? "—"}</td>
                          <td className="p-3 max-w-md truncate" title={r.message}>
                            {r.message}
                          </td>
                        </tr>
                      ))}
                      {data && data.apiErrors.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-muted-foreground">
                            Sem erros de API na janela selecionada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="slow">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card border-b">
                      <tr className="text-left">
                        <th className="p-3">Quando</th>
                        <th className="p-3">Operação</th>
                        <th className="p-3">Tabela</th>
                        <th className="p-3 text-right">Duração</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.slowQueries ?? []).map((r) => (
                        <tr key={r.id} className="border-b hover:bg-muted/40">
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {format(new Date(r.created_at), "dd/MM HH:mm:ss")}
                          </td>
                          <td className="p-3">{r.operation}</td>
                          <td className="p-3">{r.table_name ?? "—"}</td>
                          <td className="p-3 text-right font-mono">{r.duration_ms} ms</td>
                        </tr>
                      ))}
                      {data && data.slowQueries.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground">
                            Sem queries lentas na janela selecionada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logins">
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card border-b">
                      <tr className="text-left">
                        <th className="p-3">Quando</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">IP</th>
                        <th className="p-3">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.failedLogins ?? []).map((r) => (
                        <tr key={r.id} className="border-b hover:bg-muted/40">
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {format(new Date(r.created_at), "dd/MM HH:mm:ss")}
                          </td>
                          <td className="p-3">{r.user_email}</td>
                          <td className="p-3 font-mono text-xs">{r.ip_address ?? "—"}</td>
                          <td className="p-3">{r.failure_reason ?? "—"}</td>
                        </tr>
                      ))}
                      {data && data.failedLogins.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground">
                            Sem falhas de login na janela selecionada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
