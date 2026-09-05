import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, TrendingUp, AlertCircle, Zap, CheckCircle2, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export function AIWorkforceAdvisor() {
  const insights = [
    {
      type: 'success',
      title: 'Alta Eficiência em Sublimação',
      description: 'O time de operadores do turno matutino atingiu 92% de eficiência média em sublimação, superando a meta em 5%.',
      icon: <CheckCircle2 className="h-4 w-4 text-success" />
    },
    {
      type: 'warning',
      title: 'Gargalo em CNC - Turno B',
      description: 'Identificada queda de 12% na produtividade da CNC 02. Recomenda-se redistribuição de carga ou treinamento de reforço.',
      icon: <AlertCircle className="h-4 w-4 text-warning" />
    },
    {
      type: 'info',
      title: 'Sugestão de Treinamento',
      description: 'O operador Ricardo Silva demonstra alta aptidão em Laser. Sugerimos certificação em Gravação UV para balanceamento de equipe.',
      icon: <Zap className="h-4 w-4 text-blue-500" />
    },
    {
      type: 'tip',
      title: 'Otimização de Escala',
      description: 'A análise preditiva sugere que a alocação de 3 operadores extras na Sexta-feira reduzirá o lead time em 18%.',
      icon: <Lightbulb className="h-4 w-4 text-purple-500" />
    }
  ];

  return (
    <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary animate-pulse" />
            IA Workforce Advisor
          </CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/30 text-primary">Beta 2.0</Badge>
        </div>
        <CardDescription>Insights inteligentes sobre capital humano e produtividade</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-border/50 hover:border-primary/30 transition-all duration-300 group"
          >
            <div className="mt-0.5 group-hover:scale-110 transition-transform">
              {insight.icon}
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold leading-none">{insight.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {insight.description}
              </p>
            </div>
          </motion.div>
        ))}
        <div className="pt-2">
          <div className="p-3 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-tighter">Impacto Estimado: +8.4% OEE</span>
            </div>
            <Badge className="bg-primary text-white text-[10px] uppercase">Recalcular</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
