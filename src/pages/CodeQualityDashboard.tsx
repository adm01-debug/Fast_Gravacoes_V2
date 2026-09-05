import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestTube2, FileCode, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Layers, GitBranch, BarChart3, PieChart, Timer, Package, Zap, Server, Gauge, ShieldCheck } from 'lucide-react';
import { useCodeQualityMetrics } from '@/features/admin';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from '@/lib/recharts';
import { CodeQualityTestsTab } from '@/components/design-system/sections/code-quality/CodeQualityTestsTab';
import { CodeQualityPerformanceTab } from '@/components/design-system/sections/code-quality/CodeQualityPerformanceTab';

const COLORS = {
  unit: 'hsl(var(--success))', integration: 'hsl(var(--primary))', e2e: 'hsl(var(--warning))',
  low: 'hsl(var(--success))', medium: 'hsl(var(--warning))', high: 'hsl(var(--destructive))',
};

export default function CodeQualityDashboard() {
  const metrics = useCodeQualityMetrics();

  const testDistributionData = [
    { name: 'Unitários', value: metrics.testsByCategory.unit, color: COLORS.unit },
    { name: 'Integração', value: metrics.testsByCategory.integration, color: COLORS.integration },
    { name: 'E2E', value: metrics.testsByCategory.e2e, color: COLORS.e2e },
  ];

  const complexityData = [
    { name: 'Baixa', value: metrics.complexityDistribution.low, color: COLORS.low },
    { name: 'Média', value: metrics.complexityDistribution.medium, color: COLORS.medium },
    { name: 'Alta', value: metrics.complexityDistribution.high, color: COLORS.high },
  ];

  const coverageData = [
    { name: 'Hooks', covered: metrics.hooksCovered, total: metrics.hooksTotal },
    { name: 'Componentes', covered: metrics.componentsWithTests, total: metrics.componentsWithTests + metrics.componentsWithoutTests },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <Breadcrumbs />
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl text-title font-bold text-foreground">Qualidade de Código</h1><p className="text-muted-foreground mt-1">Métricas de testes, cobertura e complexidade</p></div>
          <Badge variant="outline" className="text-sm"><GitBranch className="h-3 w-3 mr-1" />main</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de Testes', value: metrics.totalTests, icon: TestTube2, color: 'primary', extra: <div className="mt-4 flex items-center gap-2 text-xs"><Badge variant="secondary" className="bg-success/10 text-success">{metrics.testsByCategory.unit} unit</Badge><Badge variant="secondary" className="bg-primary/10 text-primary">{metrics.testsByCategory.integration} int</Badge><Badge variant="secondary" className="bg-warning/10 text-warning">{metrics.testsByCategory.e2e} e2e</Badge></div> },
            { label: 'Cobertura Estimada', value: `${metrics.coverageEstimate}%`, icon: TrendingUp, color: 'success', extra: <Progress value={metrics.coverageEstimate} className="mt-4 h-2" /> },
            { label: 'Arquivos de Teste', value: metrics.testFiles.length, icon: FileCode, color: 'primary', extra: <p className="text-xs text-muted-foreground mt-4">Distribuídos em unit, integration e e2e</p> },
            { label: 'Hooks Testados', value: `${metrics.hooksCovered}/${metrics.hooksTotal}`, icon: Layers, color: 'warning', extra: <Progress value={(metrics.hooksCovered / metrics.hooksTotal) * 100} className="mt-4 h-2" /> },
          ].map(({ label, value, icon: Icon, color, extra }) => (
            <Card key={label} variant="glass"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-bold text-foreground">{value}</p></div><div className={`h-12 w-12 rounded-full bg-${color}/10 flex items-center justify-center`}><Icon className={`h-6 w-6 text-${color}`} /></div></div>{extra}</CardContent></Card>
          ))}
        </div>

        <Tabs defaultValue="tests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tests" className="gap-2"><TestTube2 className="h-4 w-4" />Testes</TabsTrigger>
            <TabsTrigger value="coverage" className="gap-2"><BarChart3 className="h-4 w-4" />Cobertura</TabsTrigger>
            <TabsTrigger value="complexity" className="gap-2"><PieChart className="h-4 w-4" />Complexidade</TabsTrigger>
            <TabsTrigger value="build" className="gap-2"><Timer className="h-4 w-4" />Build</TabsTrigger>
            <TabsTrigger value="performance" className="gap-2"><Zap className="h-4 w-4" />Performance</TabsTrigger>
            <TabsTrigger value="excellence" className="gap-2"><Gauge className="h-4 w-4" />Meta 10/10</TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="space-y-4">
            <CodeQualityTestsTab testDistributionData={testDistributionData} testFiles={metrics.testFiles} />
          </TabsContent>

          <TabsContent value="coverage" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card variant="elevated"><CardHeader><CardTitle className="text-lg">Cobertura por Categoria</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={coverageData}><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="covered" name="Testados" fill="hsl(var(--success))" /><Bar dataKey="total" name="Total" fill="hsl(var(--muted))" /></BarChart></ResponsiveContainer></div></CardContent></Card>
              <Card variant="elevated"><CardHeader><CardTitle className="text-lg">Detalhes de Cobertura</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-3"><div className="flex items-center justify-between"><span className="text-sm">Componentes UI</span><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-sm">{metrics.componentsWithTests} testados</span></div></div><div className="flex items-center justify-between"><span className="text-sm">Sem teste</span><div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /><span className="text-sm">{metrics.componentsWithoutTests} pendentes</span></div></div><div className="flex items-center justify-between"><span className="text-sm">Hooks</span><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-sm">{metrics.hooksCovered}/{metrics.hooksTotal} ({Math.round((metrics.hooksCovered / metrics.hooksTotal) * 100)}%)</span></div></div></div></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="complexity" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card variant="elevated"><CardHeader><CardTitle className="text-lg">Distribuição de Complexidade</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><RechartsPie><Pie data={complexityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{complexityData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip /></RechartsPie></ResponsiveContainer></div></CardContent></Card>
              <Card variant="elevated"><CardHeader><CardTitle className="text-lg">Alta Complexidade</CardTitle><CardDescription>Candidatos a refatoração</CardDescription></CardHeader><CardContent><div className="space-y-2">{[{ name: 'TechnicalAssistant', lines: '~280', severity: 'Alta' }, { name: 'Index (Dashboard)', lines: '~250', severity: 'Alta' }, { name: 'JobDetailsModal', lines: '~220', severity: 'Alta' }, { name: 'DailyCalendar', lines: '~200', severity: 'Média' }].map(c => (<div key={c.name} className={`flex items-center justify-between p-3 rounded-lg ${c.severity === 'Alta' ? 'bg-destructive/10 border border-destructive/20' : 'bg-warning/10 border border-warning/20'}`}><div><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.lines} linhas</p></div><Badge variant={c.severity === 'Alta' ? 'destructive' : 'warning'}>{c.severity}</Badge></div>))}</div></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="build" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Tempo de Build', value: `${metrics.buildMetrics.estimatedBuildTime}s`, icon: Timer, color: 'primary', sub: 'Estimativa Vite production' },
                { label: 'Tamanho do Bundle', value: `${(metrics.buildMetrics.bundleSizeEstimate / 1024).toFixed(1)} MB`, icon: Package, color: 'warning', sub: 'Comprimido (gzip)' },
                { label: 'Páginas Lazy', value: `${metrics.buildMetrics.lazyLoadedPages}/${metrics.buildMetrics.totalPages}`, icon: Layers, color: 'success', sub: undefined },
                { label: 'Edge Functions', value: metrics.buildMetrics.edgeFunctions.toString(), icon: Server, color: 'primary', sub: 'Supabase Edge' },
              ].map(({ label, value, icon: Icon, color, sub }) => (
                <Card key={label} variant="glass"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold text-foreground">{value}</p></div><div className={`h-10 w-10 rounded-full bg-${color}/10 flex items-center justify-center`}><Icon className={`h-5 w-5 text-${color}`} /></div></div>{label === 'Páginas Lazy' && <Progress value={(metrics.buildMetrics.lazyLoadedPages / metrics.buildMetrics.totalPages) * 100} className="mt-2 h-2" />}{sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}</CardContent></Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card variant="elevated"><CardHeader><CardTitle className="text-lg">Dependências</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="flex items-center justify-between"><span className="text-sm">Produção</span><Badge variant="secondary">{metrics.buildMetrics.dependencies}</Badge></div><div className="flex items-center justify-between"><span className="text-sm">Desenvolvimento</span><Badge variant="outline">{metrics.buildMetrics.devDependencies}</Badge></div><div className="pt-4 border-t"><h4 className="text-sm font-medium mb-2">Principais</h4><div className="flex flex-wrap gap-2">{['React 18', 'Vite 5', 'TanStack Query', 'Tailwind CSS', 'Supabase', 'Recharts', 'Framer Motion'].map(d => (<Badge key={d} variant="secondary" className="bg-primary/10 text-primary">{d}</Badge>))}</div></div></div></CardContent></Card>
              <Card variant="elevated"><CardHeader><CardTitle className="text-lg">Otimizações de Build</CardTitle></CardHeader><CardContent><div className="space-y-3">{['Code Splitting', 'Tree Shaking', 'Lazy Loading', 'Minification', 'Gzip Compression'].map(opt => (<div key={opt} className="flex items-center justify-between p-2 rounded-lg bg-success/10"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-sm">{opt}</span></div><Badge variant="secondary" className="bg-success/10 text-success">Ativo</Badge></div>))}</div></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <CodeQualityPerformanceTab performanceMetrics={metrics.performanceMetrics} />
          </TabsContent>

          <TabsContent value="excellence" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-success" />
                    Segurança de Tipos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Type-Safety Score</span>
                      <span className="text-xl font-bold">{metrics.excellence.typeSafetyScore}%</span>
                    </div>
                    <Progress value={metrics.excellence.typeSafetyScore} className="h-2 bg-success/20 [&>div]:bg-success" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Usos de 'any' remanescentes</span>
                      <Badge variant="outline" className={metrics.excellence.anyUsageCount > 0 ? "text-warning border-warning/50" : "text-success border-success/50"}>
                        {metrics.excellence.anyUsageCount}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Validação em Runtime
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cobertura de Validação</span>
                      <span className="text-xl font-bold">{metrics.excellence.runtimeValidationCoverage}%</span>
                    </div>
                    <Progress value={metrics.excellence.runtimeValidationCoverage} className="h-2 bg-primary/20 [&>div]:bg-primary" />
                    <p className="text-xs text-muted-foreground">
                      Módulos de BI e Manutenção protegidos por schemas/guards.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    Status do Build & CI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Build Status</span>
                      <Badge className={metrics.excellence.buildStatus === 'passing' ? "bg-success" : "bg-destructive"}>
                        {metrics.excellence.buildStatus.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Erros Críticos</span>
                      <span className="font-bold text-success">{metrics.excellence.criticalErrorCount}</span>
                    </div>
                    <div className="pt-2 border-t flex items-center gap-2 text-xs text-muted-foreground">
                      <GitBranch className="h-3 w-3" />
                      <span>Pipeline E2E Playwright ativo</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="text-lg">Roteiro para Perfeição (10/10)</CardTitle>
                <CardDescription>Ações concluídas e próximos passos técnicos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { task: "Deep Fuzzing & Stress Engine", status: "concluido", desc: "Motor de simulação massiva com mutação aleatória de payloads." },
                    { task: "Suíte de Testes Unitários Expandida", status: "concluido", desc: "Cobertura de testes para Notificações, Jobs e Inventário." },
                    { task: "Pipeline E2E Completo (Admin/Stress)", status: "concluido", desc: "Testes automatizados cobrindo Telemetria, Configurações e Simulação." },
                    { task: "Validação em runtime (Schema)", status: "concluido", desc: "Zod validation em queries de Jobs e mutações de TPM." },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      {item.status === 'concluido' ? <CheckCircle2 className="h-5 w-5 text-success mt-0.5" /> : <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />}
                      <div>
                        <p className="text-sm font-bold">{item.task}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Badge variant={item.status === 'concluido' ? 'secondary' : 'outline'} className="ml-auto text-[10px]">
                        {item.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
