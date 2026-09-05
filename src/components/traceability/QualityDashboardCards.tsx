import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import { LotQualityInspection } from '@/features/inventory';

interface QualityDashboardCardsProps {
  inspections: LotQualityInspection[];
}

export function QualityDashboardCards({ inspections }: QualityDashboardCardsProps) {
  const stats = useMemo(() => {
    const total = inspections.length;
    const approved = inspections.filter(i => i.result === 'approved').length;
    const rejected = inspections.filter(i => i.result === 'rejected').length;
    const conditional = inspections.filter(i => i.result === 'conditional').length;
    const totalDefects = inspections.reduce((sum, i) => sum + (i.defects_found || 0), 0);
    const totalSamples = inspections.reduce((sum, i) => sum + (i.sample_size || 0), 0);
    const defectRate = totalSamples > 0 ? (totalDefects / totalSamples * 100) : 0;
    const approvalRate = total > 0 ? (approved / total * 100) : 0;

    return { total, approved, rejected, conditional, totalDefects, defectRate, approvalRate };
  }, [inspections]);

  if (stats.total === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Dashboard de Qualidade
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{stats.approvalRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Taxa Aprovação</p>
            <Progress value={stats.approvalRate} className="mt-1 h-1.5" />
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-2xl font-bold">{stats.approved}</span>
            </div>
            <p className="text-xs text-muted-foreground">Aprovadas</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold">{stats.rejected}</span>
            </div>
            <p className="text-xs text-muted-foreground">Rejeitadas</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.defectRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Taxa Defeitos</p>
            {stats.defectRate > 5 && (
              <Badge variant="destructive" className="text-[9px] mt-1">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                Alto
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
