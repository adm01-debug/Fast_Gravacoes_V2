import React from "react";
import { InfoRow } from "./JobInfoRow";
import { parseDateOnly } from "@/lib/dateUtils";
import { Calendar, Clock, User, Package, Palette, Building } from "lucide-react";
import { DbJob, DbMachine } from "@/features/jobs";
import { useTranslation } from "react-i18next";

interface JobInfoGridProps {
  job: DbJob;
  machine?: DbMachine;
}

export function JobInfoGrid({ job, machine }: JobInfoGridProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1 p-4 rounded-xl bg-muted/20 border border-border/30">
        <InfoRow
          icon={Building}
          label={t('jobs.client')}
          value={job.client}
          color="bg-primary/20"
        />
        <InfoRow
          icon={Package}
          label={t('jobs.product')}
          value={job.product}
          color="bg-accent/20"
        />
        <InfoRow
          icon={Palette}
          label={t('jobs.gravureColor')}
          value={job.gravure_color || t('common.notDefined')}
          color="bg-indicator-warning/20"
        />
        <InfoRow
          icon={Clock}
          label={t('jobs.estimatedDuration')}
          value={`${job.estimated_duration} ${t('common.minutes')}`}
          color="bg-priority-high/20"
        />
      </div>

      <div className="space-y-1 p-4 rounded-xl bg-muted/20 border border-border/30">
        <InfoRow
          icon={Calendar}
          label={t('jobs.scheduledDate')}
          value={job.scheduled_date ? (parseDateOnly(job.scheduled_date)?.toLocaleDateString('pt-BR') ?? '-') : t('common.notScheduled')}
          color="bg-indicator-info/20"
        />
        <InfoRow
          icon={Clock}
          label={t('common.time')}
          value={job.start_time && job.end_time ? `${job.start_time} - ${job.end_time}` : t('common.notDefined')}
          color="bg-indicator-warning/20"
        />
        <InfoRow
          icon={User}
          label={t('jobs.machine')}
          value={machine ? `${machine.code} - ${machine.name}` : t('common.notAssigned')}
          color="bg-accent-pink/20"
        />
      </div>
    </div>
  );
}
