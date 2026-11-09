import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react';

interface MachineBulkActionsProps {
  selectedCount: number;
  onToggle: (active: boolean) => void;
  onCancel: () => void;
}

export function MachineBulkActions({ selectedCount, onToggle, onCancel }: MachineBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-primary/20 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 glass-card"
    >
      <div className="flex items-center gap-2 border-r border-border pr-6">
        <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground">
          {selectedCount}
        </Badge>
        <span className="text-sm font-bold uppercase tracking-tight">Máquinas selecionadas</span>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-2 border-success/30 text-success hover:bg-success/10 hover:text-success font-bold"
          onClick={() => onToggle(true)}
        >
          <CheckCircle2 className="h-4 w-4" />
          Ativar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-2 border-warning/30 text-warning hover:bg-warning/10 hover:text-warning font-bold"
          onClick={() => onToggle(false)}
        >
          <XCircle className="h-4 w-4" />
          Desativar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 text-muted-foreground hover:text-foreground"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </motion.div>
  );
}
