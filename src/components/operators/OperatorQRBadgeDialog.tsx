import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { OperatorWithProfile } from '@/features/production/hooks/useOperators';

interface OperatorQRBadgeDialogProps {
  operator: OperatorWithProfile | null;
  onClose: () => void;
}

export function OperatorQRBadgeDialog({ operator, onClose }: OperatorQRBadgeDialogProps) {
  return (
    <Dialog open={!!operator} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-xs text-center p-6">
            <DialogHeader>
              <DialogTitle className="text-center text-title font-black uppercase tracking-tighter">Crachá Digital</DialogTitle>
              <DialogDescription className="text-center">FAST GRAVAÇÕES - Identificação Industrial</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-6 py-6 bg-gradient-to-b from-primary/5 to-transparent rounded-2xl border border-primary/10">
              <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                <AvatarImage src={operator?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                  {operator?.full_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="p-4 bg-white rounded-2xl border-2 border-black shadow-xl">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: operator?.user_id,
                    name: operator?.full_name,
                    type: 'operator_badge'
                  })}
                  size={160}
                  level="H"
                />
              </div>

              <div className="space-y-1">
                <p className="text-lg font-black uppercase leading-tight">{operator?.full_name}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{operator?.role || 'OPERADOR INDUSTRIAL'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-2">
              <Button className="gap-2 w-full font-bold" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimir Crachá
              </Button>
              <Button variant="ghost" className="text-xs text-muted-foreground" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
  );
}
