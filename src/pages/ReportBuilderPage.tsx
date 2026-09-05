import { useState, useMemo } from 'react';
import { Database, Json } from '@/integrations/supabase/types';

type PublicTables = keyof Database['public']['Tables'];
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


const REPORT_TABLES = [
  { id: 'jobs', name: 'Jobs e Produção', icon: FileText },
  { id: 'machines', name: 'Máquinas e Ativos', icon: LayoutDashboard },
  { id: 'profiles', name: 'Operadores e Equipe', icon: BarChart3 },
  { id: 'inventory_items', name: 'Estoque e Materiais', icon: Table2 },
  { id: 'maintenance_records', name: 'Manutenção e TPM', icon: Settings2 },
];

const TABLE_COLUMNS: Record<string, string[]> = {
  jobs: ['id', 'order_number', 'client', 'product', 'status', 'quantity', 'produced_quantity', 'lost_pieces', 'created_at'],
  machines: ['id', 'code', 'name', 'technique_id', 'is_active', 'created_at'],
  profiles: ['id', 'display_name', 'full_name', 'avatar_url', 'created_at'],
  inventory_items: ['id', 'name', 'category', 'current_stock', 'unit', 'min_stock_level'],
  maintenance_records: ['id', 'machine_id', 'status', 'maintenance_type_id', 'start_time', 'end_time'],
};

const TABLE_FILTER_FIELDS: Record<string, string> = {
  jobs: 'created_at',
  machines: 'created_at',
  profiles: 'created_at',
  inventory_items: 'created_at',
  maintenance_records: 'start_time',
};

