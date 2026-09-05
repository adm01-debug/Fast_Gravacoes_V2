import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Printer } from 'lucide-react';
import { ProductionLot } from '@/features/inventory';
import { escapeHtml } from '@/lib/sanitize';

interface LotQRCodeProps {
  lot: ProductionLot;
  open: boolean;
  onClose: () => void;
}

export function LotQRCode({ lot, open, onClose }: LotQRCodeProps) {
  const qrData = JSON.stringify({
    type: 'LOT',
    id: lot.id,
    lot_number: lot.lot_number,
    product: lot.product_name,
    qty: lot.quantity,
    status: lot.status,
    date: lot.production_date,
  });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svgEl = document.getElementById('lot-qr-svg');
    if (!svgEl) return;

    const safeLotNumber = escapeHtml(lot.lot_number);
    const safeProductName = escapeHtml(lot.product_name);
    const safeQuantity = escapeHtml(String(lot.quantity));
    const safeStatus = escapeHtml(lot.status);
    const safeDate = escapeHtml(lot.production_date);

    printWindow.document.write(`
      <html>
        <head><title>Etiqueta - ${safeLotNumber}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:monospace;">
          <h2>${safeLotNumber}</h2>
          <p>${safeProductName}</p>
          ${svgEl.outerHTML}
          <p style="margin-top:8px;">Qtd: ${safeQuantity} | Status: ${safeStatus}</p>
          <p>${safeDate}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    const svgEl = document.getElementById('lot-qr-svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lot.lot_number}-qrcode.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code — {lot.lot_number}</DialogTitle>
          <DialogDescription className="sr-only">
            Visualização do QR Code para o lote {lot.lot_number}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 bg-white rounded-lg">
            <QRCodeSVG
              id="lot-qr-svg"
              value={qrData}
              size={200}
              level="H"
              includeMargin
            />
          </div>

          <div className="text-center">
            <p className="font-mono font-bold text-lg">{lot.lot_number}</p>
            <p className="text-sm text-muted-foreground">{lot.product_name}</p>
            <p className="text-xs text-muted-foreground">
              {lot.quantity} un • {lot.status}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              SVG
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimir Etiqueta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
