import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AlertScheduleModal } from './AlertScheduleModal';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: null }) }) }) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const DATE = '2026-09-24';

const selectedJob = {
  id: 'sel',
  order_number: 'PED-1',
  client: 'Cliente',
  product: 'Caneca',
  quantity: 10,
  estimated_duration: 60,
  technique_id: 't1',
  status: 'ready',
  scheduled_date: null,
  start_time: null,
  machine_id: null,
};

const otherJob = (status: string) => ({
  id: 'outro',
  order_number: 'PED-2',
  client: 'Cliente',
  product: 'Caneca',
  quantity: 10,
  estimated_duration: 120,
  technique_id: 't1',
  status,
  scheduled_date: DATE,
  start_time: '09:00',
  machine_id: 'm1',
});

function renderAndChooseTime(jobs: unknown[]) {
  render(
    <AlertScheduleModal
      open
      onOpenChange={() => {}}
      selectedJob={selectedJob}
      jobs={jobs as never}
      machines={[]}
      onScheduled={() => {}}
    />
  );
  fireEvent.change(document.querySelector('input[type="date"]')!, { target: { value: DATE } });
  fireEvent.change(document.querySelector('input[type="time"]')!, { target: { value: '09:30' } });
}

describe('AlertScheduleModal - quais status ocupam a maquina (etapa 052)', () => {
  it('avisa do conflito ao agendar sobre OS concluida, como o banco recusa', () => {
    renderAndChooseTime([otherJob('finished')]);
    expect(screen.getByText('1 conflito')).toBeInTheDocument();
  });

  it('nao avisa conflito para OS cancelada, que o banco libera', () => {
    renderAndChooseTime([otherJob('cancelled')]);
    expect(screen.queryByText(/conflito/)).not.toBeInTheDocument();
  });

  it('avisa do conflito com OS em producao, comportamento que ja existia', () => {
    renderAndChooseTime([otherJob('production')]);
    expect(screen.getByText('1 conflito')).toBeInTheDocument();
  });
});