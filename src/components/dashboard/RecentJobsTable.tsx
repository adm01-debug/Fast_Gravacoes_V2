import { memo, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { useOperatorDashboardData } from '@/features/production';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { JobStatus } from '@/types/scheduling';
import { DbJob, DbTechnique, DbMachine } from '@/features/jobs';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface JobRowProps {
  job: DbJob;
  technique: DbTechnique | undefined;
  machine: DbMachine | undefined;
  onClick: () => void;
  isLoading?: boolean;
}

const JobRow = memo(function JobRow({ job, technique, machine, onClick, isLoading }: JobRowProps) {
  return (
    <TableRow
      className={`border-border/20 hover:bg-secondary/50 transition-all hover:-translate-x-0.5 cursor-pointer ${isLoading ? 'opacity-60 pointer-events-none animate-pulse' : ''}`}
      onClick={onClick}
    >
      <TableCell className="font-mono text-sm font-medium text-primary">
        {job.order_number}
      </TableCell>
      <TableCell className="font-medium max-w-[150px] truncate">
        {job.client}
      </TableCell>
      <TableCell className="max-w-[150px] truncate text-muted-foreground hidden sm:table-cell">
        {job.product}
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="secondary" className="font-mono bg-secondary/80">
          {job.quantity.toLocaleString('pt-BR')}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-sm">{technique?.short_name}</span>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <Badge variant="outline" className="font-mono text-xs border-border/50">
          {machine?.code || 'N/A'}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
        {job.start_time && job.end_time ? `${job.start_time} - ${job.end_time}` : 'N/A'}
      </TableCell>
      <TableCell>
        <StatusBadge status={job.status as JobStatus} size="sm" />
      </TableCell>
    </TableRow>
  );
});
JobRow.displayName = 'JobRow';

function RecentJobsTableComponent() {
  const { t } = useTranslation();
  const { jobs, isLoading, getTechniqueById, getMachineById, refetchAll } = useOperatorDashboardData();
  const [selectedJob, setSelectedJob] = useState<DbJob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);

  const recentJobs = useMemo(() => jobs.slice(0, 10), [jobs]);

  const handleJobClick = (job: DbJob) => {
    setLoadingJobId(job.id);
    setTimeout(() => {
      setSelectedJob(job);
      setIsModalOpen(true);
      setLoadingJobId(null);
    }, 100);
  };

  const handleStatusChange = async (jobId: string, newStatus: DbJob['status']) => {
    try {
      const updateData: Partial<DbJob> = { status: newStatus };

      if (newStatus === 'production') {
        updateData.actual_start_time = new Date().toISOString();
      } else if (newStatus === 'finished') {
        updateData.actual_end_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) throw error;

      toast.success(t('jobs.statusUpdated', { status: newStatus }));
      refetchAll();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  if (isLoading) {
    return (
      <Card className="col-span-3 glass-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="col-span-3 glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-title gradient-text">{t('dashboard.recentJobs', 'Jobs Recentes')}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[700px]">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="w-[100px] text-muted-foreground">{t('jobs.orderNumber', 'OS')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('jobs.client', 'Cliente')}</TableHead>
                  <TableHead className="text-muted-foreground hidden sm:table-cell">{t('jobs.product', 'Produto')}</TableHead>
                  <TableHead className="text-center text-muted-foreground">{t('jobs.quantity', 'Qtd')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('jobs.technique', 'Técnica')}</TableHead>
                  <TableHead className="text-muted-foreground hidden lg:table-cell">{t('jobs.machine', 'Máquina')}</TableHead>
                  <TableHead className="text-muted-foreground hidden md:table-cell">{t('common.time', 'Horário')}</TableHead>
                  <TableHead className="text-muted-foreground">{t('common.status', 'Status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t('jobs.noJobsFound', 'Nenhum job encontrado')}
                    </TableCell>
                  </TableRow>
                ) : (
                  recentJobs.map((job) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      technique={getTechniqueById(job.technique_id)}
                      machine={getMachineById(job.machine_id)}
                      onClick={() => handleJobClick(job)}
                      isLoading={loadingJobId === job.id}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <JobDetailsModal
        job={selectedJob}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}

export const RecentJobsTable = memo(RecentJobsTableComponent);
RecentJobsTable.displayName = 'RecentJobsTable';