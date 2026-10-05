import { useRef, useState } from 'react';
import { Maximize2, Printer, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { escapeHtml } from '@/lib/sanitize';
import { InventoryItem } from '@/features/inventory';

export function BatchQRLabelModal({ open, onOpenChange, items }: { open: boolean, onOpenChange: (o: boolean) => void, items: InventoryItem[] }) {
  const [size, setSize] = useState(150);
  const [showText, setShowText] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    if (!win) return;
    // Build the print markup from data with explicit escaping instead of
    // serializing the live DOM (innerHTML) — a dangerouslySetInnerHTML
    // descendant added to the preview later would otherwise flow into the
    // popup unescaped. Only the library-generated QR <svg> is lifted from
    // the DOM; all text comes from escapeHtml().
    const qrSvgs = Array.from(content.querySelectorAll('svg'));
    const labels = items.map((item, i) => {
      const svg = qrSvgs[i]?.outerHTML ?? '';
      const text = showText
        ? `<p style="font-size:10px;font-weight:900;text-transform:uppercase;color:#000;line-height:1.1;margin:8px 0 0">${escapeHtml(item.name)}</p>
           <p style="font-size:8px;font-family:monospace;color:rgba(0,0,0,.6);margin:0">ID: ${escapeHtml(item.id.substring(0, 8).toUpperCase())}</p>`
        : '';
      return `<div class="label-item">${svg}${text}</div>`;
    }).join('');
    win.document.write('<html><head><title>Imprimir Lote</title><style>body { font-family: sans-serif; padding: 20px; } .label-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; } .label-item { border: 1px solid #ccc; padding: 10px; text-align: center; page-break-inside: avoid; }</style></head><body><div class="label-grid">');
    win.document.write(labels);
    win.document.write('</div></body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Impressão em Lote ({items.length} itens)
          </DialogTitle>
          <DialogDescription>Ajuste o layout e visualize as etiquetas antes de enviar para a impressora.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 overflow-hidden">
          <div className="md:col-span-1 space-y-6 p-1">
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Configurações</Label>
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span>Tamanho: {size}px</span></div>
                <Slider value={[size]} min={80} max={250} step={10} onValueChange={(v) => setSize(v[0])} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Exibir Nome/ID</Label>
                <Checkbox checked={showText} onCheckedChange={(v) => setShowText(!!v)} />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <p className="text-[10px] font-bold text-primary uppercase">Dica Industrial</p>
              <p className="text-[11px] text-muted-foreground">Use papel adesivo 100x100mm para melhor compatibilidade com o tamanho padrão.</p>
            </div>
          </div>

          <div className="md:col-span-3 bg-muted/30 rounded-xl border border-dashed flex flex-col overflow-hidden">
            <div className="p-2 border-b bg-background/50 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-muted-foreground px-2">Pré-visualização do Lote</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7"><Maximize2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div ref={printRef} className="grid grid-cols-2 gap-6">
                {items.map(item => (
                  <div key={item.id} className="label-item p-4 bg-white border-2 border-black rounded-lg flex flex-col items-center">
                    <QRCodeSVG value={JSON.stringify({ id: item.id, type: 'inventory' })} size={size} level="M" />
                    {showText && (
                      <div className="mt-2 text-center">
                        <p className="text-[10px] font-black uppercase text-black leading-tight">{item.name}</p>
                        <p className="text-[8px] font-mono text-black/60">ID: {item.id.substring(0, 8).toUpperCase()}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="gap-2" onClick={handlePrint}><Printer className="h-4 w-4" /> Imprimir Todas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
