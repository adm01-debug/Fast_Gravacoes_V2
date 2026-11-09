import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, Zap, Target, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OEERecommendationsProps {
  data: {
    overallOEE: number;
    overallAvailability: number;
    overallPerformance: number;
    overallQuality: number;
    availabilityLosses: number;
    performanceLosses: number;
    qualityLosses: number;
  };
}

export const OEERecommendations = memo(function OEERecommendations({ data }: OEERecommendationsProps) {
  const getRecommendations = () => {
    const recommendations = [];

    if (data.overallAvailability < 90) {
      recommendations.push({
        title: 'Otimizar Tempos de Setup',
        description: 'Perdas de disponibilidade detectadas. Considere implementar técnicas SMED para reduzir o tempo de troca de ferramentas.',
        impact: 'Alto',
        type: 'availability',
        icon: <Zap className="h-4 w-4" />
      });
    }

    if (data.overallPerformance < 95) {
      recommendations.push({
        title: 'Ajuste de Velocidade Nominal',
        description: 'Pequenas paradas e velocidade reduzida estão impactando a performance. Verifique o alinhamento das esteiras e lubrificação.',
        impact: 'Médio',
        type: 'performance',
        icon: <Target className="h-4 w-4" />
      });
    }

    if (data.overallQuality < 99) {
      recommendations.push({
        title: 'Calibração de Precisão',
        description: 'O índice de refugo subiu. Recomendada calibração preventiva nos sensores de visão e bicos injetores.',
        impact: 'Crítico',
        type: 'quality',
        icon: <AlertCircle className="h-4 w-4" />
      });
    }

    // Default if world class
    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Manutenção da Estabilidade',
        description: 'Seus indicadores estão em nível de Classe Mundial. Foque em monitoramento preditivo para evitar desvios.',
        impact: 'Baixo',
        type: 'general',
        icon: <Sparkles className="h-4 w-4" />
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <h3 className="text-sm font-black uppercase tracking-widest">Plano de Ação de Excelência</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec, i) => (
          <Card key={i} className="border-primary/20 bg-black/20 hover:bg-black/40 transition-colors group">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center",
                  rec.type === 'availability' ? "bg-primary/20 text-primary" :
                  rec.type === 'performance' ? "bg-indicator-info/20 text-indicator-info" :
                  rec.type === 'quality' ? "bg-accent-purple/20 text-accent-purple" : "bg-success/20 text-success"
                )}>
                  {rec.icon}
                </div>
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter">
                  Impacto: {rec.impact}
                </Badge>
              </div>
              
              <h4 className="font-bold text-sm mb-2 group-hover:text-primary transition-colors">{rec.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                {rec.description}
              </p>
              
              <Button variant="ghost" size="sm" className="w-full justify-between text-[10px] font-black uppercase hover:bg-primary/10 hover:text-primary">
                Agendar Intervenção
                <ArrowRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});
