import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, Zap, Target, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HyperInsight {
  id: string;
  type: 'efficiency' | 'cost' | 'quality';
  title: string;
  description: string;
  impact: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

const INSIGHTS: HyperInsight[] = [
  {
    id: '1',
    type: 'efficiency',
    title: 'Otimização de Técnica: Metal vs Laser',
    description: 'Produtos de Metal gravados no Studio Laser Precision estão com OEE 12% superior à média. Sugerido priorizar Laser para lotes acima de 500 unidades.',
    impact: '+8.5% Produtividade',
    action: 'Ajustar Roteiro',
    priority: 'high'
  },
  {
    id: '2',
    type: 'quality',
    title: 'Predição de Refugo: Studio UV',
    description: 'Aumento de 2.1% no refugo em materiais Plásticos nas últimas 4 horas. Provável necessidade de limpeza do cabeçote ou ajuste de cura.',
    impact: '-15% Perdas',
    action: 'Checklist de Qualidade',
    priority: 'high'
  },
  {
    id: '3',
    type: 'efficiency',
    title: 'Gargalo de Setup: Serigrafia',
    description: 'O tempo de setup no Studio Serigrafia Têxtil aumentou 18min por lote devido à troca de tintas vinílicas. Considere agrupar ordens por cor.',
    impact: '+22min Disponibilidade/dia',
    action: 'Agrupar OPs',
    priority: 'medium'
  }
];

export function HyperInsights() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-tight">AI Hyper Insights</h3>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Inteligência FAST 10/10</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-muted-foreground/20">Demonstração — dados ilustrativos</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {INSIGHTS.map((insight) => (
          <Card key={insight.id} className="relative overflow-hidden border-primary/10 hover:border-primary/30 transition-all group">
            <div className={cn(
              "absolute top-0 left-0 w-1 h-full",
              insight.priority === 'high' ? "bg-red-500" : "bg-yellow-500"
            )} />
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start mb-1">
                <Badge variant="secondary" className="text-[9px] uppercase font-bold py-0 h-4">
                  {insight.type}
                </Badge>
                <span className="text-[10px] font-black text-primary group-hover:translate-x-1 transition-transform">
                  {insight.impact}
                </span>
              </div>
              <CardTitle className="text-sm font-bold leading-tight">
                {insight.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {insight.description}
              </p>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-primary/5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Action Needed</span>
                <button className="flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:gap-2 transition-all">
                  {insight.action}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
