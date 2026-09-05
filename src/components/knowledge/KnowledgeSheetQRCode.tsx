import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer, QrCode } from 'lucide-react';
import { escapeHtml } from '@/lib/sanitize';

interface KnowledgeSheetQRCodeProps {
  sheetId: string;
  title: string;
}

export const KnowledgeSheetQRCode = ({ sheetId, title }: KnowledgeSheetQRCodeProps) => {
  const url = `${window.location.origin}/knowledge?sheet=${sheetId}`;

  const handleDownload = () => {
    const svg = document.getElementById(`kb-qr-${sheetId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ficha-${title.replace(/\s+/g, '-').toLowerCase()}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const svg = document.getElementById(`kb-qr-${sheetId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const safeTitle = escapeHtml(title);
    printWindow.document.write(`
      <html><head><title>QR - ${safeTitle}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif}
      h2{margin-bottom:16px;font-size:18px}p{color:#666;font-size:12px;margin-top:8px}</style></head>
      <body><h2>${safeTitle}</h2>${svgData}<p>Escaneie para acessar a ficha técnica</p></body></html>

    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card className="glass-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <QrCode className="h-4 w-4 text-primary" />
          QR Code da Ficha
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <div className="p-3 bg-background rounded-lg border border-border/30">
          <QRCodeSVG
            id={`kb-qr-${sheetId}`}
            value={url}
            size={120}
            level="M"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5 text-xs">
            <Download className="h-3 w-3" />
            SVG
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="h-3 w-3" />
            Imprimir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
