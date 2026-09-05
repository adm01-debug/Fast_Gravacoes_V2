import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, Printer, Tag, Copy } from 'lucide-react';
import { ProductionLot } from '@/features/inventory';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { escapeHtml } from '@/lib/sanitize';

interface LotLabelPrintProps {
  lots: ProductionLot[];
  open: boolean;
  onClose: () => void;
}

type LabelSize = '10x15' | '5x7' | '8x5';

const LABEL_CONFIGS: Record<LabelSize, { w: number; h: number; qrSize: number; name: string }> = {
  '10x15': { w: 378, h: 567, qrSize: 180, name: '10×15 cm' },
  '5x7':   { w: 189, h: 265, qrSize: 100, name: '5×7 cm' },
  '8x5':   { w: 302, h: 189, qrSize: 90,  name: '8×5 cm (paisagem)' },
};

export function LotLabelPrint({ lots, open, onClose }: LotLabelPrintProps) {
  const [labelSize, setLabelSize] = useState<LabelSize>('10x15');
  const [copies, setCopies] = useState(1);
  const [zoom, setZoom] = useState(0.7);

  const config = LABEL_CONFIGS[labelSize];

  const generateQrValue = (lot: ProductionLot) => {
    return `LOT:${lot.lot_number}`;
  };

  const buildLabelHTML = (lot: ProductionLot, cfg: typeof config) => {
    const qrValue = generateQrValue(lot);
    const isLandscape = cfg.w > cfg.h;
    const safeLotNumber = escapeHtml(lot.lot_number);
    const safeProductName = escapeHtml(lot.product_name);
    const safeQuantity = escapeHtml(String(lot.quantity));

    return `
      <div style="
        width:${cfg.w}px;height:${cfg.h}px;
        border:1px dashed #ccc;border-radius:6px;
        display:flex;flex-direction:${isLandscape ? 'row' : 'column'};
        align-items:center;justify-content:center;
        padding:${isLandscape ? '8px 16px' : '16px'};gap:${isLandscape ? '16px' : '12px'};
        font-family:'Courier New',monospace;box-sizing:border-box;
        page-break-inside:avoid;break-inside:avoid;
      ">
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;">
          <div id="qr-placeholder-${escapeHtml(lot.id)}" data-value="${escapeHtml(qrValue)}" data-size="${cfg.qrSize}"></div>
        </div>
        <div style="text-align:${isLandscape ? 'left' : 'center'};flex:1;min-width:0;overflow:hidden;">
          <div style="font-size:${isLandscape ? '13px' : '16px'};font-weight:bold;margin-bottom:4px;word-break:break-word;">
            ${safeLotNumber}
          </div>
          <div style="font-size:${isLandscape ? '11px' : '13px'};color:#333;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${safeProductName}
          </div>
          <div style="font-size:${isLandscape ? '10px' : '11px'};color:#666;margin-bottom:2px;">
            Qtd: ${safeQuantity} un
          </div>
          <div style="font-size:${isLandscape ? '10px' : '11px'};color:#666;margin-bottom:2px;">
            Produção: ${format(parseDateOnly(lot.production_date) ?? new Date(), 'dd/MM/yyyy')}
          </div>
          ${lot.expiration_date ? `
            <div style="font-size:${isLandscape ? '10px' : '11px'};color:#c00;font-weight:bold;">
              Val: ${format(parseDateOnly(lot.expiration_date) ?? new Date(), 'dd/MM/yyyy')}
            </div>
          ` : ''}
          ${lot.job ? `
            <div style="font-size:${isLandscape ? '9px' : '10px'};color:#999;margin-top:4px;">
              OS: ${escapeHtml(lot.job.order_number)}
            </div>
          ` : ''}
          <div style="font-size:8px;color:#bbb;margin-top:6px;">
            ${safeLotNumber}
          </div>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up bloqueado. Permita pop-ups para imprimir.');
      return;
    }

    const labelsHTML = lots.flatMap(lot =>
      Array.from({ length: copies }, () => buildLabelHTML(lot, config))
    ).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiquetas - ${lots.length} lote(s)</title>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
          <style>
            @page { size: auto; margin: 5mm; }
            body {
              margin:0;padding:10px;
              display:flex;flex-wrap:wrap;gap:8px;
              justify-content:center;align-items:flex-start;
            }
            @media print {
              body { gap:4px; }
            }
          </style>
        </head>
        <body>
          ${labelsHTML}
          <script>
            document.querySelectorAll('[id^="qr-placeholder-"]').forEach(el => {
              const value = el.dataset.value;
              const size = parseInt(el.dataset.size, 10);
              const canvas = document.createElement('canvas');
              QRCode.toCanvas(canvas, value, { width: size, margin: 1, errorCorrectionLevel: 'H' }, () => {
                el.appendChild(canvas);
              });
            });
            setTimeout(() => { window.print(); }, 800);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`Imprimindo ${lots.length * copies} etiqueta(s)`);
  };

  const handleDownloadSVG = () => {
    if (lots.length === 0) return;
    const lot = lots[0];
    const svgEl = document.getElementById(`label-qr-preview-${lot.id}`);
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etiqueta-${lot.lot_number}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SVG baixado');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Imprimir Etiquetas ({lots.length} lote{lots.length > 1 ? 's' : ''})
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configurações e pré-visualização para impressão de etiquetas de lotes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Settings */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tamanho da Etiqueta</Label>
              <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LABEL_CONFIGS).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cópias por lote</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Zoom Visualizador</Label>
              <div className="flex items-center gap-2 pt-1">
                <Slider
                  value={[zoom]}
                  min={0.3}
                  max={1.5}
                  step={0.1}
                  onValueChange={([v]) => setZoom(v)}
                  className="w-full"
                />
                <span className="text-[10px] font-bold w-8">{Math.round(zoom * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="border border-border rounded-lg p-6 bg-muted/20 flex flex-col items-center justify-center min-h-[300px] overflow-auto">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-4">Pré-visualização em Tempo Real</Label>
            {lots.length > 0 ? (
              <div className="p-4 bg-background shadow-2xl rounded-lg border border-primary/20">
                <div
                  style={{
                    width: config.w * zoom,
                    height: config.h * zoom,
                    border: '1px dashed hsl(var(--border))',
                    borderRadius: 6,
                    display: 'flex',
                    flexDirection: config.w > config.h ? 'row' : 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: (config.w > config.h ? 6 : 12) * zoom,
                    gap: (config.w > config.h ? 12 : 8) * zoom,
                    fontFamily: "'Courier New', monospace",
                    transition: 'all 0.2s ease-out',
                  }}
                >
                  <QRCodeSVG
                    id={`label-qr-preview-${lots[0].id}`}
                    value={generateQrValue(lots[0])}
                    size={config.qrSize * zoom}
                    level="H"
                    includeMargin
                  />
                  <div style={{ textAlign: config.w > config.h ? 'left' : 'center', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ fontSize: `${14 * zoom}px` }} className="font-bold truncate">{lots[0].lot_number}</div>
                    <div style={{ fontSize: `${12 * zoom}px` }} className="text-muted-foreground truncate">{lots[0].product_name}</div>
                    <div style={{ fontSize: `${10 * zoom}px` }} className="text-muted-foreground font-medium">Qtd: {lots[0].quantity} un</div>
                    <div style={{ fontSize: `${10 * zoom}px` }} className="text-muted-foreground">
                      {format(parseDateOnly(lots[0].production_date) ?? new Date(), 'dd/MM/yyyy')}
                    </div>
                    {lots[0].expiration_date && (
                      <div style={{ fontSize: `${10 * zoom}px` }} className="text-destructive font-bold">
                        Val: {format(parseDateOnly(lots[0].expiration_date) ?? new Date(), 'dd/MM/yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum lote selecionado</p>
            )}
          </div>

          {lots.length > 1 && (
            <p className="text-xs text-muted-foreground text-center">
              Preview do primeiro lote. Serão impressas {lots.length * copies} etiqueta(s) no total.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleDownloadSVG} disabled={lots.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              SVG
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={lots.length === 0}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimir {lots.length * copies > 1 ? `(${lots.length * copies})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
