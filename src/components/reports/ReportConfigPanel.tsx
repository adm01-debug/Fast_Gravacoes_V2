import { Clock, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TABLE_COLUMNS, type PublicTables } from '@/lib/reportBuilder';

interface ReportConfigPanelProps {
  selectedTable: PublicTables;
  selectedColumns: string[];
  onToggleColumn: (col: string) => void;
  reportData: Record<string, unknown>[] | undefined;
  isLoading: boolean;
}

export function ReportConfigPanel({ selectedTable, selectedColumns, onToggleColumn, reportData, isLoading }: ReportConfigPanelProps) {
  return (
    <>
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
                      onClick={() => onToggleColumn(col)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleColumn(col); } }}
                    >
                      <Checkbox
                        id={col}
                        checked={selectedColumns.includes(col)}
                        onCheckedChange={() => onToggleColumn(col)}
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
    </>
  );
}
