import { useState, useMemo } from 'react';
import { Database, Json } from '@/integrations/supabase/types';

import { ReportSourcePanel } from '@/components/reports/ReportSourcePanel';
import { ReportConfigPanel } from '@/components/reports/ReportConfigPanel';
import { REPORT_TABLES, TABLE_FILTER_FIELDS, STATUS_OPTIONS, TABLE_COLUMNS, type PublicTables } from '@/lib/reportBuilder';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Download,
  Settings2,
  Table2,
  CheckCircle2,
  ChevronRight,
  Filter,
  BarChart3,
  LayoutDashboard,
  FileDown,
  Clock,
  Search,
  Calendar,
  Save,
  Trash2,
  Share2,
  FileCheck,
  Zap,
  Info,
  Mail,
  ListRestart
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { downloadWorkbook, objectsToRows } from '@/lib/excel';

interface ReportFilters {
  status: string;
  dateRange?: DateRange;
}


export default function ReportBuilderPage() {
  const [selectedTable, setSelectedTable] = useState<PublicTables>('jobs');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(TABLE_COLUMNS.jobs);
  const [formatType, setFormatType] = useState<'csv' | 'pdf' | 'excel'>('csv');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [templateName, setTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const queryClient = useQueryClient();

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report-preview', selectedTable, selectedColumns, dateRange, selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from(selectedTable)
        .select(selectedColumns.join(','))
        .limit(10);

      const filterField = TABLE_FILTER_FIELDS[selectedTable];
      if (dateRange?.from && filterField) {
        query = query.gte(filterField, startOfDay(dateRange.from).toISOString());
      }
      if (dateRange?.to && filterField) {
        query = query.lte(filterField, endOfDay(dateRange.to).toISOString());
      }

      if (selectedStatus !== 'all' && STATUS_OPTIONS[selectedTable]) {
        // `selectedTable` is a union of tables; not all share a `status` column, so the
        // typed builder narrows the key to `never`. Runtime is guarded by STATUS_OPTIONS above.
        query = (query as unknown as { eq: (column: string, value: string) => typeof query }).eq('status', selectedStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const { data: savedTemplates } = useQuery({
    queryKey: ['saved-report-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('report_templates')
        .insert({
          name: templateName,
          table_name: selectedTable as string,
          columns: selectedColumns,
          format_type: formatType,
          user_id: user.id,
          filters: { status: selectedStatus, dateRange } as unknown as Json
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Template salvo com sucesso!');
      setTemplateName('');
      queryClient.invalidateQueries({ queryKey: ['saved-report-templates'] });
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao salvar template');
    }
  });

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      let query = supabase
        .from(selectedTable)
        .select(selectedColumns.join(','));

      const filterField = TABLE_FILTER_FIELDS[selectedTable];
      if (dateRange?.from && filterField) {
        query = query.gte(filterField, startOfDay(dateRange.from).toISOString());
      }
      if (dateRange?.to && filterField) {
        query = query.lte(filterField, endOfDay(dateRange.to).toISOString());
      }

      if (selectedStatus !== 'all' && STATUS_OPTIONS[selectedTable]) {
        // `selectedTable` is a union of tables; not all share a `status` column, so the
        // typed builder narrows the key to `never`. Runtime is guarded by STATUS_OPTIONS above.
        query = (query as unknown as { eq: (column: string, value: string) => typeof query }).eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info('Nenhum dado encontrado para exportação');
        return;
      }

      if (formatType === 'csv') {
        const header = selectedColumns.join(',');
        const rows = data.map(row =>
          selectedColumns.map(col => {
            const val = row[col as keyof typeof row];
            return val === null ? '' : `"${String(val).replace(/"/g, '""')}"`;
          }).join(',')
        );
        const csv = [header, ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_${selectedTable}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
      } else if (formatType === 'pdf') {
        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');
        const doc = new jsPDF();

        // Custom Header
        doc.setFillColor(14, 165, 233);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO', 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`QUALIDADE + VELOCIDADE | MÓDULO: ${selectedTable.replace(/_/g, ' ').toUpperCase()}`, 105, 30, { align: 'center' });

        doc.setFontSize(18);
        doc.setTextColor(14, 165, 233); // Primary color
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 48);

        if (dateRange?.from) {
          doc.text(`Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : '---'}`, 14, 53);
        }

        const tableBody = data.map(row => selectedColumns.map(col => {
           const val = row[col as keyof typeof row];
           if (col.includes('created_at') || col.includes('time')) {
             try { return format(parseISO(String(val)), 'dd/MM/yy HH:mm'); } catch { return String(val || '-'); }
           }
           return String(val || '-');
        }));

        autoTable(doc, {
          startY: 60,
          head: [selectedColumns.map(c => c.replace(/_/g, ' ').toUpperCase())],
          body: tableBody,
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [14, 165, 233] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { bottom: 20 },
          didDrawPage: (data) => {
            // Footer
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${data.pageNumber} de ${pageCount} - FAST GRAVAÇÕES Industrial Intelligence`, 105, 285, { align: 'center' });
          }
        });

        doc.save(`relatorio_${selectedTable}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      } else if (formatType === 'excel') {
        await downloadWorkbook(
          [{ name: 'Relatório', rows: objectsToRows(data as unknown as Array<Record<string, unknown>>) }],
          `relatorio_${selectedTable}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        );
      }

      toast.success(`${data.length} registros exportados!`);
    } catch (error) {

      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
        <Breadcrumbs />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl text-title font-black flex items-center gap-3 tracking-tighter uppercase">
              <FileDown className="h-8 w-8 text-primary" />
              FAST GRAVAÇÕES - GESTÃO DE GRAVAÇÃO
            </h1>
            <p className="text-muted-foreground mt-1 font-black uppercase tracking-widest text-xs opacity-70">QUALIDADE + VELOCIDADE</p>
          </div>
          <Button
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            onClick={handleExport}
            disabled={isGenerating || selectedColumns.length === 0}
          >
            {isGenerating ? <Clock className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar Relatório
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <ReportSourcePanel
            selectedTable={selectedTable}
            onTableChange={setSelectedTable}
            onColumnsChange={setSelectedColumns}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            formatType={formatType}
            onFormatChange={setFormatType}
            templateName={templateName}
            onTemplateNameChange={setTemplateName}
            savedTemplates={savedTemplates}
            onSaveTemplate={() => saveTemplateMutation.mutate()}
            isSavingTemplate={saveTemplateMutation.isPending}
          />

          <ReportConfigPanel
            selectedTable={selectedTable}
            selectedColumns={selectedColumns}
            onToggleColumn={toggleColumn}
            reportData={reportData as Record<string, unknown>[] | undefined}
            isLoading={isLoading}
          />
        </div>
      </div>
    </MainLayout>
  );
}
