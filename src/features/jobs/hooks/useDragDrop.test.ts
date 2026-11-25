import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';
import { useDailyDragDrop } from './useDailyDragDrop';
import { useWeeklyDragDrop } from './useWeeklyDragDrop';

const { updatePayload } = vi.hoisted(() => ({ updatePayload: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: (payload: unknown) => ({
        eq: () => {
          updatePayload(payload);
          return Promise.resolve({ error: null });
        },
      }),
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const DATE = '2026-09-24';
const TARGET = 'maquina-2';

const movingJob = {
  id: 'j1',
  order_number: 'OS-1',
  client: 'Cliente',
  product: 'Caneca',
  quantity: 10,
  estimated_duration: 60,
  technique_id: 't1',
  status: 'ready',
  scheduled_date: DATE,
  start_time: null,
  end_time: null,
  machine_id: 'maquina-1',
};

const neighbour = (status: string) => ({
  id: 'j2',
  order_number: 'OS-2',
  client: 'Cliente',
  product: 'Caneca',
  quantity: 10,
  estimated_duration: 120,
  technique_id: 't1',
  status,
  scheduled_date: DATE,
  start_time: '07:00',
  end_time: '09:00',
  machine_id: TARGET,
});

const asEvent = (overId: string) => ({ active: { id: 'j1' }, over: { id: overId } }) as unknown as DragEndEvent;

function dragDaily(allJobs: unknown[], overId: string) {
  const { result } = renderHook(() =>
    useDailyDragDrop({ onUpdate: () => {}, allJobs: allJobs as never, startHour: 7, totalMinutes: 780 })
  );
  return result.current.handleDragEnd(asEvent(overId));
}

function dragWeekly(allJobs: unknown[], overId: string) {
  const { result } = renderHook(() => useWeeklyDragDrop({ onUpdate: () => {}, allJobs: allJobs as never }));
  return result.current.handleDragEnd(asEvent(overId));
}

describe('horarios livres ao arrastar uma OS (etapa 053)', () => {
  beforeEach(() => {
    updatePayload.mockClear();
  });

  it('ignora OS concluida na maquina de destino, no calendario do dia', async () => {
    await dragDaily([movingJob, neighbour('finished')], TARGET);

    expect(updatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ start_time: '07:00', end_time: '08:00' })
    );
  });

  it('ignora OS concluida na maquina de destino, no calendario da semana', async () => {
    await dragWeekly([movingJob, neighbour('finished')], `${TARGET}|${DATE}`);

    expect(updatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ start_time: '07:00', end_time: '08:00' })
    );
  });

  it('continua empurrando a OS para depois de uma OS que ainda produz, no calendario do dia', async () => {
    await dragDaily([movingJob, neighbour('production')], TARGET);

    expect(updatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ start_time: '09:00', end_time: '10:00' })
    );
  });

  it('continua empurrando a OS para depois de uma OS que ainda produz, no calendario da semana', async () => {
    await dragWeekly([movingJob, neighbour('production')], `${TARGET}|${DATE}`);

    expect(updatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ start_time: '09:00', end_time: '10:00' })
    );
  });
});