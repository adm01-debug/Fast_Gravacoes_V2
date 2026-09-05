import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, FileText, Table as TableIcon, Calendar, Filter, Activity, Archive } from 'lucide-react';
import JSZip from 'jszip';
import { useTPM } from '@/features/maintenance/hooks/useTPM';
import { useMTBFMTTR } from '@/features/production';
import { format, subDays } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}
import { downloadWorkbook, objectsToRows } from '@/lib/excel';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

export function TPMReports() {
  const { machines, records, maintenanceTypes } = useTPM();
  const [selectedMachineId, setSelectedMachineId] = useState<string>('all');
  const [period, setPeriod] = useState<string>('30');
  const { metrics, summary } = useMTBFMTTR(parseInt(period, 10));
  const [isGenerating, setIsGenerating] = useState(false);

  const getFilteredRecords = () => {
    let filtered = [...records];

    // Filter by machine
    if (selectedMachineId !== 'all') {
      filtered = filtered.filter(r => r.machine_id === selectedMachineId);
    }

    // Filter by period
    const startDate = subDays(new Date(), parseInt(period, 10));
    filtered = filtered.filter(r => new Date(r.started_at) >= startDate);

    return filtered;
  };

  const generatePDF = () => {
    setIsGenerating(true);
    try {
      const filteredRecords = getFilteredRecords();
      const doc = new jsPDF();
      const machineName = selectedMachineId === 'all' ? 'Todas as Máquinas' : machines.find(m => m.id === selectedMachineId)?.name;

      // Title
      doc.setFontSize(18);
      doc.text('Relatório de Manutenção TPM', 14, 22);

      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Máquina: ${machineName}`, 14, 30);
      doc.text(`Período: Últimos ${period} dias`, 14, 35);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 40);

      // Reliability Summary section
      if (selectedMachineId !== 'all') {
        const metric = metrics.find(m => m.machineId === selectedMachineId);
        if (metric) {
          doc.setFontSize(14);
          doc.setTextColor(0);
          doc.text('Métricas de Confiabilidade', 14, 52);
          doc.setFontSize(10);
          doc.text(`MTBF: ${metric.mtbf ? metric.mtbf.toFixed(1) + 'h' : 'N/A'}`, 14, 60);
          doc.text(`MTTR: ${metric.mttr ? metric.mttr.toFixed(1) + 'min' : 'N/A'}`, 60, 60);
          doc.text(`Disponibilidade: ${metric.availability.toFixed(1)}%`, 110, 60);
          doc.text(`Total de Falhas: ${metric.totalFailures}`, 160, 60);
        }
      } else {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Métricas Médias da Frota', 14, 52);
        doc.setFontSize(10);
        doc.text(`MTBF Médio: ${summary.averageMTBF ? summary.averageMTBF.toFixed(1) + 'h' : 'N/A'}`, 14, 60);
        doc.text(`MTTR Médio: ${summary.averageMTTR ? summary.averageMTTR.toFixed(1) + 'min' : 'N/A'}`, 60, 60);
        doc.text(`Disponibilidade Média: ${summary.averageAvailability.toFixed(1)}%`, 110, 60);
        doc.text(`Total de Falhas: ${summary.totalFailures}`, 160, 60);
      }

      // Table
      const tableData = filteredRecords.map(r => [
        format(new Date(r.started_at), 'dd/MM/yyyy'),
        r.machine?.name || 'N/A',
        maintenanceTypes.find(t => t.id === r.maintenance_type_id)?.name || r.maintenance_type_id,
        r.status === 'approved' ? 'Aprovada' : r.status === 'completed' ? 'Aguardando Revisão' : 'Em andamento',
        r.performed_by_name || 'N/A',
        `${r.downtime_minutes} min`,
        r.adjustment_parameters ? `Passadas: ${r.adjustment_parameters.squeegee_passes || '-'}\nPressão: ${r.adjustment_parameters.pressure || '-'}\nVelocidade: ${r.adjustment_parameters.speed || '-'}\nTemp: ${r.adjustment_parameters.temperature || '-'}` : '-'
      ]);

      (doc as jsPDFWithAutoTable).autoTable({
        startY: 70,
        head: [['Data', 'Máquina', 'Tipo', 'Status', 'Executado por', 'Downtime', 'Regulagem']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
        columnStyles: { 6: { cellWidth: 40 } }
      });

      doc.save(`relatorio-tpm-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Relatório PDF gerado com sucesso');
    } catch (error) {

      toast.error('Erro ao gerar PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateExcel = async () => {
    setIsGenerating(true);
    try {
      const filteredRecords = getFilteredRecords();

      // Performance metrics sheet
      let performanceData = [];
      if (selectedMachineId !== 'all') {
        const m = metrics.find(metric => metric.machineId === selectedMachineId);
        if (m) {
          performanceData.push({
            'Máquina': m.machineName,
            'MTBF (h)': m.mtbf,
            'MTTR (min)': m.mttr,
            'Disponibilidade (%)': m.availability,
            'Total Falhas': m.totalFailures
          });
        }
      } else {
        performanceData = metrics.map(m => ({
          'Máquina': m.machineName,
          'MTBF (h)': m.mtbf,
          'MTTR (min)': m.mttr,
          'Disponibilidade (%)': m.availability,
          'Total Falhas': m.totalFailures
        }));
      }

      // History data sheet
      const historyData = filteredRecords.map(r => ({
        'Data': format(new Date(r.started_at), 'dd/MM/yyyy HH:mm'),
        'Máquina': r.machine?.name || 'N/A',
        'Código Máquina': r.machine?.code || 'N/A',
        'Tipo Manutenção': maintenanceTypes.find(t => t.id === r.maintenance_type_id)?.name || r.maintenance_type_id,
        'Status': r.status === 'approved' ? 'Aprovada' : r.status === 'completed' ? 'Aguardando Revisão' : 'Em andamento',
        'Executado por': r.performed_by_name || 'N/A',
        'Downtime (min)': r.downtime_minutes,
        'Custo': r.total_cost,
        'Notas': r.notes || ''
      }));

      await downloadWorkbook(
        [
          { name: 'Métricas de Performance', rows: objectsToRows(performanceData) },
          { name: 'Histórico de Atividades', rows: objectsToRows(historyData) },
        ],
        `relatorio-tpm-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
      );

      toast.success('Relatório Excel gerado com sucesso');
    } catch (error) {

      toast.error('Erro ao gerar Excel');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateZIP = async () => {
    setIsGenerating(true);
    try {
      const filteredRecords = getFilteredRecords();
      const zip = new JSZip();
      const photosFolder = zip.folder("evidencias_fotograficas");

      // 1. Add CSV Data
      const headers = ['Data', 'Máquina', 'Tipo', 'Técnico', 'Status', 'Downtime', 'Custo', 'Notas'];
      const rows = filteredRecords.map(r => [
        format(new Date(r.started_at), 'dd/MM/yyyy HH:mm'),
        r.machine?.name || 'N/A',
        r.maintenance_type_id,
        r.performed_by_name || 'N/A',
        r.status,
        r.downtime_minutes,
        r.total_cost,
        r.notes || ''
      ]);

      const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
      zip.file("relatorio_execucoes.csv", csvContent);

      // 2. Fetch and add photos
      const recordsWithPhotos = filteredRecords.filter(r => r.photos && r.photos.length > 0);

      toast.info(`Processando ${recordsWithPhotos.length} registros com fotos...`);

      for (const record of recordsWithPhotos) {
        const recordFolder = photosFolder?.folder(`manutencao_${record.id.substring(0, 8)}`);
        for (let i = 0; i < record.photos.length; i++) {
          try {
            const response = await fetch(record.photos[i]);
            const blob = await response.blob();
            recordFolder?.file(`evidencia_${i + 1}.jpg`, blob);
          } catch {
            // Evidência individual indisponível: pula e continua montando o ZIP.
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `tpm_completo_${format(new Date(), 'yyyy-MM-dd')}.zip`);
      toast.success('Arquivo ZIP gerado com sucesso!');
    } catch (error) {

      toast.error('Erro ao gerar arquivo ZIP');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Relatórios de Manutenção
        </CardTitle>
        <CardDescription>
          Gere relatórios detalhados em PDF ou Excel para análise de desempenho e histórico.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Filter className="h-4 w-4" /> Máquina
            </Label>
            <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as máquinas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as máquinas</SelectItem>
                {machines.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Período
            </Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={generatePDF}
              disabled={isGenerating || records.length === 0}
            >
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={generateExcel}
              disabled={isGenerating || records.length === 0}
            >
              <TableIcon className="h-4 w-4" /> Excel
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={generateZIP}
              disabled={isGenerating || records.length === 0}
            >
              <Archive className="h-4 w-4" /> ZIP (com Fotos)
            </Button>
          </div>
        </div>

        {records.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg border border-border/50">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">MTBF</p>
              <p className="text-lg font-bold text-primary">
                {selectedMachineId === 'all'
                  ? (summary.averageMTBF ? summary.averageMTBF.toFixed(1) + 'h' : 'N/A')
                  : (metrics.find(m => m.machineId === selectedMachineId)?.mtbf?.toFixed(1) + 'h' || 'N/A')
                }
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">MTTR</p>
              <p className="text-lg font-bold text-orange-400">
                {selectedMachineId === 'all'
                  ? (summary.averageMTTR ? summary.averageMTTR.toFixed(1) + 'min' : 'N/A')
                  : (metrics.find(m => m.machineId === selectedMachineId)?.mttr?.toFixed(1) + 'min' || 'N/A')
                }
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Disponibilidade</p>
              <p className="text-lg font-bold text-success">
                {selectedMachineId === 'all'
                  ? summary.averageAvailability.toFixed(1) + '%'
                  : (metrics.find(m => m.machineId === selectedMachineId)?.availability.toFixed(1) + '%' || '100%')
                }
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Falhas</p>
              <p className="text-lg font-bold text-primary">
                {selectedMachineId === 'all'
                  ? summary.totalFailures
                  : (metrics.find(m => m.machineId === selectedMachineId)?.totalFailures || 0)
                }
              </p>
            </div>
          </div>
        )}

        {records.length === 0 && (
          <div className="py-8 text-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
            <p>Nenhum dado disponível para o período selecionado.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
