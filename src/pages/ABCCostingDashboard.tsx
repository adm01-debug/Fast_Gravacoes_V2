import { Helmet } from 'react-helmet-async';
import { Calculator, DollarSign, TrendingUp, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { useABCCosts } from '@/hooks/useABCCosts';
import { ABCCostPoolsCard } from '@/components/abc/ABCCostPoolsCard';
import { ABCTechniqueChart } from '@/components/abc/ABCTechniqueChart';
import { ABCCostBreakdownChart } from '@/components/abc/ABCCostBreakdownChart';
import { ABCJobCostsTable } from '@/components/abc/ABCJobCostsTable';
import { ABCActivityRatesCard } from '@/components/abc/ABCActivityRatesCard';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { AIFinancialAdvisor } from '@/components/abc/AIFinancialAdvisor';
import { MainLayout } from '@/components/layout/MainLayout';


export default function ABCCostingDashboard() {
  const {
    activities,
    costPools,
    activityRates,
    jobCosts,
    jobs,
    isLoading,
    getJobCostSummary,
    getTechniqueCostSummary,
    totalBudget,
    totalAllocatedCost,
    averageUnitCost,
    calculateJobCost,
    calculateAllJobsCosts,
    updateActivityRate,
    updateCostPoolBudget,
  } = useABCCosts();

  const jobSummaries = jobs
    .map(job => getJobCostSummary(job.id))
    .filter((s): s is NonNullable<typeof s> => s !== null && s.total_cost > 0);

  const techniqueSummaries = getTechniqueCostSummary();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 p-6">
          <div className="flex flex-col gap-2 mb-8">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <DashboardSkeleton rows={6} columns={4} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Helmet>
        <title>FAST GRAVAÇÕES | Financial Intelligence</title>
      </Helmet>

      <div className="space-y-6">
        <Breadcrumbs />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
                <h1 className="text-3xl text-title font-black tracking-tighter uppercase">
                  <span className="gradient-text animate-pulse-glow">FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO</span>
                </h1>
            </div>
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs opacity-70">
              QUALIDADE + VELOCIDADE
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-glass hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orçamento Mensal</p>
                  <p className="text-2xl font-bold text-title">
                    {totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glass hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <Calculator className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo Alocado</p>
                  <p className="text-2xl font-bold text-title text-success">
                    {totalAllocatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Custo Unitário Médio</p>
                  <p className="text-2xl font-bold text-title text-warning">
                    {averageUnitCost.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 4
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-glass hover-lift">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Package className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jobs Custeados</p>
                  <p className="text-2xl font-bold text-title text-purple-500">
                    {jobSummaries.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="jobs">Custos por Job</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <ABCTechniqueChart data={techniqueSummaries} />
                  <ABCCostBreakdownChart costPools={costPools} jobCosts={jobCosts} />
                </div>
              </div>
              <div className="lg:col-span-1">
                <AIFinancialAdvisor />
              </div>
            </div>

            <ABCCostPoolsCard
              costPools={costPools}
              totalAllocated={totalAllocatedCost}
              onUpdateBudget={(id, budget) => updateCostPoolBudget.mutate({ id, monthly_budget: budget })}
            />
          </TabsContent>

          <TabsContent value="jobs">
            <ABCJobCostsTable
              jobSummaries={jobSummaries}
              onRecalculate={(jobId) => calculateJobCost.mutate(jobId)}
              onRecalculateAll={() => calculateAllJobsCosts.mutate()}
              isRecalculating={calculateJobCost.isPending || calculateAllJobsCosts.isPending}
            />
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ABCActivityRatesCard
                activities={activities}
                costPools={costPools}
                activityRates={activityRates}
                onUpdateRate={(data) => updateActivityRate.mutate(data)}
              />
              <ABCCostPoolsCard
                costPools={costPools}
                totalAllocated={totalAllocatedCost}
                onUpdateBudget={(id, budget) => updateCostPoolBudget.mutate({ id, monthly_budget: budget })}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
