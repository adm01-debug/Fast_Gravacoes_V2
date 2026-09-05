import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from '@/lib/recharts';
import { OperatorProductivityMetrics } from '@/features/production';

export const ProductionRadarChart = memo(({ operator }: { operator: OperatorProductivityMetrics }) => {
  const radarData = [
    { metric: 'Eficiência', value: operator.efficiencyScore, fullMark: 100 },
    { metric: 'Volume', value: Math.min(100, operator.totalJobsCompleted * 10), fullMark: 100 },
    { metric: 'Qualidade', value: Math.max(0, 100 - operator.lossRate * 5), fullMark: 100 },
    { metric: 'Velocidade', value: Math.min(100, operator.productionVelocity * 2), fullMark: 100 },
    { metric: 'Atividade', value: Math.min(100, operator.totalScans * 5), fullMark: 100 },
  ];

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Perfil de Performance
        </CardTitle>
        <CardDescription>{operator.operatorName}</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid className="stroke-border" />
            <PolarAngleAxis dataKey="metric" className="text-xs" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
            <Radar name={operator.operatorName} dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

ProductionRadarChart.displayName = 'ProductionRadarChart';
