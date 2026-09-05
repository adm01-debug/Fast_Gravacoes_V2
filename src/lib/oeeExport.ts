import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { sanitizeCsvCell } from '@/lib/csvSafety';

interface OEEMachineRow {
  machineName: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

interface OEETableData {
  byMachine: OEEMachineRow[];
}

type JsPDFWithAutoTable = jsPDF & {
  autoTable: (options: Record<string, unknown>) => void;
};

export const exportOEETabledData = (data: OEETableData, formatType: 'pdf' | 'csv') => {
  const fileName = `OEE_Report_${format(new Date(), 'yyyy-MM-dd_HHmm')}`;

  const headers: string[][] = [['Máquina', 'Disponibilidade (%)', 'Performance (%)', 'Qualidade (%)', 'OEE (%)']];
  const body: string[][] = data.byMachine.map((m) => [
    m.machineName,
    m.availability.toFixed(1),
    m.performance.toFixed(1),
    m.quality.toFixed(1),
    m.oee.toFixed(1),
  ]);
  // machineName is free-text (admin-editable) — the other columns are
  // always formatted numbers and need no sanitizing.
  const csvBody: string[][] = body.map(([machineName, ...rest]) => [
    `"${sanitizeCsvCell(machineName).replace(/"/g, '""')}"`,
    ...rest,
  ]);

  if (formatType === 'pdf') {
    const doc = new jsPDF() as JsPDFWithAutoTable;
    doc.text('Relatório Global de OEE', 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);

    doc.autoTable({
      startY: 30,
      head: headers,
      body: body,
      theme: 'grid',
      headStyles: { fillStyle: '#0ea5e9' },
    });

    doc.save(`${fileName}.pdf`);
  } else {
    const csvRows = [
      headers[0].join(','),
      ...csvBody.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
