import { FileSearch, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface BIEmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
}

export function BIEmptyState({
  title = "Nenhum dado encontrado",
  description = "Tente ajustar seus filtros ou mudar o período selecionado para visualizar as métricas.",
  onReset
}: BIEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-12 text-center bg-black/20 border border-white/5 rounded-3xl backdrop-blur-sm"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <div className="relative bg-black/40 p-6 rounded-full border border-primary/20">
          <FileSearch className="h-12 w-12 text-primary/60" />
        </div>
      </div>

      <h3 className="text-xl text-title font-bold text-white mb-2 uppercase tracking-tight">{title}</h3>
      <p className="text-muted-foreground max-w-xs mb-8">
        {description}
      </p>

      {onReset && (
        <Button
          variant="outline"
          onClick={onReset}
          className="group border-primary/30 hover:border-primary/60 text-primary gap-2"
        >
          <RefreshCcw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
          Resetar Filtros
        </Button>
      )}
    </motion.div>
  );
}
