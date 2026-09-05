import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SPCParameter, SPCMeasurement } from '@/features/analytics/hooks/useSPC';

interface SPCCapability {
  cp: number;
  cpk: number;
  mean: number;
  stdDev: number;
  performance: string;
}

type JsPDFWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY: number };
  internal: jsPDF['internal'] & { getNumberOfPages: () => number };
};

export const exportSPCReport = async (parameter: SPCParameter, measurements: SPCMeasurement[], capability: SPCCapability | null) => {
  const doc = new jsPDF() as JsPDFWithAutoTable;
  const now = new Date();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(0, 51, 102);
  doc.text('Relatório de Controle Estatístico (SPC)', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${format(now, "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 28);
  doc.line(14, 32, 196, 32);

  // Parameter Details
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('1. Detalhes do Parâmetro', 14, 42);

  autoTable(doc, {
    startY: 46,
    head: [['Propriedade', 'Valor']],
    body: [
      ['Nome', parameter.name],
      ['Produto', parameter.product_name || 'N/A'],
      ['Unidade', parameter.unit],
      ['Valor Nominal (Target)', parameter.target_value.toString()],
      ['Limite de Especificação Superior (USL)', parameter.upper_spec_limit.toString()],
      ['Limite de Especificação Inferior (LSL)', parameter.lower_spec_limit.toString()],
      ['Limite de Controle Superior (UCL)', parameter.upper_control_limit?.toFixed(3) || 'Não calculado'],
      ['Limite de Controle Inferior (LCL)', parameter.lower_control_limit?.toFixed(3) || 'Não calculado'],
      ['Tamanho da Amostra', parameter.sample_size.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [0, 51, 102] },
  });

  // Capability Indices
  if (capability) {
    const finalY = doc.lastAutoTable?.finalY ?? 100;
    doc.text('2. Índices de Capabilidade (Cp/Cpk)', 14, finalY + 15);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Índice', 'Valor', 'Avaliação']],
      body: [
        ['Cp', capability.cp.toFixed(3), 'Potencial do processo'],
        ['Cpk', capability.cpk.toFixed(3), capability.performance],
        ['Média Geral', capability.mean.toFixed(3), ''],
        ['Desvio Padrão', capability.stdDev.toFixed(4), ''],
      ],
      theme: 'grid',
      headStyles: { fillColor: [102, 0, 102] },
    });
  }

  // Measurements Table
  doc.addPage();
  doc.text('3. Histórico de Medições (Últimas 50)', 14, 20);

  autoTable(doc, {
    startY: 26,
    head: [['Amostra', 'Data', 'Valores', 'Média', 'Amplitude', 'Status']],
    body: measurements.map(m => [
      m.sample_number,
      format(new Date(m.measured_at), 'dd/MM HH:mm'),
      m.values.join(', '),
      m.mean_value.toFixed(3),
      m.range_value.toFixed(3),
      m.is_in_control ? 'EM CONTROLE' : 'FORA DE CONTROLE'
    ]),
    headStyles: { fillColor: [0, 102, 51] },
    columnStyles: {
        5: { fontStyle: 'bold' }
    },
    didParseCell: (data) => {
        if (data.column.index === 5 && data.cell.text[0] === 'FORA DE CONTROLE') {
            data.cell.styles.textColor = [200, 0, 0];
        }
    }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`FAST GRAVAÇÕES MES - Página ${i} de ${pageCount}`, 14, 285);
  }

  doc.save(`Relatorio_SPC_${parameter.name.replace(/\s+/g, '_')}_${format(now, 'yyyyMMdd')}.pdf`);
};
