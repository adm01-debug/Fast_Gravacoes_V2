import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DbJob, DbMachine } from '@/features/jobs';

const { html2canvasMock, jsPdfSave, jsPdfAddImage, jsPdfConstructorOptions, loggerErrorMock } = vi.hoisted(() => ({
  html2canvasMock: vi.fn(),
  jsPdfSave: vi.fn(),
  jsPdfAddImage: vi.fn(),
  jsPdfConstructorOptions: [] as Record<string, unknown>[],
  loggerErrorMock: vi.fn(),
}));

// html2canvas and jspdf are loaded via dynamic `import()` inside
// exportElementToPdf, mirroring the real packages' shapes (default export /
// named `jsPDF` export respectively).
vi.mock('html2canvas', () => ({ default: html2canvasMock }));
vi.mock('jspdf', () => ({
  jsPDF: class MockJsPDF {
    constructor(options: Record<string, unknown>) {
      jsPdfConstructorOptions.push(options);
    }
    addImage = jsPdfAddImage;
    save = jsPdfSave;
  },
}));
vi.mock('@/lib/logger', () => ({ logger: { error: loggerErrorMock, warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { exportElementToPdf, buildICalFeed, downloadICalFeed } from './calendarExports';

function buildJob(overrides: Partial<DbJob> = {}): DbJob {
  return {
    id: 'job-1',
    order_number: 'OS-1001',
    client: 'Cliente A',
    product: 'Caneca 300ml',
    quantity: 100,
    status: 'production',
    scheduled_date: '2026-03-10',
    start_time: '08:00',
    end_time: '10:30',
    machine_id: 'machine-1',
    ...overrides,
  } as unknown as DbJob;
}

function buildMachine(overrides: Partial<DbMachine> = {}): DbMachine {
  return { id: 'machine-1', code: 'M-01', name: 'Gravadora Laser 01', ...overrides } as unknown as DbMachine;
}

describe('calendarExports', () => {
  describe('exportElementToPdf', () => {
    const element = document.createElement('div');

    beforeEach(() => {
      html2canvasMock.mockReset();
      jsPdfSave.mockClear();
      jsPdfAddImage.mockClear();
      jsPdfConstructorOptions.length = 0;
      loggerErrorMock.mockClear();
      html2canvasMock.mockResolvedValue({
        width: 1200,
        height: 800,
        toDataURL: vi.fn(() => 'data:image/png;base64,fake'),
      });
    });

    it('captures the element and saves a landscape PDF when width > height', async () => {
      await exportElementToPdf(element, 'calendario.pdf');

      expect(html2canvasMock).toHaveBeenCalledWith(element, expect.objectContaining({ backgroundColor: '#0a0a0c' }));
      expect(jsPdfAddImage).toHaveBeenCalledWith('data:image/png;base64,fake', 'PNG', 0, 0, 1200, 800);
      expect(jsPdfSave).toHaveBeenCalledWith('calendario.pdf');
      expect(jsPdfConstructorOptions[0]).toMatchObject({ orientation: 'landscape', format: [1200, 800] });
    });

    it('uses portrait orientation when height >= width', async () => {
      html2canvasMock.mockResolvedValue({
        width: 400,
        height: 900,
        toDataURL: vi.fn(() => 'data:image/png;base64,fake'),
      });

      await exportElementToPdf(element, 'retrato.pdf');
      expect(jsPdfAddImage).toHaveBeenCalledWith('data:image/png;base64,fake', 'PNG', 0, 0, 400, 900);
      expect(jsPdfConstructorOptions[0]).toMatchObject({ orientation: 'portrait', format: [400, 900] });
    });

    it('logs and rethrows when html2canvas fails (e.g. tainted canvas)', async () => {
      const err = new Error('tainted canvas');
      html2canvasMock.mockRejectedValueOnce(err);

      await expect(exportElementToPdf(element, 'falha.pdf')).rejects.toThrow('tainted canvas');
      expect(loggerErrorMock).toHaveBeenCalledWith('exportElementToPdf failed', { err });
      expect(jsPdfSave).not.toHaveBeenCalled();
    });
  });

  describe('buildICalFeed', () => {
    it('builds a VCALENDAR wrapper with one VEVENT per fully-scheduled job', () => {
      const feed = buildICalFeed([buildJob()], [buildMachine()], 'Agenda FAST');

      expect(feed).toContain('BEGIN:VCALENDAR');
      expect(feed).toContain('VERSION:2.0');
      expect(feed).toContain('X-WR-CALNAME:Agenda FAST');
      expect(feed).toContain('END:VCALENDAR');
      expect(feed).toContain('BEGIN:VEVENT');
      expect(feed).toContain('UID:job-1@fastgravacoes');
      expect(feed).toContain('SUMMARY:OS-1001 — Cliente A');
      expect(feed).toContain('LOCATION:Gravadora Laser 01');
    });

    it('omits jobs missing scheduled_date, start_time or end_time', () => {
      const jobs = [
        buildJob({ id: 'a', scheduled_date: null }),
        buildJob({ id: 'b', start_time: null }),
        buildJob({ id: 'c', end_time: null }),
        buildJob({ id: 'd' }),
      ];
      const feed = buildICalFeed(jobs, [buildMachine()], 'Agenda');

      expect(feed).not.toContain('UID:a@');
      expect(feed).not.toContain('UID:b@');
      expect(feed).not.toContain('UID:c@');
      expect(feed).toContain('UID:d@fastgravacoes');
      expect((feed.match(/BEGIN:VEVENT/g) ?? [])).toHaveLength(1);
    });

    it('omits jobs whose scheduled_date is not a valid date-only string', () => {
      const feed = buildICalFeed([buildJob({ scheduled_date: 'not-a-date' })], [buildMachine()], 'Agenda');
      expect(feed).not.toContain('BEGIN:VEVENT');
    });

    it('falls back to "—" / company name in LOCATION when the machine is unknown', () => {
      const feed = buildICalFeed([buildJob({ machine_id: null })], [], 'Agenda');
      expect(feed).toContain('Máquina: —');
      expect(feed).toContain('LOCATION:FAST GRAVAÇÕES');
    });

    it('escapes commas, semicolons, backslashes and newlines per RFC 5545', () => {
      const feed = buildICalFeed(
        [buildJob({ client: 'Cliente; A, B\\C\nLinha2' })],
        [buildMachine()],
        'Agenda',
      );
      expect(feed).toContain('Cliente\\; A\\, B\\\\C\\nLinha2');
    });

    it('handles a large job list (500 rows) without throwing, filtering as expected', () => {
      const jobs = Array.from({ length: 500 }, (_, i) =>
        buildJob({ id: `job-${i}`, scheduled_date: i % 3 === 0 ? null : '2026-04-01' }),
      );
      const feed = buildICalFeed(jobs, [buildMachine()], 'Agenda');
      const expectedEvents = jobs.filter((_, i) => i % 3 !== 0).length;
      expect((feed.match(/BEGIN:VEVENT/g) ?? [])).toHaveLength(expectedEvents);
    });

    it('returns a valid (still-wrapped) feed for an empty job list', () => {
      const feed = buildICalFeed([], [], 'Agenda Vazia');
      expect(feed).toContain('BEGIN:VCALENDAR');
      expect(feed).toContain('END:VCALENDAR');
      expect(feed).not.toContain('BEGIN:VEVENT');
    });
  });

  describe('downloadICalFeed', () => {
    let clickSpy: ReturnType<typeof vi.spyOn>;
    let createObjectURLSpy: ReturnType<typeof vi.fn>;
    let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
    let downloadAttr = '';

    beforeEach(() => {
      // jsdom does not implement URL.createObjectURL/revokeObjectURL.
      createObjectURLSpy = vi.fn(() => 'blob:mock-url');
      revokeObjectURLSpy = vi.fn();
      URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL;
      URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;

      downloadAttr = '';
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        downloadAttr = this.download;
      });
    });

    afterEach(() => {
      clickSpy.mockRestore();
    });

    it('triggers a download of a text/calendar blob named after `filename`', () => {
      downloadICalFeed([buildJob()], [buildMachine()], 'agenda.ics', 'Agenda FAST');

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('text/calendar;charset=utf-8');
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(downloadAttr).toBe('agenda.ics');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});
