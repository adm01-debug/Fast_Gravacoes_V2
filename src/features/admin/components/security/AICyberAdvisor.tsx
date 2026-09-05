import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BrainCircuit, ShieldCheck, ShieldAlert, Lock, Fingerprint, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export function AICyberAdvisor() {
  const insights = [
    {
      type: 'success',
      title: 'Resiliência Cibernética Ativa',
      description: 'O sistema bloqueou automaticamente 43 tentativas de brute-force na última hora via Geo-Blocking.',
      icon: <ShieldCheck className="h-4 w-4 text-success" />
    },
    {
      type: 'warning',
      title: 'Alerta de Login Incomum',
      description: 'Detectado login de um novo dispositivo em horário atípico para o usuário Admin. Verificação MFA solicitada.',
      icon: <ShieldAlert className="h-4 w-4 text-warning" />
    },
    {
      type: 'info',
      title: 'Sugestão de Endurecimento',
      description: 'Recomendamos habilitar o isolamento de rede para os IPs da rede de máquinas (CNC/Laser) para aumentar o Zero-Trust.',
      icon: <Lock className="h-4 w-4 text-blue-500" />
    },
    {
      type: 'integrity',
      title: 'Integridade de Dados',
      description: 'Validação de Blockchain confirmou que 100% dos logs de produção estão íntegros e sem alterações.',
      icon: <Fingerprint className="h-4 w-4 text-purple-500" />
    }
  ];

  return (
    <Card className="glass-card border-blue-500/20 bg-blue-500/5 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-blue-500 animate-pulse" />
            AI Cyber Advisor
          </CardTitle>
          <Badge variant="outline" className="text-[10px] uppercase font-bold border-blue-500/30 text-blue-500">Active Defense</Badge>
        </div>
        <CardDescription>Monitoramento proativo e inteligência de ameaças</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {insights.map((insight, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-border/50 hover:border-blue-500/30 transition-all duration-300 group"
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
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-tighter">Status: Defesa Total Ativa</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
