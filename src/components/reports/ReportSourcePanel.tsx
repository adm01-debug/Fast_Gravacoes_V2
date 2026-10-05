import { subDays } from 'date-fns';
import { toast } from 'sonner';
import { ChevronRight, Clock, Filter, ListRestart, Mail, Save, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import type { Database } from '@/integrations/supabase/types';
import { REPORT_TABLES, STATUS_OPTIONS, TABLE_COLUMNS, type PublicTables } from '@/lib/reportBuilder';

type SavedTemplate = Database['public']['Tables']['report_templates']['Row'];

interface ReportSourcePanelProps {
  selectedTable: PublicTables;
  onTableChange: (table: PublicTables) => void;
  onColumnsChange: (columns: string[]) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  formatType: string;
  onFormatChange: (format: 'csv' | 'pdf' | 'excel') => void;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  savedTemplates: SavedTemplate[] | undefined;
  onSaveTemplate: () => void;
  isSavingTemplate: boolean;
}

export function ReportSourcePanel({ selectedTable, onTableChange, onColumnsChange, selectedStatus, onStatusChange, dateRange, onDateRangeChange, formatType, onFormatChange, templateName, onTemplateNameChange, savedTemplates, onSaveTemplate, isSavingTemplate }: ReportSourcePanelProps) {
  return (
    <>
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
                  <DateRangePicker date={dateRange} setDate={onDateRangeChange} />
                </div>

                {STATUS_OPTIONS[selectedTable] && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Filtrar por Status</Label>
                    <Select value={selectedStatus} onValueChange={onStatusChange}>
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
                  <Button variant="ghost" size="sm" className="w-full h-7 text-[9px] uppercase font-bold text-muted-foreground hover:text-primary" onClick={() => { onDateRangeChange({ from: subDays(new Date(), 30), to: new Date() }); onStatusChange('all'); }}>
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
                      onTableChange(tableId);
                      onColumnsChange(TABLE_COLUMNS[tableId] || []);
                      if (tableId === 'jobs') onStatusChange('finished');
                      else onStatusChange('all');
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
                      onTableChange('jobs');
                      onColumnsChange(['order_number', 'client', 'product', 'status', 'quantity', 'lost_pieces', 'created_at']);
                      onStatusChange('finished');
                      onDateRangeChange({ from: subDays(new Date(), 7), to: new Date() });
                      onFormatChange('pdf');
                      toast.success('Template "Performance Semanal" aplicado');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <p className="text-xs font-bold group-hover:text-primary transition-colors">Performance Semanal</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-medium">Jobs + Status + Perdas</p>
                  </button>
                  <button
                    onClick={() => {
                      onTableChange('inventory_items');
                      onColumnsChange(['name', 'category', 'current_stock', 'unit', 'location']);
                      onStatusChange('all');
                      onFormatChange('pdf');
                      toast.success('Template "Auditoria de Inventário" aplicado');
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <p className="text-xs font-bold group-hover:text-primary transition-colors">Auditoria de Inventário</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-medium">Estoque + Localização</p>
                  </button>
                  <button
                    onClick={() => {
                      onTableChange('maintenance_records');
                      onColumnsChange(['machine_id', 'status', 'start_time', 'end_time']);
                      onStatusChange('completed');
                      onFormatChange('pdf');
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
                       onChange={(e) => onTemplateNameChange(e.target.value)}
                     />
                   </div>
                   <Button
                     className="w-full h-8 text-[10px] uppercase font-black"
                     onClick={() => onSaveTemplate()}
                     disabled={!templateName || isSavingTemplate}
                   >
                     {isSavingTemplate ? <Clock className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
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
                          onTableChange(template.table_name as PublicTables);
                          onColumnsChange(template.columns as string[]);
                          onFormatChange(template.format_type as 'csv' | 'pdf' | 'excel');
                          const filters = template.filters as { status?: string } | null;
                          if (filters?.status) onStatusChange(filters.status);
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
                  <Select value={formatType} onValueChange={(v: 'csv' | 'pdf' | 'excel') => onFormatChange(v)}>
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
    </>
  );
}
