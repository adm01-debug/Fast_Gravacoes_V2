import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/dateUtils';
import { OperatorProductivityMetrics } from '@/features/production';
import { OperatorGoal, calculateGoalProgress, GOAL_TYPE_LABELS, GoalType } from '@/features/production';

// Extend jsPDF type to include lastAutoTable from jspdf-autotable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
}

interface ProductivityReportData {
  operators: OperatorProductivityMetrics[];
  goals: OperatorGoal[];
  period: string;
  overallStats: {
    averageEfficiency: number;
    totalJobsCompleted: number;
    totalPiecesProduced: number;
    averageLossRate: number;
  };
}

export function generateProductivityReport(data: ProductivityReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Produtividade', margin, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`, margin, 35);
  doc.text(`Período: ${data.period}`, pageWidth - margin - 50, 35);

  yPosition = 55;

  // Overall Statistics Section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo Geral', margin, yPosition);
  yPosition += 10;

  // Stats cards
  const statsData = [
    ['Operadores Ativos', `${data.operators.filter(o => o.isActive).length}`, 'Total cadastrados:', `${data.operators.length}`],
    ['Eficiência Média', `${data.overallStats.averageEfficiency.toFixed(1)}%`, 'Baseada em qualidade e tempo', ''],
    ['Jobs Concluídos', data.overallStats.totalJobsCompleted.toLocaleString(), 'Total de todos os operadores', ''],
    ['Taxa de Perda', `${data.overallStats.averageLossRate.toFixed(1)}%`, 'Índice de refugo geral', ''],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Métrica', 'Valor', 'Detalhe', '']],
    body: statsData,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 60 },
      3: { cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
  });

  yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;

  // Operators Table
  checkPageBreak(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Desempenho por Operador', margin, yPosition);
  yPosition += 8;

  const operatorsTableData = data.operators
    .filter(o => o.isActive)
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
    .map((op, index) => [
      `${index + 1}º`,
      op.operatorName,
      `${op.efficiencyScore.toFixed(1)}%`,
      op.totalJobsCompleted.toString(),
      op.totalPiecesProduced.toLocaleString(),
      `${op.lossRate.toFixed(1)}%`,
      `${op.productionVelocity.toFixed(1)}/h`,
    ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'Operador', 'Eficiência', 'Jobs', 'Peças', 'Perda', 'Veloc.']],
    body: operatorsTableData,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 50 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 20, halign: 'center' },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      // Color code efficiency column
      if (data.column.index === 2 && data.section === 'body') {
        const value = parseFloat(data.cell.text[0]);
        if (value >= 80) {
          data.cell.styles.textColor = [22, 163, 74]; // green
        } else if (value >= 60) {
          data.cell.styles.textColor = [234, 179, 8]; // yellow
        } else {
          data.cell.styles.textColor = [220, 38, 38]; // red
        }
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;

  // Goals Section
  if (data.goals.length > 0) {
    checkPageBreak(60);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Metas e Progresso', margin, yPosition);
    yPosition += 8;

    // Group goals by period
    const goalsByPeriod: Record<string, OperatorGoal[]> = {};
    data.goals.forEach(goal => {
      const periodKey = `${goal.period_start} - ${goal.period_end}`;
      if (!goalsByPeriod[periodKey]) {
        goalsByPeriod[periodKey] = [];
      }
      goalsByPeriod[periodKey].push(goal);
    });

    Object.entries(goalsByPeriod).forEach(([period, periodGoals]) => {
      checkPageBreak(40);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(`Período: ${format(parseDateOnly(period.split(' - ')[0]), 'dd/MM/yyyy')} - ${format(parseDateOnly(period.split(' - ')[1]), 'dd/MM/yyyy')}`, margin, yPosition);
      yPosition += 6;

      const goalsTableData = periodGoals.map(goal => {
        const operator = data.operators.find(o => o.operatorId === goal.operator_id);
        let currentValue = 0;
        if (operator) {
          switch (goal.goal_type) {
            case 'efficiency': currentValue = operator.efficiencyScore; break;
            case 'jobs_completed': currentValue = operator.totalJobsCompleted; break;
            case 'pieces_produced': currentValue = operator.totalPiecesProduced; break;
            case 'loss_rate': currentValue = operator.lossRate; break;
          }
        }
        const progress = calculateGoalProgress(goal, currentValue);
        const formatValue = (val: number, type: string) => {
          if (type === 'efficiency' || type === 'loss_rate') return `${val.toFixed(1)}%`;
          return val.toLocaleString();
        };

        return [
          operator?.operatorName || 'N/A',
          GOAL_TYPE_LABELS[goal.goal_type as GoalType],
          formatValue(goal.target_value, goal.goal_type),
          formatValue(currentValue, goal.goal_type),
          `${progress.progress_percentage.toFixed(0)}%`,
          progress.is_achieved ? '✓ Atingida' : 'Em andamento',
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Operador', 'Tipo de Meta', 'Meta', 'Atual', 'Progresso', 'Status']],
        body: goalsTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 28, halign: 'center' },
        },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
          // Color status column
          if (data.column.index === 5 && data.section === 'body') {
            if (data.cell.text[0].includes('✓')) {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          // Color progress column
          if (data.column.index === 4 && data.section === 'body') {
            const value = parseFloat(data.cell.text[0]);
            if (value >= 100) {
              data.cell.styles.textColor = [22, 163, 74];
            } else if (value >= 75) {
              data.cell.styles.textColor = [234, 179, 8];
            } else if (value < 50) {
              data.cell.styles.textColor = [220, 38, 38];
            }
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      yPosition = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10;
    });

    // Goals Summary
    checkPageBreak(40);
    const achievedGoals = data.goals.filter(goal => {
      const operator = data.operators.find(o => o.operatorId === goal.operator_id);
      if (!operator) return false;
      let currentValue = 0;
      switch (goal.goal_type) {
        case 'efficiency': currentValue = operator.efficiencyScore; break;
        case 'jobs_completed': currentValue = operator.totalJobsCompleted; break;
        case 'pieces_produced': currentValue = operator.totalPiecesProduced; break;
        case 'loss_rate': currentValue = operator.lossRate; break;
      }
      return calculateGoalProgress(goal, currentValue).is_achieved;
    });

    const achievementRate = data.goals.length > 0
      ? Math.round((achievedGoals.length / data.goals.length) * 100)
      : 0;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Resumo de Metas: ${achievedGoals.length}/${data.goals.length} atingidas (${achievementRate}% taxa de sucesso)`, margin, yPosition);
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'FAST GRAVAÇÕES | Qualidade + Velocidade',
      margin,
      pageHeight - 10
    );
  }

  // Save the PDF
  const fileName = `relatorio-produtividade-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(fileName);
}
