import { DbJob, DbMachine, DbTechnique } from '@/features/jobs';
import { startOfDay, endOfDay, subDays, differenceInMinutes, parseISO, isWithinInterval, isValid } from 'date-fns';

function isValidDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    return isValid(date);
  } catch {
    return false;
  }
}

function sanitizeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

const PLANNED_MINUTES_PER_DAY = 11 * 60;

export function calculateRealOEE(jobs: DbJob[]) {
  let totalActualMinutes = 0;
  let totalEstimatedMinutes = 0;
  let totalProducedPieces = 0;
  let totalLostPieces = 0;

  const finishedJobs = jobs.filter(j => j.status === 'finished');

  for (const job of finishedJobs) {
    if (isValidDate(job.actual_start_time) && isValidDate(job.actual_end_time)) {
      try {
        const start = parseISO((job.actual_start_time ?? ""));
        const end = parseISO((job.actual_end_time ?? ""));
        totalActualMinutes += sanitizeNumber(differenceInMinutes(end, start));
      } catch {
        // Datas já validadas acima; ignora qualquer falha residual de parse.
      }
    }
    totalEstimatedMinutes += sanitizeNumber(job.estimated_duration || 60);
    // Null produced_quantity means "not recorded" — must not be treated as
    // "fully produced as ordered" (fabricates 100% output / zero loss).
    const producedQty = sanitizeNumber(job.produced_quantity ?? 0);
    totalProducedPieces += producedQty;
    totalLostPieces += sanitizeNumber(job.lost_pieces);
  }

  const daysWithJobs = new Set(
    finishedJobs.map(j => j.actual_end_time ? startOfDay(parseISO(j.actual_end_time)).toISOString() : null)
      .filter(Boolean)
  ).size || 1;

  const plannedMinutes = Math.max(daysWithJobs * PLANNED_MINUTES_PER_DAY, totalEstimatedMinutes);

  const availability = (plannedMinutes > 0 && finishedJobs.length > 0)
    ? Math.min(100, (totalActualMinutes / plannedMinutes) * 100)
    : 100;


  const performance = totalActualMinutes > 0
    ? Math.min(100, (totalEstimatedMinutes / totalActualMinutes) * 100)
    : 100;

  const goodPieces = Math.max(0, totalProducedPieces - totalLostPieces);
  const quality = totalProducedPieces > 0
    ? Math.min(100, (goodPieces / totalProducedPieces) * 100)
    : 100;

  const oee = finishedJobs.length > 0 ? (availability / 100) * (performance / 100) * (quality / 100) * 100 : 100;

  return {
    oee: Math.round(oee * 10) / 10,
    availability: Math.round(availability * 10) / 10,
    performance: Math.round(performance * 10) / 10,
    quality: Math.round(quality * 10) / 10,
    totalActualMinutes,
    totalEstimatedMinutes,
    totalProducedPieces,
    goodPieces,
    lostPieces: totalLostPieces
  };
}