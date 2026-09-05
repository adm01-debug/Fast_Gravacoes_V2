/**
 * Calendar export utilities — PDF (jsPDF + html2canvas) and iCal (.ics).
 * E13 + E14.
 */
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { DbJob, DbMachine } from '@/features/jobs';
import { logger } from '@/lib/logger';

/**
 * Captures a DOM element and downloads it as PDF.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0a0c',
      scale: 1.5,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
  } catch (err) {
    logger.error('exportElementToPdf failed', { err });
    throw err;
  }
}

/**
 * Formats a Date to iCal date-time (UTC).
 */
function toICalDateTime(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  );
}

function escapeICal(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Builds an iCal (.ics) feed for the given jobs.
 */
export function buildICalFeed(jobs: DbJob[], machines: DbMachine[], calendarName: string): string {
  const machineMap = new Map(machines.map((m) => [m.id, m]));
  const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

  const events = jobs
    .filter((j) => j.scheduled_date && j.start_time && j.end_time)
    .flatMap((job) => {
      const scheduledDate = job.scheduled_date;
      const startTime = job.start_time;
      const endTime = job.end_time;

      if (!scheduledDate || !startTime || !endTime) {
        return [];
      }

      const date = parseDateOnly(scheduledDate);

      if (!date) {
        return [];
      }

      const start = toICalDateTime(date, startTime);
      const end = toICalDateTime(date, endTime);
      const machine = job.machine_id ? machineMap.get(job.machine_id) : null;
      const summary = escapeICal(`${job.order_number} — ${job.client}`);
      const description = escapeICal(
        `${job.product}\nQtd: ${job.quantity}\nStatus: ${job.status}\nMáquina: ${machine?.code ?? '—'}`
      );
      return [[
        'BEGIN:VEVENT',
        `UID:${job.id}@fastgravacoes`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${escapeICal(machine?.name ?? 'FAST GRAVAÇÕES')}`,
        'END:VEVENT',
      ].join('\r\n')];
    })
    .join('\r\n');


  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FAST GRAVAÇÕES//Calendar//PT-BR',
    `X-WR-CALNAME:${escapeICal(calendarName)}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICalFeed(jobs: DbJob[], machines: DbMachine[], filename: string, calendarName: string) {
  const feed = buildICalFeed(jobs, machines, calendarName);
  const blob = new Blob([feed], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
