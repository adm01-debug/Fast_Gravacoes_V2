import { useState } from 'react';
import { toast } from 'sonner';
import { subDays, format } from 'date-fns';
import { exportProductionReport, exportLossesReport, exportDelaysReport } from '@/lib/pdfExport';

/**
 * Estrutura mínima assumida para linhas de job em exportações.
 * Mantida propositalmente permissiva para acomodar diferentes fontes (BI, KPI, jobs paginados).
 */
type ExportRow = Record<string, unknown>;

interface ExportData {
  periodJobsList?: unknown[];
  dailyTrend?: unknown[];
  statusDistribution?: unknown[];
}

interface ExtraExportData {
  jobsWithLosses?: unknown[];
  delayedJobsList?: unknown[];
}

const asNumber = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);
const asString = (v: unknown, fallback = ''): string => (v == null ? fallback : String(v));

const asExtra = (v: unknown): ExtraExportData => (v && typeof v === 'object' ? (v as ExtraExportData) : {});

export function useBIExport(biMetrics: ExportData) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (formatType: 'csv' | 'pdf', type: string, extraDataRaw?: unknown) => {
    const extraData = asExtra(extraDataRaw);
    setIsExporting(true);
    const dateRange = { start: subDays(new Date(), 30), end: new Date(), label: 'Últimos 30 dias' };

    try {
      if (formatType === 'csv') {
        toast.info(`Gerando CSV para ${type}...`);

        let dataToExport: ExportRow[] = [];
        const filename = `BI_Export_${type}_${format(new Date(), 'yyyyMMdd')}`;

        const listAll = (biMetrics.periodJobsList || []) as ExportRow[];

        if (type.includes('Taxa_Perda') || type.includes('Perdas')) {
          dataToExport = (extraData?.jobsWithLosses as ExportRow[] | undefined) || listAll.filter((j) => asNumber(j.lost_pieces) > 0);
        } else if (type.includes('Atrasos')) {
          dataToExport = (extraData?.delayedJobsList as ExportRow[] | undefined) || [];
        } else if (type.includes('Pedidos_A_Fazer')) {
          dataToExport = listAll.filter((j) => j.status === 'scheduled' || j.status === 'queue');
        } else if (type.includes('Producao_Atual')) {
          dataToExport = listAll.filter((j) => j.status === 'production');
        } else {
          dataToExport = listAll;
        }

        if (dataToExport.length === 0) {
          toast.warning('Nenhum dado encontrado para exportar.');
          return;
        }

        // Clean data for CSV — remove nested objects
        const cleanedData = dataToExport.map((item) => {
          const cleaned: Record<string, unknown> = {};
          Object.entries(item).forEach(([key, val]) => {
            if (typeof val !== 'object' || val === null) {
              cleaned[key] = val;
            }
          });
          return cleaned;
        });

        const headers = Object.keys(cleanedData[0]).join(',');
        const rows = cleanedData
          .map((obj) =>
            Object.values(obj)
              .map((val) => `"${String(val).replace(/"/g, '""')}"`)
              .join(','),
          )
          .join('\n');

        const blob = new Blob([`\uFEFF${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Exportação CSV de ${type} concluída.`);
      } else {
        toast.info(`Gerando PDF para ${type}...`);

        const listAll = (biMetrics.periodJobsList || []) as ExportRow[];

        if (type.includes('Taxa_Perda') || type.includes('Perdas')) {
          const losses = (extraData?.jobsWithLosses as ExportRow[] | undefined) || listAll.filter((j) => asNumber(j.lost_pieces) > 0);
          await exportLossesReport(losses as never, dateRange);
        } else if (type.includes('Atrasos')) {
          await exportDelaysReport((extraData?.delayedJobsList || []) as never, dateRange);
        } else {
          const jobs = listAll.map((j) => ({
            order_number: asString(j.order_number, `OS-${asString(j.id).slice(0, 5)}`),
            client: asString(j.client_name ?? j.client, 'Cliente'),
            product: asString(j.product_name ?? j.product, 'Produto'),
            status: asString(j.status),
            quantity: asNumber(j.quantity),
            produced_quantity: j.produced_quantity == null ? null : asNumber(j.produced_quantity),
            lost_pieces: j.lost_pieces == null ? null : asNumber(j.lost_pieces),
            scheduled_date: j.scheduled_date == null ? undefined : asString(j.scheduled_date),
          }));
          await exportProductionReport(jobs, dateRange, `Relatório: ${type.replace(/_/g, ' ')}`);
        }

        toast.success(`Relatório PDF de ${type} gerado com sucesso.`);
      }
    } catch {
      toast.error('Falha ao gerar exportação.');
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, handleExport };
}
