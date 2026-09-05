import { useStuckJobsDetection } from '@/features/jobs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, Clock, HelpCircle, History, Zap } from 'lucide-react';
import { JobDetailsModal } from '@/components/jobs/JobDetailsModal';
import { useState } from 'react';
import { DbJob } from '@/features/jobs';
import { motion, AnimatePresence } from 'framer-motion';

export function StuckJobsPanel() {
  const { stuckJobs, hasStuckJobs } = useStuckJobsDetection();
  const [selectedJob, setSelectedJob] = useState<DbJob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!hasStuckJobs) return null;

  return (
    <Card className="glass-card border-destructive/20 bg-destructive/5">
      <JobDetailsModal
        job={selectedJob}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm text-title flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <span className="text-destructive font-black uppercase tracking-widest text-[11px]">Risco: Jobs Parados</span>
          </div>
          <div className="flex items-center gap-1.5">
             <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-black bg-destructive/10 text-destructive border-destructive/20 uppercase">Ação Requerida</Badge>
             <Badge variant="destructive" className="h-5 px-1.5 text-[10px] animate-pulse">
               {stuckJobs.length} {stuckJobs.length === 1 ? 'Job' : 'Jobs'}
             </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2">
          {stuckJobs.slice(0, 3).map((stuck, idx) => (
            <motion.div
              key={stuck.job.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-destructive/30 hover:border-destructive/50 transition-colors group cursor-pointer"
              onClick={() => {
                setSelectedJob(stuck.job);
                setIsModalOpen(true);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                   <Clock className="h-4 w-4 text-destructive" />
                   <span className="text-[10px] font-bold text-destructive">{Math.round(stuck.hoursInProduction)}h</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{stuck.job.order_number}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{stuck.job.client}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right pr-2 border-r border-border/50">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Tempo</p>
                  <p className="text-xs font-mono">{Math.round(stuck.hoursInProduction)}h em prod.</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[10px] font-black uppercase text-destructive opacity-50 group-hover:opacity-100 group-hover:bg-destructive/10 gap-1"
                >
                  Investigar <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          ))}

          {stuckJobs.length > 3 && (
            <p className="text-[10px] text-center text-muted-foreground pt-1">
              + {stuckJobs.length - 3} jobs adicionais com alerta de atraso
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
