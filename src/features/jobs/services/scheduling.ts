import { addMinutes, format, parse, isValid } from 'date-fns';

export interface TimeSlot {
  start: string;
  end: string;
}

/**
 * Finds the next available slot on a machine for a given date.
 */
export function findNextAvailableSlot(
  existingJobs: { start_time: string | null; end_time: string | null }[],
  durationMinutes: number,
  workDayStart = '07:00',
  workDayEnd = '22:00'
): TimeSlot | null {
  // Filter and sort jobs that have both start and end time
  const sortedJobs = existingJobs
    .filter(job => job.start_time && job.end_time)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  const referenceDate = new Date();
  let currentStart = workDayStart;

  for (const job of sortedJobs) {
    if ((job.start_time ?? "") > currentStart) {
      // Check if duration fits before this job
      const gapStart = parse(currentStart, 'HH:mm', referenceDate);
      const gapEnd = parse((job.start_time ?? ""), 'HH:mm', referenceDate);

      if (isValid(gapStart) && isValid(gapEnd)) {
        const gapMinutes = (gapEnd.getTime() - gapStart.getTime()) / (1000 * 60);

        if (gapMinutes >= durationMinutes) {
          return {
            start: currentStart,
            end: format(addMinutes(gapStart, durationMinutes), 'HH:mm')
          };
        }
      }
    }
    // Update currentStart to the end of this job if it's later
    if ((job.end_time ?? "") > currentStart) {
      currentStart = (job.end_time ?? "");
    }
  }

  // Check after the last job
  const dayEnd = parse(workDayEnd, 'HH:mm', referenceDate);
  const finalStart = parse(currentStart, 'HH:mm', referenceDate);

  if (isValid(dayEnd) && isValid(finalStart)) {
    const remainingMinutes = (dayEnd.getTime() - finalStart.getTime()) / (1000 * 60);

    if (remainingMinutes >= durationMinutes) {
      return {
        start: currentStart,
        end: format(addMinutes(finalStart, durationMinutes), 'HH:mm')
      };
    }
  }

  return null;
}
