import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from '@/lib/recharts';
import { TechniqueOEE } from '@/features/production';
import { ChevronRight } from 'lucide-react';

interface OEETechniqueComparisonProps {
  techniques: TechniqueOEE[];
  worldClassBenchmark: number;
}

import { memo } from 'react';

export const OEETechniqueComparison = memo(function OEETechniqueComparison({ techniques, worldClassBenchmark }: OEETechniqueComparisonProps) {

  const chartData = techniques.map(t => ({
    name: t.techniqueName.length > 12 ? t.techniqueName.substring(0, 12) + '...' : t.techniqueName,
    fullName: t.techniqueName,
    oee: t.averageOEE,
    availability: t.averageAvailability,
    performance: t.averagePerformance,
    quality: t.averageQuality,
    color: t.techniqueColor,
    machineCount: t.machines.length
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>OEE por Técnica</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => {
                  return [`${value.toFixed(1)}%`, 'OEE'];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullName;
                  }
                  return label;
                }}
              />
              <ReferenceLine
                y={worldClassBenchmark}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
              />
              <Bar dataKey="oee" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed breakdown */}
        <div className="space-y-3">
          {techniques.slice(0, 5).map(technique => (
            <div
              key={technique.techniqueId}
              className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: technique.techniqueColor }}
                  />
                  <span className="font-medium text-sm">{technique.techniqueName}</span>
                  <Badge variant="outline" className="text-xs">
                    {technique.machines.length} máquinas
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-lg font-bold"
                    style={{
                      color: technique.averageOEE >= 85 ? 'hsl(var(--success))' :
                             technique.averageOEE >= 65 ? 'hsl(48 96% 53%)' :
                             'hsl(var(--destructive))'
                    }}
                  >
                    {technique.averageOEE.toFixed(1)}%
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground mb-1">Disponibilidade</div>
                  <Progress value={technique.averageAvailability} className="h-1.5" />
                  <div className="text-right mt-0.5">{technique.averageAvailability.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Performance</div>
                  <Progress value={technique.averagePerformance} className="h-1.5" />
                  <div className="text-right mt-0.5">{technique.averagePerformance.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Qualidade</div>
                  <Progress value={technique.averageQuality} className="h-1.5" />
                  <div className="text-right mt-0.5">{technique.averageQuality.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
