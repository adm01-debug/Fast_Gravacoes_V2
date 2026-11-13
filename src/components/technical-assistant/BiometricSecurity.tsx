import { Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export const BiometricSecurity = ({ onVerify }: { onVerify: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/90 p-6 rounded-3xl border border-primary/50 shadow-2xl backdrop-blur-3xl text-center space-y-4"
    >
      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto border border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.3)]">
        <Fingerprint className="h-8 w-8 text-primary animate-pulse" />
      </div>
      <h3 className="text-sm font-black uppercase tracking-widest text-white">Verificação de Segurança</h3>
      <p className="text-[10px] text-zinc-400">Autenticação biométrica necessária para confirmar operação industrial crítica.</p>
      <Button
        onClick={onVerify}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest h-12"
      >
        Escanear Impressão Digital
      </Button>
    </motion.div>
  );
};
