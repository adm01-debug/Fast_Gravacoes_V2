import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, Search, Fingerprint, ShieldCheck, History, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export function AuditAIAdvisor() {
  const insights = [
    {
      type: 'security',
      title: 'Padrão de Edição Atípico',
      description: 'IA detectou múltiplas edições em Fichas Técnicas pelo usuário "Coordenador_01" em menos de 5 minutos. Verificando conformidade.',
      icon: <Search className="h-4 w-4 text-warning" />
    },
    {
      type: 'integrity',
      title: 'Selos de Integridade OK',
      description: 'Cadeia de custódia digital validada. Nenhum salto de sequência detectado nos últimos 5.000 logs.',
      icon: <ShieldCheck className="h-4 w-4 text-success" />
    },
    {
      type: 'compliance',
      title: 'Conformidade 21 CFR Part 11',
      description: 'Relatório de auditoria pronto para submissão. Todas as assinaturas eletrônicas estão vinculadas a identidades verificadas.',
      icon: <Fingerprint className="h-4 w-4 text-blue-500" />
    },
    {
      type: 'forensics',
      title: 'Análise Forense Ativa',
      description: 'O sistema está monitorando ativamente alterações em campos críticos de "Custo Unitário" para evitar fraudes.',
      icon: <Eye className="h-4 w-4 text-purple-500" />
    }
  ];

  return (
    <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary animate-pulse" />
            Audit Intelligence Advisor
          </CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/30 text-primary">Immutable Log</Badge>
        </div>
        <CardDescription>Inteligência forense e conformidade regulatória</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 20 }}
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
              <History className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-tighter">Chain Health: 100% Secure</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
