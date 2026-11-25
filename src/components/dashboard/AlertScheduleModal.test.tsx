import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
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

describe('AlertScheduleModal - quais status ocupam a maquina (etapas 052 e 053)', () => {
  // O jsdom nao implementa as APIs de ponteiro que o Radix Select usa para abrir
  // a lista; sem isso os itens (percentual e contagem) nunca renderizam.
  beforeAll(() => {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
    Element.prototype.scrollIntoView = () => {};
  });

  beforeEach(() => {
    vi.clearAllMocks();
    dbError.current = null;
  });

  it('nao avisa conflito para OS concluida, que o banco libera desde a etapa 053', () => {
    renderAndChooseTime([otherJob('finished')]);
    expect(screen.queryByText(/conflito/)).not.toBeInTheDocument();
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
    renderAndChooseTime([otherJob('production', '09:15')]);
    expect(screen.queryByText(/conflito/)).not.toBeInTheDocument();
  });

  it('avisa do conflito quando o fim gravado na OS invade o horario escolhido', () => {
    renderAndChooseTime([otherJob('production', '10:00')]);
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
      renderAndChooseTime([otherJob('production', '10:30')]);
      expect(screen.getByText(/09:00 - 10:30/)).toBeInTheDocument();
    });

    it('conta separado o que reserva tempo e o que e so carga planejada na maquina', async () => {
      const machines = [
        { id: 'm1', code: 'M1', name: 'Maquina Um', technique_id: 't1', is_active: true },
        { id: 'm2', code: 'M2', name: 'Maquina Dois', technique_id: 't1', is_active: true },
      ];
      const reservada = otherJob('scheduled'); // 09:00 + 120 min na m1
      const semInicio = { ...otherJob('scheduled'), id: 'planejada', machine_id: 'm2', start_time: null };

      render(
        <AlertScheduleModal
          open
          onOpenChange={() => {}}
          selectedJob={selectedJob}
          jobs={[reservada, semInicio] as never}
          machines={machines as never}
          onScheduled={() => {}}
        />
      );
      fireEvent.change(document.querySelector('input[type="date"]')!, { target: { value: DATE } });

      // A OS sem inicio nao reserva tempo: a m2 fica com 0% e recebe a sugestao,
      // enquanto a m1 aparece com 15% (120 de 780 minutos uteis).
      expect(screen.getByText('Maquina Dois')).toBeInTheDocument();
      expect(screen.getByText('07:00')).toBeInTheDocument();

      fireEvent.pointerDown(screen.getByRole('combobox'), { button: 0, ctrlKey: false, pointerType: 'mouse' });

      await waitFor(() => expect(screen.getByLabelText('1 OS sem horario')).toBeInTheDocument());
      expect(screen.getByText('15%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
});
