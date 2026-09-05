import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from '@/lib/recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface EnergyChartTabsProps {
  stats: {
    dailyConsumption: Array<{ date: string; consumption: number; cost: number }>;
    consumptionByMachine: Array<{ machineId: string; machineName: string; consumption: number; cost: number }>;
    hourlyPattern: Array<{ hour: number; avgConsumption: number }>;
  };
  alerts: Array<{
    id: string; message: string; severity: string; created_at: string;
    machine?: { name: string };
  }>;
  onResolveAlert: (id: string) => void;
  isResolving: boolean;
}

export function EnergyChartTabs({ stats, alerts, onResolveAlert, isResolving }: EnergyChartTabsProps) {
  return (
    <Tabs defaultValue="consumption" className="space-y-4">
      <TabsList>
        <TabsTrigger value="consumption">Consumo Diário</TabsTrigger>
        <TabsTrigger value="machines">Por Máquina</TabsTrigger>
        <TabsTrigger value="pattern">Padrão Horário</TabsTrigger>
        <TabsTrigger value="alerts">Alertas ({alerts.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="consumption">
        <Card className="glass-card">
          <CardHeader><CardTitle>Consumo e Custo Diário</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={stats.dailyConsumption}>
                <defs>
                  <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'dd/MM')} className="text-xs fill-muted-foreground" />
                <YAxis yAxisId="left" className="text-xs fill-muted-foreground" />
                <YAxis yAxisId="right" orientation="right" className="text-xs fill-muted-foreground" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [name === 'consumption' ? `${value.toFixed(1)} kWh` : `R$ ${value.toFixed(2)}`, name === 'consumption' ? 'Consumo' : 'Custo']}
                  labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy')}
                />
                <Area yAxisId="left" type="monotone" dataKey="consumption" stroke="hsl(var(--primary))" fill="url(#colorConsumption)" strokeWidth={2} />
                <Area yAxisId="right" type="monotone" dataKey="cost" stroke="hsl(var(--accent))" fill="url(#colorCost)" strokeWidth={2} />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="machines">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader><CardTitle>Consumo por Máquina</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={stats.consumptionByMachine.slice(0, 5)} dataKey="consumption" nameKey="machineName" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                    {stats.consumptionByMachine.slice(0, 5).map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)} kWh`, 'Consumo']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader><CardTitle>Ranking de Consumo</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.consumptionByMachine.slice(0, 8).map((machine, index) => (
                  <div key={machine.machineId} className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-muted-foreground">{index + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">{machine.machineName}</span>
                        <span className="text-sm text-muted-foreground">{machine.consumption.toFixed(0)} kWh</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(machine.consumption / (stats.consumptionByMachine[0]?.consumption || 1)) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right">R$ {machine.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="pattern">
        <Card className="glass-card">
          <CardHeader><CardTitle>Padrão de Consumo por Hora</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stats.hourlyPattern}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="hour" tickFormatter={(v) => `${v}h`} className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(2)} kWh`, 'Média de Consumo']} labelFormatter={(label) => `${label}:00h`} />
                <Bar dataKey="avgConsumption" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground text-center mt-4">Identifique os horários de pico para otimizar o uso de energia</p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="alerts">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" />Alertas de Energia</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success opacity-50" />
                <p>Nenhum alerta ativo</p>
                <p className="text-sm">O consumo de energia está dentro dos parâmetros normais</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${alert.severity === 'critical' ? 'bg-destructive/10' : alert.severity === 'warning' ? 'bg-warning/10' : 'bg-blue-500/10'}`}>
                        <AlertTriangle className={`h-5 w-5 ${alert.severity === 'critical' ? 'text-destructive' : alert.severity === 'warning' ? 'text-warning' : 'text-blue-500'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">{alert.machine?.name} • {format(new Date(alert.created_at), 'dd/MM HH:mm')}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onResolveAlert(alert.id)} disabled={isResolving}>Resolver</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
