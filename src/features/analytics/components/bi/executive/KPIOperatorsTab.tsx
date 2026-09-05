import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, TrendingUp, Clock, Package, Target } from 'lucide-react';

interface OperatorRanking {
  operatorId: string;
  operatorName: string;
  avatarUrl?: string | null;
  totalJobsCompleted: number;
  efficiencyScore: number;
}

interface TechniqueProductivity {
  techniqueId: string;
  techniqueName: string;
  jobCount: number;
  avgDuration: number;
}

interface ProductProductivity {
  productName: string;
  totalPieces: number;
  lossRate: number;
}

interface KPIData {
  productivityByTechnique: TechniqueProductivity[];
  productivityByProduct: ProductProductivity[];
  lossRate: number;
}

interface KPIOperatorsTabProps {
  operators: OperatorRanking[];
  kpis: KPIData;
  formatDuration: (mins: number) => string;
}

const KPIOperatorsTabComponent = ({
  operators, kpis, formatDuration
}: KPIOperatorsTabProps) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-warning" />
                Ranking de Produtividade (Operadores)
              </CardTitle>
              <CardDescription>Top performers por score de eficiência e qualidade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {operators.slice(0, 5).map((op, idx) => (
                  <div key={op.operatorId} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 hover:bg-muted/20 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="text-title font-bold text-muted-foreground w-4 text-center">
                        {idx + 1}
                      </div>
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage src={op.avatarUrl || undefined} />
                        <AvatarFallback>{op.operatorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{op.operatorName}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{op.totalJobsCompleted} jobs finalizados</span>
                          <span className="text-[10px] py-0.5 px-1.5 rounded-full bg-primary/10 text-primary uppercase font-bold tracking-wider">
                            {op.efficiencyScore > 90 ? 'Master' : 'Pro'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold gradient-text">{op.efficiencyScore.toFixed(0)}%</span>
                        <TrendingUp className="h-3 w-3 text-green-400" />
                      </div>
                      <Progress value={op.efficiencyScore} className="h-1.5 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Tempo Médio de Produção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {kpis.productivityByTechnique.slice(0, 4).map((tech) => (
                <div key={tech.techniqueId} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{tech.techniqueName}</span>
                    <span className="text-xs text-muted-foreground">{tech.jobCount} execuções</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{formatDuration(Math.round(tech.avgDuration))}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-400" />
                Performance por Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {kpis.productivityByProduct.slice(0, 3).map((prod) => (
                <div key={prod.productName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate max-w-[120px]">{prod.productName}</span>
                    <span className="text-xs font-mono">{prod.totalPieces.toLocaleString()} pcs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.max(5, 100 - prod.lossRate)} className="h-1 flex-1" />
                    <span className="text-[10px] text-muted-foreground">{prod.lossRate.toFixed(1)}% perdas</span>
                  </div>
                </div>
              ))}
              {kpis.productivityByProduct.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Sem dados de produtos</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card bg-primary/5 border-primary/20 overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Target className="h-32 w-32" />
            </div>
            <CardHeader>
              <CardTitle className="text-base">Meta Global de Qualidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="relative h-24 w-24">
                  <svg className="h-24 w-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/20" />
                    <circle
                      cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 * (1 - (100 - kpis.lossRate) / 100)}
                      className="text-green-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-bold">{(100 - kpis.lossRate).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-sm font-medium mt-2">Índice de Peças Boas</p>
                <Badge variant="outline" className="border-green-500/50 text-green-400">DENTRO DA META</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const KPIOperatorsTab = memo(KPIOperatorsTabComponent);
