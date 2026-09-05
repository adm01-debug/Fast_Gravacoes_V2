import { AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MachinePrediction, PredictionFactor } from '@/features/analytics/hooks/useMLPredictions';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MLPredictionCardProps {
  prediction: MachinePrediction;
  onAcknowledge: (id: string) => void;
  getRiskLevel: (score: number) => { label: string; color: string };
  getPredictionTypeLabel: (type: string) => string;
}

const impactColors = {
  high: 'text-indicator-danger bg-indicator-danger/10',
  medium: 'text-indicator-warning bg-indicator-warning/10',
  low: 'text-indicator-info bg-indicator-info/10',
};

export function MLPredictionCard({
  prediction,
  onAcknowledge,
  getRiskLevel,
  getPredictionTypeLabel,
}: MLPredictionCardProps) {
  const riskLevel = getRiskLevel(Number(prediction.risk_score));
  const isHighRisk = Number(prediction.risk_score) >= 60;

  return (
    <Card className={`card-glass ${isHighRisk ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-title flex items-center gap-2">
              {prediction.machine?.name || 'Máquina'}
              <Badge variant="outline" className="text-xs font-normal">
                {prediction.machine?.code}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {getPredictionTypeLabel(prediction.prediction_type)}
            </p>
          </div>
          <Badge
            variant={riskLevel.color as "default" | "secondary" | "destructive" | "outline"}
            className={`${isHighRisk ? 'animate-pulse' : ''}`}
          >
            {riskLevel.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Risco de Falha</span>
            <span className="font-bold text-lg">{Math.round(prediction.risk_score)}%</span>
          </div>
          <Progress
            value={Number(prediction.risk_score)}
            className={`h-3 ${isHighRisk ? '[&>div]:bg-primary' : ''}`}
          />
        </div>

        {/* Confidence */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Confiança
          </span>
          <span className="font-medium">{Math.round(prediction.confidence)}%</span>
        </div>

        {/* Predicted Failure Date */}
        {prediction.predicted_failure_date && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 text-primary">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Falha prevista: {format(new Date(prediction.predicted_failure_date), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
        )}

        {/* Factors */}
        {prediction.factors && prediction.factors.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Fatores de Risco:</span>
            <div className="space-y-1">
              {prediction.factors.slice(0, 3).map((factor: PredictionFactor, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-2 rounded-md ${impactColors[factor.impact]}`}
                >
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs font-medium">{factor.factor}</span>
                  <span className="text-xs opacity-70 ml-auto">{factor.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {prediction.recommendations && prediction.recommendations.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Recomendações:</span>
            <ul className="text-sm text-muted-foreground space-y-1">
              {prediction.recommendations.slice(0, 3).map((rec: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(prediction.created_at), { addSuffix: true, locale: ptBR })}
          </span>
          {!prediction.acknowledged_at && Number(prediction.risk_score) >= 50 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAcknowledge(prediction.id)}
            >
              Reconhecer
            </Button>
          )}
          {prediction.acknowledged_at && (
            <Badge variant="secondary" className="text-xs">
              Reconhecido
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
