import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AlertScheduleModal } from './AlertScheduleModal';

const { updatePayload, toastError, dbError } = vi.hoisted(() => ({ updatePayload: vi.fn(), toastError: vi.fn(), dbError: { current: null as null | { message: string } } }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: (payload: unknown) => ({
        eq: () => {
          updatePayload(payload);
          return Promise.resolve({ error: dbError.current });
        },
      }),
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }));

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
  end_time: null,
  machine_id: null,
};

const otherJob = (status: string, endTime: string | null = null) => ({
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
  end_time: endTime,
  machine_id: 'm1',
});

function renderAndChooseTime(jobs: unknown[], job: typeof selectedJob = selectedJob, time = '09:30') {
  render(
    <AlertScheduleModal
      open
      onOpenChange={() => {}}
      selectedJob={job}
      jobs={jobs as never}
      machines={[]}
      onScheduled={() => {}}
    />
  );
  fireEvent.change(document.querySelector('input[type="date"]')!, { target: { value: DATE } });
  fireEvent.change(document.querySelector('input[type="time"]')!, { target: { value: time } });
}

describe('AlertScheduleModal - quais status ocupam a maquina (etapa 052)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbError.current = null;
  });

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

  it('usa o fim gravado na OS, e nao a estimativa, quando ele termina antes do horario escolhido', () => {
    renderAndChooseTime([otherJob('finished', '09:15')]);
    expect(screen.queryByText(/conflito/)).not.toBeInTheDocument();
  });

  it('avisa do conflito quando o fim gravado na OS invade o horario escolhido', () => {
    renderAndChooseTime([otherJob('finished', '10:00')]);
    expect(screen.getByText('1 conflito')).toBeInTheDocument();
  });

  it('grava o fim do agendamento para o gatilho do banco poder recusar a sobreposicao', async () => {
    renderAndChooseTime([]);
    fireEvent.click(screen.getByRole('button', { name: 'Agendar' }));

    await waitFor(() => expect(updatePayload).toHaveBeenCalledTimes(1));
    expect(updatePayload).toHaveBeenCalledWith(
      expect.objectContaining({ start_time: '09:30', end_time: '10:30', status: 'scheduled' })
    );
  });

    it('recusa agendar quando o fim passaria da meia-noite', () => {
      renderAndChooseTime([], { ...selectedJob, estimated_duration: 700 }, '13:00');
      fireEvent.click(screen.getByRole('button', { name: 'Agendar' }));

      expect(updatePayload).not.toHaveBeenCalled();
      expect(toastError).toHaveBeenCalledWith(expect.stringContaining('meia-noite'));
    });

    it('mostra a mensagem do banco quando o agendamento e recusado', async () => {
      dbError.current = { message: 'Horario sobreposto na maquina' };
      renderAndChooseTime([]);
      fireEvent.click(screen.getByRole('button', { name: 'Agendar' }));

      await waitFor(() => expect(toastError).toHaveBeenCalledWith('Horario sobreposto na maquina'));
      dbError.current = null;
    });

    it('mostra o fim gravado da OS no aviso de conflito', () => {
      // fim gravado (10:30) difere do estimado (09:00 + 120min = 11:00): o aviso
      // só passa se usar o fim que está na OS.
      renderAndChooseTime([otherJob('finished', '10:30')]);
      expect(screen.getByText(/09:00 - 10:30/)).toBeInTheDocument();
    });
});
