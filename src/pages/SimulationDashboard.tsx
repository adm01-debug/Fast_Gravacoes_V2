import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Play, RotateCcw, AlertTriangle, CheckCircle2, Activity, ShieldCheck, Zap } from 'lucide-react';
import { runMassiveSimulation as runSimulation, SimulationResult, generateScenarios } from '@/lib/simulation';
const SCENARIOS = generateScenarios();
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell 
} from '@/lib/recharts';

export default function SimulationDashboard() {
  const [isRunning, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalScenarios, setTotalScenarios] = useState(1000);
  const [results, setResults] = useState<SimulationResult[]>([]);

  const handleStart = async () => {
    setIsLoading(true);
    setProgress(0);
    setResults([]);
    
    const res = await runSimulation(totalScenarios, 10, (current) => {
      setProgress(Math.round((current / totalScenarios) * 100));
    });
    
    setResults(res);
    setIsLoading(false);
  };

  const stats = {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    avgLatency: results.length > 0 ? results.reduce((acc, r) => acc + r.latency, 0) / results.length : 0,
    p95Latency: results.length > 0 ? results.sort((a, b) => a.latency - b.latency)[Math.floor(results.length * 0.95)]?.latency : 0,
    maxLatency: results.length > 0 ? Math.max(...results.map(r => r.latency)) : 0,
    failureRate: results.length > 0 ? (results.filter(r => r.status === 'fail').length / results.length) * 100 : 0
  };

  const chartData = results.length > 0 ? SCENARIOS.map(s => ({
    name: s.name,
    passed: results.filter(r => r.scenarioId === s.id && r.status === 'pass').length,
    failed: results.filter(r => r.scenarioId === s.id && r.status === 'fail').length
  })) : [];

  const pieData = [
    { name: 'Passou', value: stats.passed, color: 'hsl(var(--success))' },
    { name: 'Falhou', value: stats.failed, color: 'hsl(var(--destructive))' }
  ];

  return (
    <MainLayout>
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-title font-bold">Simulador de Stress & Webhooks</h1>
            <p className="text-muted-foreground">Validação massiva de cenários de Edge Functions e Webhooks</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
              <span className="text-sm font-medium">Quantidade:</span>
              <input 
                type="number" 
                value={totalScenarios} 
                onChange={(e) => setTotalScenarios(parseInt(e.target.value, 10))}
                className="w-16 bg-transparent text-sm focus:outline-none"
                disabled={isRunning}
              />
            </div>
            <Button onClick={handleStart} disabled={isRunning} className="gap-2">
              {isRunning ? <Activity className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? 'Simulando...' : 'Iniciar Simulação'}
            </Button>
            <Button variant="outline" onClick={() => setResults([])} disabled={isRunning}>
              <RotateCcw className="h-4 w-4 mr-2" /> Limpar
            </Button>
          </div>
        </div>

        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Executando cenários...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Cenários Totais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">{SCENARIOS.length} variantes</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Taxa de Sucesso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  {((stats.passed / stats.total) * 100).toFixed(1)}%
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-xs">{stats.passed} ok / {stats.failed} falhas</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Latência P95</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold",
                  stats.p95Latency > 2000 ? "text-primary" : "text-primary"
                )}>
                  {stats.p95Latency.toFixed(0)}ms
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Zap className="h-4 w-4 text-warning" />
                  <span className="text-xs">Velocidade de resposta</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Taxa de Falhas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold",
                  stats.failureRate > 5 ? "text-primary" : "text-success"
                )}>
                  {stats.failureRate.toFixed(1)}%
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-xs text-muted-foreground">Erros HTTP/Timeout</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {results.length > 0 && (
            <>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Resultados por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" hide />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="passed" name="Sucesso" stackId="a" fill="hsl(var(--success))" />
                        <Bar dataKey="failed" name="Falha" stackId="a" fill="hsl(var(--destructive))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Distribuição Geral</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="h-[300px] w-full max-w-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Log Detalhado (Últimos 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.slice(0, 10).map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50 text-sm">
                  <div className="flex items-center gap-3">
                    {r.status === 'pass' ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                    <span className="font-mono text-xs">{r.scenarioId}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{r.latency.toFixed(0)}ms</span>
                    <Badge variant={r.status === 'pass' ? 'secondary' : 'destructive'} className="text-[10px]">
                      {r.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
              {results.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma simulação executada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