const STATUS_OPTIONS: Record<string, string[]> = {
  jobs: ['finished', 'production', 'scheduled', 'queue', 'delayed'],
  maintenance_records: ['pending', 'in_progress', 'completed', 'cancelled'],
};


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
          {/* Step 1: Source Selection */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                   <Filter className="h-3 w-3 text-primary" />
                   Filtros Inteligentes
                 </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Período de Dados</Label>
                  <DateRangePicker date={dateRange} setDate={setDateRange} />
                </div>

                {STATUS_OPTIONS[selectedTable] && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Filtrar por Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="h-8 text-xs font-bold bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        {STATUS_OPTIONS[selectedTable].map(s => (
                          <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="pt-2">
                  <Button variant="ghost" size="sm" className="w-full h-7 text-[9px] uppercase font-bold text-muted-foreground hover:text-primary" onClick={() => { setDateRange({ from: subDays(new Date(), 30), to: new Date() }); setSelectedStatus('all'); }}>
                    Resetar Filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3">
                 <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">1</span>
                   Fonte de Dados
                 </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {REPORT_TABLES.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => {
                      const tableId = table.id as PublicTables;
                      setSelectedTable(tableId);
                      setSelectedColumns(TABLE_COLUMNS[tableId] || []);
                      if (tableId === 'jobs') setSelectedStatus('finished');
                      else setSelectedStatus('all');
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                      selectedTable === table.id
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${selectedTable === table.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors'}`}>
                      <table.icon className="h-4 w-4" />
                    </div>
                    <span className={`text-sm font-bold ${selectedTable === table.id ? 'text-primary' : 'text-muted-foreground'}`}>{table.name}</span>
                    <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${selectedTable === table.id ? 'rotate-90 text-primary' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
               <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                   <Zap className="h-3 w-3 text-primary" />
                   Templates Oficiais
                 </CardTitle>
               </CardHeader>
               <CardContent className="pt-4 space-y-2">
                  <button
                    onClick={() => {
                      setSelectedTable('jobs');
                      setSelectedColumns(['order_number', 'client', 'product', 'status', 'quantity', 'lost_pieces', 'created_at']);
                      setSelectedStatus('finished');
                      setDateRange({ from: subDays(new Date(), 7), to: new Date() });
                      setFormatType('pdf');
                      toast.success('Template "Performance Semanal" aplicado');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <p className="text-xs font-bold group-hover:text-primary transition-colors">Performance Semanal</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-medium">Jobs + Status + Perdas</p>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTable('inventory_items');
                      setSelectedColumns(['name', 'category', 'current_stock', 'unit', 'location']);
                      setSelectedStatus('all');
                      setFormatType('pdf');
                      toast.success('Template "Auditoria de Inventário" aplicado');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <p className="text-xs font-bold group-hover:text-primary transition-colors">Auditoria de Inventário</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-medium">Estoque + Localização</p>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTable('maintenance_records');
                      setSelectedColumns(['machine_id', 'status', 'start_time', 'end_time']);
                      setSelectedStatus('completed');
                      setFormatType('pdf');
                      toast.success('Template "SLA de Manutenção" aplicado');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <p className="text-xs font-bold group-hover:text-primary transition-colors">SLA de Manutenção</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-medium">Ativos + Tempo de Reparo</p>
                  </button>
               </CardContent>
            </Card>

             <Card className="glass-card border-primary/20 bg-primary/5">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Save className="h-3 w-3 text-primary" />
                    Salvar Configuração
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                   <div className="space-y-1.5">
                     <Label className="text-[9px] font-bold uppercase text-muted-foreground">Nome do Template</Label>
                     <Input
                       placeholder="Ex: Produtividade Mensal"
                       className="h-8 text-xs font-bold"
                       value={templateName}
                       onChange={(e) => setTemplateName(e.target.value)}
                     />
                   </div>
                   <Button
                     className="w-full h-8 text-[10px] uppercase font-black"
                     onClick={() => saveTemplateMutation.mutate()}
                     disabled={!templateName || saveTemplateMutation.isPending}
                   >
                     {saveTemplateMutation.isPending ? <Clock className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
                     Salvar Template
                   </Button>
                </CardContent>
             </Card>

             {savedTemplates && savedTemplates.length > 0 && (
               <Card className="glass-card">
                 <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                   <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                     <ListRestart className="h-3 w-3 text-primary" />
                     Meus Templates
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="pt-4 space-y-2 max-h-[200px] overflow-y-auto">
                    {savedTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTable(template.table_name as PublicTables);
                          setSelectedColumns(template.columns as string[]);
                          setFormatType(template.format_type as 'csv' | 'pdf' | 'excel');
                          const filters = template.filters as { status?: string } | null;
                          if (filters?.status) setSelectedStatus(filters.status);
                          toast.success(`Template "${template.name}" aplicado`);
                        }}
                        className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold group-hover:text-primary transition-colors">{template.name}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-medium">{template.table_name}</p>
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                 </CardContent>
               </Card>
             )}

             <Card className="glass-card border-indigo-500/20 bg-indigo-500/5">
                <CardHeader className="pb-3 border-b border-indigo-500/10">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-indigo-600">
                    <Mail className="h-3 w-3" />
                    Agendamento (SLA)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                   <p className="text-[10px] text-muted-foreground">Configure o envio automático deste relatório para seu e-mail.</p>
                   <Select disabled>
                     <SelectTrigger className="h-8 text-xs font-bold bg-background/50 border-indigo-500/20">
                       <SelectValue placeholder="Escolha a frequência" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="daily">Diário (08:00)</SelectItem>
                       <SelectItem value="weekly">Semanal (Segunda)</SelectItem>
                       <SelectItem value="monthly">Mensal (Dia 01)</SelectItem>
                     </SelectContent>
                   </Select>
                   <Button variant="outline" className="w-full h-8 text-[10px] uppercase font-black border-indigo-500/20 text-indigo-600" disabled>
                     Ativar Automação
                   </Button>
                </CardContent>
             </Card>

             <Card className="glass-card border-warning/20 bg-warning/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-warning">Formato de Saída</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={formatType} onValueChange={(v: 'csv' | 'pdf' | 'excel') => setFormatType(v)}>
                    <SelectTrigger className="bg-background/50 border-warning/20 text-warning font-bold h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (Excel, Google Sheets)</SelectItem>
                      <SelectItem value="pdf">PDF (Documento Oficial)</SelectItem>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
             </Card>
          </div>

          {/* Step 2: Configuration */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="glass-card">
              <CardHeader className="border-b border-border/50 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px]">2</span>
                      Configuração de Colunas
                    </CardTitle>
                    <CardDescription>Selecione as dimensões e métricas para o relatório</CardDescription>
                  </div>
                  <Badge variant="secondary" className="font-black">{selectedColumns.length} SELECIONADAS</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {TABLE_COLUMNS[selectedTable].map((col) => (
                    <div
                      key={col}
                      role="button"
                      tabIndex={0}
                      aria-label={`Alternar coluna ${col}`}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        selectedColumns.includes(col) ? 'bg-primary/5 border-primary/40 shadow-inner' : 'bg-background border-border/50 hover:border-primary/20'
                      }`}
                      onClick={() => toggleColumn(col)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleColumn(col); } }}
                    >
                      <Checkbox
                        id={col}
                        checked={selectedColumns.includes(col)}
                        onCheckedChange={() => toggleColumn(col)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={col}
                        className={`text-xs font-bold uppercase tracking-tight cursor-pointer ${selectedColumns.includes(col) ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        {col.replace(/_/g, ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card overflow-hidden">
               <CardHeader className="bg-muted/10 border-b border-border/50">
                 <div className="flex items-center justify-between">
                   <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                     <Search className="h-4 w-4 text-muted-foreground" />
                     Pré-visualização (10 primeiros registros)
                   </CardTitle>
                   {isLoading && <Clock className="h-4 w-4 animate-spin text-primary" />}
                 </div>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30">
                          {selectedColumns.map(col => (
                            <th key={col} className="text-left p-3 font-black uppercase tracking-tighter text-muted-foreground border-b border-border/50">{col.replace(/_/g, ' ')}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {reportData?.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/10 transition-colors">
                            {selectedColumns.map(col => (
                              <td key={col} className="p-3 font-medium text-muted-foreground truncate max-w-[200px]">
                                {String(row[col as keyof typeof row] || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {(!reportData || reportData.length === 0) && !isLoading && (
                          <tr>
                            <td colSpan={selectedColumns.length} className="p-8 text-center text-muted-foreground italic">Nenhum dado para exibir.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
