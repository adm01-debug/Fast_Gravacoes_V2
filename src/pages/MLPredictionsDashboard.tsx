import { Helmet } from 'react-helmet-async';
import { Brain, RefreshCw, AlertTriangle, Shield, TrendingUp, Zap, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useMLPredictions } from '@/features/analytics/hooks/useMLPredictions';
import { useMLPredictionNotifications } from '@/features/notifications';
import { MLPredictionCard } from '@/components/ml/MLPredictionCard';
import { MLRiskDistributionChart } from '@/components/ml/MLRiskDistributionChart';
import { MLNotificationSettings } from '@/components/ml/MLNotificationSettings';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

export default function MLPredictionsDashboard() {
  const {
    predictions,
    stats,
    isLoading,
    generatePredictions,
    acknowledgePrediction,
    getRiskLevel,
    getPredictionTypeLabel,
  } = useMLPredictions();

  // Initialize ML prediction notifications listener
  useMLPredictionNotifications();

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const highRiskPredictions = predictions.filter(p => Number(p.risk_score) >= 60);
  const mediumRiskPredictions = predictions.filter(p => Number(p.risk_score) >= 40 && Number(p.risk_score) < 60);
  const lowRiskPredictions = predictions.filter(p => Number(p.risk_score) < 40);

  return (
    <>
      <Helmet>
        <title>FAST GRAVAÇÕES | ML Preditivo</title>
      </Helmet>

      <div className="space-y-6">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-title font-black tracking-tighter flex items-center gap-3 uppercase">
              <Brain className="h-8 w-8 text-primary" />
              FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO
            </h1>
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-70">
              QUALIDADE + VELOCIDADE
            </p>
          </div>
          <div className="flex gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <MLNotificationSettings />
              </SheetContent>
            </Sheet>
            <Button
              onClick={() => generatePredictions.mutate(undefined)}
              disabled={generatePredictions.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${generatePredictions.isPending ? 'animate-spin' : ''}`} />
              {generatePredictions.isPending ? 'Analisando...' : 'Gerar Previsões'}
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="card-glass hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Previsões</p>
                  <p className="text-2xl font-bold text-title">{stats.totalPredictions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glass hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-500/10">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alto Risco</p>
                  <p className="text-2xl font-bold text-title text-red-500">{stats.highRisk}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glass hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <TrendingUp className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Risco Médio</p>
                  <p className="text-2xl font-bold text-title text-warning">{stats.mediumRisk}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glass hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <Shield className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Risco Baixo</p>
                  <p className="text-2xl font-bold text-title text-success">{stats.lowRisk}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glass hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Zap className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confiança Média</p>
                  <p className="text-2xl font-bold text-title text-purple-500">{stats.avgConfidence}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">
              Todas
              <Badge variant="secondary" className="ml-2">{predictions.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="high" className="text-red-500">
              Alto Risco
              {stats.highRisk > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.highRisk}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="medium">
              Médio Risco
              <Badge variant="secondary" className="ml-2">{stats.mediumRisk}</Badge>
            </TabsTrigger>
            <TabsTrigger value="low">
              Baixo Risco
              <Badge variant="secondary" className="ml-2">{stats.lowRisk}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TabsContent value="all" className="mt-0">
                {predictions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {predictions.map((prediction) => (
                      <MLPredictionCard
                        key={prediction.id}
                        prediction={prediction}
                        onAcknowledge={(id) => acknowledgePrediction.mutate(id)}
                        getRiskLevel={getRiskLevel}
                        getPredictionTypeLabel={getPredictionTypeLabel}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="card-glass">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Brain className="h-16 w-16 text-muted-foreground/20 mb-4" />
                      <p className="text-lg font-medium">Nenhuma previsão disponível</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Clique em "Gerar Previsões" para analisar as máquinas
                      </p>
                      <Button onClick={() => generatePredictions.mutate(undefined)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Gerar Previsões
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="high" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {highRiskPredictions.map((prediction) => (
                    <MLPredictionCard
                      key={prediction.id}
                      prediction={prediction}
                      onAcknowledge={(id) => acknowledgePrediction.mutate(id)}
                      getRiskLevel={getRiskLevel}
                      getPredictionTypeLabel={getPredictionTypeLabel}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="medium" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mediumRiskPredictions.map((prediction) => (
                    <MLPredictionCard
                      key={prediction.id}
                      prediction={prediction}
                      onAcknowledge={(id) => acknowledgePrediction.mutate(id)}
                      getRiskLevel={getRiskLevel}
                      getPredictionTypeLabel={getPredictionTypeLabel}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="low" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lowRiskPredictions.map((prediction) => (
                    <MLPredictionCard
                      key={prediction.id}
                      prediction={prediction}
                      onAcknowledge={(id) => acknowledgePrediction.mutate(id)}
                      getRiskLevel={getRiskLevel}
                      getPredictionTypeLabel={getPredictionTypeLabel}
                    />
                  ))}
                </div>
              </TabsContent>
            </div>

            <div className="space-y-6">
              <MLRiskDistributionChart predictions={predictions} />

              {/* Model Info */}
              <Card className="card-glass">
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Sobre o Modelo
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>O modelo analisa:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Histórico de manutenções</li>
                      <li>Manutenções corretivas recentes</li>
                      <li>Taxa de perdas na produção</li>
                      <li>Manutenções atrasadas</li>
                      <li>Tempo desde última manutenção</li>
                    </ul>
                    <p className="mt-3 text-xs">
                      Versão: v1.0-lovable-ai
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </>
  );
}
