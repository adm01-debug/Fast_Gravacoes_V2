import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { OEEData } from '@/features/production/hooks/useOEE';

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

export interface OEEReportFilters {
  period: string;
  machineId: string;
  techniqueId: string;
  shift: string;
}

export function exportOeeCsv(data: OEEData): void {
  const csvData = data.byMachine.map(m => ({
    'Máquina': m.machineName,
    'Código': m.machineCode,
    'Técnica': m.techniqueName,
    'Disponibilidade (%)': m.availability,
    'Performance (%)': m.performance,
    'Qualidade (%)': m.quality,
    'OEE (%)': m.oee,
    'Gap vs Meta': (m.oee - 85).toFixed(1) + '%',
    'Total Peças': m.totalPiecesProduced,
    'Peças Boas': m.goodPieces,
    'Perdas': m.lostPieces
  }));

  const headers = Object.keys(csvData[0]).join(',');
  const rows = csvData.map(row => Object.values(row).map(v => typeof v === 'string' ? `"${v}"` : v).join(','));
  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `fast_gravacoes_oee_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportOeePdf(data: OEEData, filters: OEEReportFilters): Promise<void> {
  const { period, machineId, techniqueId, shift } = filters;
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();

  // Header and Logo simulation
  doc.setFillColor(232, 93, 58); // Premium Orange
  doc.rect(0, 0, 210, 40, 'F');

  doc.setFontSize(24);
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.text('FAST GRAVAÇÕES', 14, 25);
  doc.setFontSize(10);
  doc.text('GESTÃO DE GRAVAÇÃO - RELATÓRIO OEE', 14, 32);

  doc.setFontSize(16);
  doc.setTextColor(40);
  doc.text('Relatório Executivo de Performance', 14, 55);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Período: Últimos ${period} dias`, 14, 65);
  doc.text(`Filtros: Máquina: ${machineId === 'all' ? 'Todas' : machineId} | Técnica: ${techniqueId === 'all' ? 'Todas' : techniqueId} | Turno: ${shift === 'all' ? 'Todos' : shift}`, 14, 70);
  doc.text(`Gerado em: ${format(new Date(), 'PPP', { locale: ptBR })}`, 14, 75);

  // Summary Box
  doc.setDrawColor(230);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 85, 180, 40, 3, 3, 'FD');

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text('RESUMO GERAL DO PERÍODO', 20, 95);

  doc.setFontSize(28);
  doc.setTextColor(232, 93, 58);
  doc.text(`${data.overallOEE.toFixed(1)}%`, 20, 115);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('OEE GLOBAL', 20, 120);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`${data.overallAvailability.toFixed(1)}%`, 70, 110);
  doc.setFontSize(8);
  doc.text('DISPONIBILIDADE', 70, 115);

  doc.setFontSize(12);
  doc.text(`${data.overallPerformance.toFixed(1)}%`, 110, 110);
  doc.setFontSize(8);
  doc.text('PERFORMANCE', 110, 115);

  doc.setFontSize(12);
  doc.text(`${data.overallQuality.toFixed(1)}%`, 150, 110);
  doc.setFontSize(8);
  doc.text('QUALIDADE', 150, 115);

  const tableData = data.byMachine.map((m, idx) => [
    idx + 1,
    m.machineName,
    m.techniqueName,
    `${m.availability}%`,
    `${m.performance}%`,
    `${m.quality}%`,
    `${m.oee}%`,
    (m.oee - 85).toFixed(1) + '%',
    m.lostPieces.toLocaleString()
  ]);

  autoTable(doc, {
    startY: 135,
    head: [['#', 'Máquina', 'Técnica', 'Disp.', 'Perf.', 'Qual.', 'OEE', 'Gap', 'Perdas']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [232, 93, 58],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      6: { fontStyle: 'bold' },
      7: { fontStyle: 'bold' }
    }
  });

  // Action Plan section
  const finalY = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
  if (finalY < 250) {
    doc.setFontSize(14);
    doc.setTextColor(232, 93, 58);
    doc.text('Recomendações e Plano de Ação 10/10', 14, finalY);

    doc.setFontSize(9);
    doc.setTextColor(100);
    const actionY = finalY + 10;

    const recommendations = [];
    if (data.overallAvailability < 85) recommendations.push('• Implementar técnicas SMED para redução de setup nos Studios Serigrafia.');
    if (data.overallPerformance < 90) recommendations.push('• Calibrar velocidades nominais nos equipamentos de Gravação Laser.');
    if (data.overallQuality < 98) recommendations.push('• Revisar protocolos de cura UV para evitar micro-fissuras em substratos plásticos.');
    if (recommendations.length === 0) recommendations.push('• Performance de Classe Mundial atingida. Manter monitoramento preditivo autônomo.');

    recommendations.forEach((rec, i) => {
      doc.text(rec, 14, actionY + (i * 5));
    });
  }

  doc.save(`fast_gravacoes_oee_report_${new Date().toISOString().slice(0,10)}.pdf`);
}
