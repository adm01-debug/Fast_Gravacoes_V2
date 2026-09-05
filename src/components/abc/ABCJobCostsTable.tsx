import { Calculator, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { JobCostSummary } from '@/hooks/useABCCosts';

interface ABCJobCostsTableProps {
  jobSummaries: JobCostSummary[];
  onRecalculate: (jobId: string) => void;
  onRecalculateAll: () => void;
  isRecalculating: boolean;
}

export function ABCJobCostsTable({
  jobSummaries,
  onRecalculate,
  onRecalculateAll,
  isRecalculating
}: ABCJobCostsTableProps) {
  const sortedSummaries = [...jobSummaries].sort((a, b) => b.total_cost - a.total_cost);

  return (
    <Card className="card-glass">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-title">
            <Calculator className="h-5 w-5 text-primary" />
            Custos por Job
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRecalculateAll}
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
            Recalcular Todos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedSummaries.length > 0 ? (
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSummaries.slice(0, 20).map((summary) => (
                  <TableRow key={summary.job_id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <Badge variant="outline">{summary.order_number}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {summary.client}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {summary.product}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {summary.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">
                      {summary.total_cost.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {summary.unit_cost.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 4,
                      })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onRecalculate(summary.job_id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-4">
            <Calculator className="h-12 w-12 opacity-20" />
            <p>Nenhum custo calculado ainda</p>
            <Button variant="outline" onClick={onRecalculateAll} disabled={isRecalculating}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculating ? 'animate-spin' : ''}`} />
              Calcular Custos
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
