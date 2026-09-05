import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { forwardRef } from "react";
import { escapeHtml } from "@/lib/sanitize";

interface JobQRCodeProps {
  jobId: string;
  orderNumber: string;
  product: string;
  client: string;
  size?: number;
}

export const JobQRCode = forwardRef<HTMLDivElement, JobQRCodeProps>(({
  jobId,
  orderNumber,
  product,
  client,
  size = 150
}, ref) => {
  const qrValue = `${window.location.origin}/track?q=${orderNumber}`;

  const handleDownload = () => {
    const svg = document.getElementById(`qr-${jobId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${orderNumber}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svg = document.getElementById(`qr-${jobId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    const safeOrderNumber = escapeHtml(orderNumber);
    const safeProduct = escapeHtml(product);
    const safeClient = escapeHtml(client);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${safeOrderNumber}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: system-ui, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
              border: 2px dashed #ccc;
              border-radius: 8px;
            }
            h2 { margin: 0 0 8px 0; font-size: 18px; }
            p { margin: 4px 0; color: #666; font-size: 14px; }
            svg { margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>OS: ${safeOrderNumber}</h2>
            <p>${safeProduct}</p>
            <p>${safeClient}</p>
            ${svgData}
            <p style="font-size: 12px; color: #999;">Escaneie para iniciar produção</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div ref={ref}>
      <Card className="w-fit">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">QR Code</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <div className="p-3 bg-white rounded-lg">
            <QRCodeSVG
              id={`qr-${jobId}`}
              value={qrValue}
              size={size}
              level="M"
              includeMargin={false}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            OS: {orderNumber}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="h-3 w-3 mr-1" />
              Baixar
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="h-3 w-3 mr-1" />
              Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

JobQRCode.displayName = "JobQRCode";


