import { useState, useMemo } from 'react';
import { useFuseSearch } from '@/hooks/useFuseSearch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, Search, TrendingUp, TrendingDown, Minus, Eye, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { MachineOEE, getOEEColor } from '@/features/production';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MachineTPMPanel } from '@/features/maintenance/components/MachineTPMPanel';
import { MachineReliabilityTab } from '@/components/machines/MachineReliabilityTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface OEEMachineTableProps {
  machines: MachineOEE[];
}

type SortField = 'oee' | 'availability' | 'performance' | 'quality' | 'machineName' | 'totalPiecesProduced' | 'gap' | 'trend';
type SortDirection = 'asc' | 'desc';

import { memo } from 'react';

export const OEEMachineTable = memo(function OEEMachineTable({ machines }: OEEMachineTableProps) {

  const [search, setSearch] = useState('');
  const [techniqueFilter, setTechniqueFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('oee');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const techniques = [...new Set(machines.map(m => m.techniqueId))];
  const techniqueNames = machines.reduce((acc, m) => {
    acc[m.techniqueId] = m.techniqueName;
    return acc;
  }, {} as Record<string, string>);

  // Apply Fuse.js fuzzy search for machines
  const fuseSearchedMachines = useFuseSearch(machines, search, {
    keys: ['machineName', 'machineCode'],
    threshold: 0.3,
  });

  const filteredMachines = useMemo(() => {
    return fuseSearchedMachines
      .filter(m => {
        const matchesTechnique = techniqueFilter === 'all' || m.techniqueId === techniqueFilter;
        return matchesTechnique;
      })
      .map(m => ({ 
        ...m, 
        gap: m.oee - 85,
        trend: m.oee - (m.previousOee || 0)
      }))
      .sort((a, b) => {
        const aVal = a[sortField as keyof typeof a];
        const bVal = b[sortField as keyof typeof b];
        const dir = sortDirection === 'asc' ? 1 : -1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * dir;
        }
        return ((aVal as number) - (bVal as number)) * dir;
      });
  }, [fuseSearchedMachines, techniqueFilter, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getOEEBadgeVariant = (oeeClass: MachineOEE['oeeClass']) => {
    switch (oeeClass) {
      case 'world-class': return 'default';
      case 'excellent': return 'secondary';
      case 'good': return 'outline';
      case 'acceptable': return 'outline';
      case 'poor': return 'destructive';
    }
  };

  const getOEEClassLabel = (oeeClass: MachineOEE['oeeClass']) => {
    switch (oeeClass) {
      case 'world-class': return 'World Class';
      case 'excellent': return 'Excelente';
      case 'good': return 'Bom';
      case 'acceptable': return 'Aceitável';
      case 'poor': return 'Crítico';
    }
  };

  const renderMetricCell = (value: number, benchmark: number = 85) => {
    const color = getOEEColor(value);
    const trend = value >= benchmark ? 'up' : value >= benchmark - 10 ? 'stable' : 'down';

    // Using CSS custom property for progress color
    const progressStyle: React.CSSProperties & { '--progress-color'?: string } = {
      '--progress-color': color
    };

    return (
      <div className="flex items-center gap-2">
        <Progress
          value={value}
          className="h-2 w-16"
          style={progressStyle}
        />
        <span className="text-sm font-medium w-12" style={{ color }}>
          {value.toFixed(1)}%
        </span>
        {trend === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
        {trend === 'down' && <TrendingDown className="h-3 w-3 text-destructive" />}
        {trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>OEE por Máquina</span>
          <span className="text-sm font-normal text-muted-foreground">
            {filteredMachines.length} de {machines.length} máquinas
          </span>
        </CardTitle>

        {/* Filters */}
        <div className="flex gap-3 mt-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar máquina..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={techniqueFilter} onValueChange={setTechniqueFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Técnica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Técnicas</SelectItem>
              {techniques.map(t => (
                <SelectItem key={t} value={t}>{techniqueNames[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0 sm:p-6">
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- região rolável focável (WCAG scrollable-region-focusable) */}
        <div className="rounded-md border-x sm:border overflow-x-auto" role="region" aria-label="Tabela de OEE por máquina" tabIndex={0}>
          <Table className="min-w-[800px] sm:min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('machineName')}>
                    Máquina
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Técnica</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('availability')}>
                    Disponibilidade
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('performance')}>
                    Performance
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('quality')}>
                    Qualidade
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('oee')}>
                    OEE
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('gap')}>
                    Gap vs Meta
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('trend')}>
                    Tendência
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort('totalPiecesProduced')}>
                    Produção
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMachines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Nenhuma máquina encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredMachines.map(machine => (
                  <TableRow key={machine.machineId} className="hover:bg-muted/50 content-visibility-auto">
                    <TableCell>
                      <div>
                        <div className="font-medium">{machine.machineName}</div>
                        <div className="text-xs text-muted-foreground">{machine.machineCode}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: machine.techniqueColor,
                          color: machine.techniqueColor
                        }}
                      >
                        {machine.techniqueName}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderMetricCell(machine.availability)}</TableCell>
                    <TableCell>{renderMetricCell(machine.performance)}</TableCell>
                    <TableCell>{renderMetricCell(machine.quality, 95)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-lg font-bold"
                          style={{ color: getOEEColor(machine.oee) }}
                        >
                          {machine.oee.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn(
                        "flex items-center gap-1 font-bold",
                        machine.trend >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {machine.trend > 0 ? <TrendingUp className="h-3 w-3" /> : machine.trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {Math.abs(machine.trend).toFixed(1)}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-bold text-primary">{machine.totalPiecesProduced.toLocaleString()}</span>
                        <p className="text-[10px] text-muted-foreground uppercase">{machine.completedJobs} jobs</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getOEEBadgeVariant(machine.oeeClass)}>
                        {getOEEClassLabel(machine.oeeClass)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ver detalhes da máquina ${machine.machineName}`}
                        onClick={() => {
                          setSelectedMachineId(machine.machineId);
                          setDetailsOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" aria-describedby="machine-details-description">
          <DialogHeader>
            <DialogTitle>Detalhes da Máquina</DialogTitle>
            <DialogDescription id="machine-details-description">Dados de performance e manutenção</DialogDescription>
          </DialogHeader>

          {selectedMachineId && (
            <Tabs defaultValue="tpm" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tpm">Manutenção (TPM)</TabsTrigger>
                <TabsTrigger value="reliability">Confiabilidade</TabsTrigger>
              </TabsList>
              <TabsContent value="tpm" className="flex-1 overflow-auto pt-4">
                <MachineTPMPanel machineId={selectedMachineId} />
              </TabsContent>
              <TabsContent value="reliability" className="flex-1 overflow-auto pt-4">
                <MachineReliabilityTab machineId={selectedMachineId} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
});
