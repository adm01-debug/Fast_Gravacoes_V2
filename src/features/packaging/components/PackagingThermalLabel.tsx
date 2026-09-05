import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

interface PackagingLabelData {
  taskId: string;
  orderNumber: string;
  client: string;
  product: string;
  approvedQuantity: number;
  packagedBy?: string | null;
  packagedAt?: string | null;
  destination?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PackagingLabelData;
}

const APP_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

/**
 * Etiqueta térmica 10x15cm (formato padrão FAST) para caixas embaladas.
 * O QR Code aponta para /packaging?task=<id>, permitindo rastreio direto.
 */
export function PackagingThermalLabel({ open, onOpenChange, data }: Props) {
  const qrValue = useMemo(
    () => `${APP_ORIGIN}/packaging?task=${data.taskId}`,
    [data.taskId],
  );

  const handlePrint = () => {
    const area = document.getElementById('packaging-thermal-label-print');
    if (!area) return;
    const w = window.open('', 'PRINT', 'width=600,height=800');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Etiqueta ${data.orderNumber}</title>
      <style>
        @page { size: 100mm 150mm; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', system-ui, sans-serif; color: #000; }
        .label { width: 100mm; height: 150mm; padding: 4mm; display: flex; flex-direction: column; gap: 3mm; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 2mm; }
        .brand { font-weight: 800; font-size: 14pt; letter-spacing: 0.5px; }
        .badge { font-size: 8pt; border: 1px solid #000; padding: 1mm 2mm; border-radius: 2px; }
        .row { font-size: 10pt; line-height: 1.35; }
        .row strong { display: block; font-size: 7pt; text-transform: uppercase; color: #444; letter-spacing: 0.4px; }
        .qty { font-size: 34pt; font-weight: 800; text-align: center; line-height: 1; margin: 2mm 0; }
        .qty small { display: block; font-size: 8pt; font-weight: 500; text-transform: uppercase; color: #444; letter-spacing: 0.4px; margin-top: 1mm; }
        .qr { display: flex; justify-content: center; align-items: center; }
        .foot { margin-top: auto; font-size: 7pt; text-align: center; color: #444; border-top: 1px dashed #000; padding-top: 1.5mm; }
      </style></head><body>${area.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Etiqueta de Embalagem</DialogTitle>
        </DialogHeader>

        <div className="border rounded-md bg-white text-black overflow-hidden">
          <div id="packaging-thermal-label-print">
            <div className="label" style={{ width: '100mm', height: '150mm', padding: '4mm', display: 'flex', flexDirection: 'column', gap: '3mm' }}>
              <div className="header">
                <div className="brand">FAST GRAVAÇÕES</div>
                <div className="badge">EMBALAGEM</div>
              </div>

              <div className="row"><strong>Pedido</strong>{data.orderNumber}</div>
              <div className="row"><strong>Cliente</strong>{data.client}</div>
              <div className="row"><strong>Produto</strong>{data.product}</div>

              <div className="qty">
                {data.approvedQuantity.toLocaleString('pt-BR')}
                <small>peças aprovadas</small>
              </div>

              <div className="qr">
                <QRCodeSVG value={qrValue} size={140} level="M" includeMargin={false} />
              </div>

              {data.destination && (
                <div className="row"><strong>Destino</strong>{data.destination}</div>
              )}

              <div className="foot">
                {data.packagedAt ? format(new Date(data.packagedAt), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm')}
                {' · '}Task {data.taskId.slice(0, 8)}
              </div>
            </div>
          </div>
        </div>

        <Button onClick={handlePrint} className="w-full gap-2">
          <Printer className="h-4 w-4" /> Imprimir etiqueta 10x15
        </Button>
      </DialogContent>
    </Dialog>
  );
}
