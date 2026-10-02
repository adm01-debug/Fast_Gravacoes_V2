import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardExport() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportImage = async () => {
    setIsExporting(true);
    try {
      const dashboard = document.querySelector('main');
      if (!dashboard) throw new Error('Dashboard element not found');

      // Hide elements that shouldn't be in the export
      const elementsToHide = document.querySelectorAll('.no-export');
      elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none');

      const canvas = await html2canvas(dashboard, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#000000', // Match dashboard theme
      });

      // Restore hidden elements
      elementsToHide.forEach(el => (el as HTMLElement).style.display = '');

      const link = document.createElement('a');
      link.download = `dashboard-fastgravacoes-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Dashboard exportado como imagem');
    } catch (error) {

      toast.error('Erro ao exportar dashboard');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const dashboard = document.querySelector('main');
      if (!dashboard) throw new Error('Dashboard element not found');

      const elementsToHide = document.querySelectorAll('.no-export');
      elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none');

      const canvas = await html2canvas(dashboard, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#000000',
      });

      elementsToHide.forEach(el => (el as HTMLElement).style.display = '');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`dashboard-fastgravacoes-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Dashboard exportado como PDF');
    } catch (error) {

      toast.error('Erro ao exportar dashboard');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Exportar dashboard"
          className="h-8 gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 no-export"
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 text-primary" />
          )}
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-primary/20">
        <DropdownMenuItem onClick={handleExportImage} className="gap-2">
          <ImageIcon className="h-4 w-4" />
          Imagem (PNG)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} className="gap-2">
          <FileText className="h-4 w-4" />
          Documento (PDF)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
