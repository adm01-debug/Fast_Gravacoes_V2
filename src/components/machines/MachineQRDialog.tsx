import { Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TargetArrowIcon } from '@/components/icons/TargetArrowIcon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { DbMachine } from '@/features/jobs';

interface MachineQRDialogProps {
  machine: DbMachine | null;
  onClose: () => void;
}

export function MachineQRDialog({ machine, onClose }: MachineQRDialogProps) {
  return (
    <Dialog open={!!machine} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-xs text-center">
            <DialogHeader>
              <DialogTitle className="text-center">TAG de Máquina</DialogTitle>
              <DialogDescription className="text-center">Escaneie para acesso mobile</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-4 bg-white rounded-xl border-2 border-black">
                <QRCodeSVG
                  value={JSON.stringify({ id: machine?.id, code: machine?.code, type: 'machine' })}
                  size={200}
                  level="H"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black">{machine?.code}</p>
                <p className="text-xs text-muted-foreground uppercase font-bold">{machine?.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <TargetArrowIcon className="h-4 w-4" /> Imprimir
              </Button>
              <Button className="gap-2" onClick={() => {
                toast.success("QR Code enviado para o terminal móvel.");
                onClose();
              }}>
                <Zap className="h-4 w-4" /> Enviar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

  );
}
