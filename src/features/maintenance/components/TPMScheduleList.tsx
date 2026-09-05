import { Wrench, Clock, AlertTriangle, CheckCircle, CalendarCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MaintenanceSchedule } from '@/features/maintenance/hooks/useTPM';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TPMScheduleListProps {
  schedules: MaintenanceSchedule[];
  onStartMaintenance: (scheduleId: string) => void;
}

export function TPMScheduleList({ schedules, onStartMaintenance }: TPMScheduleListProps) {
  const getStatusBadge = (schedule: MaintenanceSchedule) => {
    const dueDate = new Date(schedule.next_due_at);
    const daysUntil = differenceInDays(dueDate, new Date());

    if (isPast(dueDate) && !isToday(dueDate)) {
      if (daysUntil < -7) {
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Crítico</Badge>;
      }
      return <Badge variant="destructive" className="gap-1"><Clock className="h-3 w-3" /> Atrasado</Badge>;
    }
    if (isToday(dueDate)) {
      return <Badge className="gap-1 bg-blue-500"><Wrench className="h-3 w-3" /> Vence Hoje</Badge>;
    }
    if (daysUntil <= 3) {
      return <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning"><Clock className="h-3 w-3" /> Próximo</Badge>;
    }
    return <Badge variant="outline" className="gap-1"><CalendarCheck className="h-3 w-3" /> Agendado</Badge>;
  };

  return (
    <Card className="card-glass">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-title">
          <Wrench className="h-5 w-5 text-primary" />
          Manutenções Programadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {schedules.length > 0 ? (
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Manutenção</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Próxima Data</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {schedule.machine?.name || 'N/A'}
                        <span className="text-muted-foreground ml-1">
                          ({schedule.machine?.code})
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: schedule.maintenance_type?.color,
                          color: schedule.maintenance_type?.color,
                        }}
                      >
                        {schedule.maintenance_type?.name || schedule.maintenance_type_id}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(schedule.next_due_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {schedule.interval_days} dias
                    </TableCell>
                    <TableCell>{getStatusBadge(schedule)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onStartMaintenance(schedule.id)}
                      >
                        <Wrench className="h-3 w-3 mr-1" />
                        Executar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Wrench className="h-12 w-12 mb-3 opacity-20" />
            <p>Nenhuma manutenção agendada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
