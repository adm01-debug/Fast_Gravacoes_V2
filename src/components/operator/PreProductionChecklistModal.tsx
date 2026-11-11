import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PreProductionChecklist } from './PreProductionChecklist';

interface PreProductionChecklistModalProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (jobId: string) => void;
}

export function PreProductionChecklistModal({ jobId, open, onOpenChange, onComplete }: PreProductionChecklistModalProps) {
  if (!jobId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Checklist Pré-Produção</DialogTitle>
          <DialogDescription>Verifique todos os itens antes de iniciar a produção</DialogDescription>
        </DialogHeader>
        <PreProductionChecklist
          jobId={jobId}
          onComplete={() => {
            onComplete(jobId);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
