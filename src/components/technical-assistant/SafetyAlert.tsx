import { AlertTriangle, ShieldAlert, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface SafetyAlertProps {
  parameter: string;
  suggestedValue: string;
  limit: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SafetyAlert({ parameter, suggestedValue, limit, onConfirm, onCancel }: SafetyAlertProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-2xl border border-red-500/50 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)] space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-red-500/20 text-red-500">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-black text-red-600 uppercase tracking-tight">Alerta de Segurança Crítico</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            A sugestão de <span className="font-bold text-foreground">{suggestedValue}</span> para <span className="font-bold text-foreground">{parameter}</span> excede o limite de segurança da máquina (<span className="font-bold text-foreground">{limit}</span>).
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button 
          variant="destructive" 
          size="sm" 
          className="w-full h-10 gap-2 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-red-500/20"
          onClick={onConfirm}
        >
          <Fingerprint className="h-4 w-4" />
          Confirmar Bypass Biométrico
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-10 font-bold uppercase text-[10px] tracking-widest border-red-500/20 hover:bg-red-500/10"
          onClick={onCancel}
        >
          Ignorar Sugestão
        </Button>
      </div>
      
      <div className="flex items-center justify-center gap-1.5 opacity-50">
        <ShieldAlert className="h-3 w-3" />
        <span className="text-[9px] font-medium uppercase tracking-tighter">Protocolo de Segurança Nível 4 Ativo</span>
      </div>
    </motion.div>
  );
}
