import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/dateUtils';
import type { ExecutiveKPIs, DateRange } from '@/features/analytics/hooks/useExecutiveDashboard';


interface jsPDFWithAutoTable {
  lastAutoTable: { finalY: number };
}

export interface LossJobRow {
  id: string;
  order_number?: string | null;
  product_name?: string | null;
  lost_pieces: number;
  loss_reason?: string | null;
}

export interface DelayJobRow {
  id: string;
  order_number?: string | null;
  product_name?: string | null;
  delay_time?: string | null;
  responsible_name?: string | null;
  status?: string | null;
}

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  dateRange: DateRange;
  kpis: ExecutiveKPIs;
  includeCharts?: boolean;
  companyName?: string;
  logo?: string;
}

export async function exportExecutiveDashboardPDF(options: PDFExportOptions): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const { title, subtitle, dateRange, kpis, companyName = 'FAST GRAVAÇÕES' } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Header
  doc.setFillColor(15, 23, 42); // Dark blue
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, margin, 20);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(title, margin, 30);

  // Date range
  doc.setFontSize(10);
  const dateText = `Período: ${format(dateRange.start, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.end, 'dd/MM/yyyy', { locale: ptBR })}`;
  doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), 30);

  yPosition = 50;

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Section: Production KPIs
  yPosition = addSection(doc, 'Indicadores de Produção', yPosition, margin);

  const productionData = [
    ['Jobs Concluídos', kpis.totalJobsCompleted.toString()],
    ['Jobs em Andamento', kpis.totalJobsInProgress.toString()],
    ['Peças Produzidas', kpis.totalPiecesProduced.toLocaleString('pt-BR')],
    ['Peças Perdidas', kpis.totalPiecesLost.toLocaleString('pt-BR')],
    ['Eficiência de Produção', `${kpis.productionEfficiency.toFixed(1)}%`],
    ['Tempo Médio de Ciclo', `${kpis.averageCycleTime.toFixed(0)} min`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Indicador', 'Valor']],
    body: productionData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10 },
  });

  yPosition = (doc as unknown as jsPDFWithAutoTable).lastAutoTable.finalY + 10;

  // Section: Machine KPIs
  yPosition = addSection(doc, 'Indicadores de Máquinas', yPosition, margin);

  const machineData = [
    ['Total de Máquinas', kpis.totalMachines.toString()],
    ['Máquinas Ativas', kpis.activeMachines.toString()],
    ['Taxa de Utilização', `${kpis.machineUtilization.toFixed(1)}%`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Indicador', 'Valor']],
    body: machineData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10 },
  });

  yPosition = (doc as unknown as jsPDFWithAutoTable).lastAutoTable.finalY + 10;

  // Section: Quality KPIs
  yPosition = addSection(doc, 'Indicadores de Qualidade', yPosition, margin);

  const qualityData = [
    ['Taxa de Qualidade', `${kpis.qualityRate.toFixed(1)}%`],
    ['Taxa de Defeitos', `${kpis.defectRate.toFixed(2)}%`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Indicador', 'Valor']],
    body: qualityData,
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10 },
  });

  yPosition = (doc as unknown as jsPDFWithAutoTable).lastAutoTable.finalY + 10;

  // Check if we need a new page
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = margin;
  }

  // Section: Maintenance KPIs
  yPosition = addSection(doc, 'Indicadores de Manutenção', yPosition, margin);

  const maintenanceData = [
    ['Manutenções Concluídas', kpis.maintenanceCompleted.toString()],
    ['Manutenções Pendentes', kpis.maintenancePending.toString()],
    ['Downtime Médio', `${kpis.averageDowntime.toFixed(0)} min`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Indicador', 'Valor']],
    body: maintenanceData,
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10 },
  });

  yPosition = (doc as unknown as jsPDFWithAutoTable).lastAutoTable.finalY + 10;

  // Section: Top Operators
  if (kpis.topOperators.length > 0) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    yPosition = addSection(doc, 'Top Operadores', yPosition, margin);

    const operatorData = kpis.topOperators.map((op, i) => [
      `${i + 1}º`,
      op.name,
      op.produced.toLocaleString('pt-BR'),
      `${op.efficiency.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Posição', 'Operador', 'Peças Produzidas', 'Eficiência']],
      body: operatorData,
      theme: 'striped',
      headStyles: { fillColor: [236, 72, 153] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
    });

    yPosition = (doc as unknown as jsPDFWithAutoTable).lastAutoTable.finalY + 10;
  }

  // Section: Technique Distribution
  if (kpis.techniqueDistribution.length > 0) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    yPosition = addSection(doc, 'Distribuição por Técnica', yPosition, margin);

    const techniqueData = kpis.techniqueDistribution.map(t => [
      t.technique,
      t.count.toString(),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Técnica', 'Quantidade de Jobs']],
      body: techniqueData,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
    });

    yPosition = (doc as unknown as jsPDFWithAutoTable).lastAutoTable.finalY + 10;
  }

  // Section: Machine Performance
  if (kpis.machinePerformance.length > 0) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    yPosition = addSection(doc, 'Performance das Máquinas', yPosition, margin);

    const performanceData = kpis.machinePerformance.map(m => [
      m.machine,
      `${m.utilization.toFixed(1)}%`,
      `${m.oee.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Máquina', 'Utilização', 'OEE']],
      body: performanceData,
      theme: 'striped',
      headStyles: { fillColor: [20, 184, 166] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} | Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const filename = `relatorio-executivo-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(filename);
}

function addSection(doc: InstanceType<typeof import('jspdf').default>, title: string, yPosition: number, margin: number): number {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(title, margin, yPosition);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  return yPosition + 8;
}

// Export production report
export async function exportProductionReport(
  jobs: Array<{ order_number: string; client: string; product: string; status: string; quantity: number; produced_quantity?: number | null; lost_pieces?: number | null; scheduled_date?: string | null }>,
  dateRange: DateRange,
  title = 'Relatório de Produção'
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 18);

  const dateText = `${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`;
  doc.setFontSize(10);
  doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), 18);

  // Jobs table
  doc.setTextColor(0, 0, 0);

  const jobsData = jobs.map(job => [
    job.order_number,
    job.client,
    job.product,
    job.quantity.toLocaleString('pt-BR'),
    (job.produced_quantity || 0).toLocaleString('pt-BR'),
    (job.lost_pieces || 0).toLocaleString('pt-BR'),
    job.status,
    job.scheduled_date ? format(parseDateOnly(job.scheduled_date) ?? new Date(), 'dd/MM/yyyy') : '-',
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['OS', 'Cliente', 'Produto', 'Qtd', 'Produzido', 'Perdas', 'Status', 'Data']],
    body: jobsData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 40 },
      2: { cellWidth: 50 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25 },
      7: { cellWidth: 25 },
    },
  });

  const filename = `relatorio-producao-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(filename);
}

export async function exportLossesReport(
  jobs: LossJobRow[],
  dateRange: { start: Date; end: Date },
  title = 'Relatório de Perdas e Qualidade'
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  doc.setFillColor(239, 68, 68); // Red for losses
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 18);

  const dateText = `${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`;
  doc.setFontSize(10);
  doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), 18);

  // Losses table
  doc.setTextColor(0, 0, 0);

  const lossesData = jobs.map(job => [
    job.order_number || job.id.slice(0, 8),
    job.product_name || 'Produto',
    job.lost_pieces.toString(),
    job.loss_reason || 'Não informado',
    `R$ ${(job.lost_pieces * 15.5).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['OS', 'Produto', 'Qtd Perdas', 'Motivo', 'Custo Est.']],
    body: lossesData,
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10 },
  });

  const filename = `relatorio-perdas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(filename);
}

export async function exportDelaysReport(
  jobs: DelayJobRow[],
  dateRange: { start: Date; end: Date },
  title = 'Relatório de Atrasos e Produtividade'
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header
  doc.setFillColor(245, 158, 11); // Amber for delays
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 18);

  const dateText = `${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`;
  doc.setFontSize(10);
  doc.text(dateText, pageWidth - margin - doc.getTextWidth(dateText), 18);

  // Delays table
  doc.setTextColor(0, 0, 0);

  const delaysData = jobs.map(job => [
    job.order_number || job.id.slice(0, 8),
    job.product_name || 'Produto',
    job.delay_time || 'Atrasado',
    job.responsible_name || 'Não atribuído',
    job.status === 'delayed' ? 'Crítico' : 'Alerta',
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['OS', 'Produto', 'Atraso', 'Responsável', 'Severidade']],
    body: delaysData,
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11] },
    margin: { left: margin, right: margin },
    styles: { fontSize: 10 },
  });

  const filename = `relatorio-atrasos-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(filename);
}
