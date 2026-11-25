import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CalendarTimeline } from './CalendarTimeline';

// O jsdom nao tem altura, entao a lista virtualizada nao renderiza nenhuma linha.
// Aqui todas as linhas sao devolvidas para o teste enxergar os cartoes.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 64,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 64, size: 64 })),
  }),
}));

const machine = { id: 'm1', code: 'M1', name: 'Maquina 1', technique_id: 't1', is_active: true };
const technique = { id: 't1', name: 'Sublimacao', short_name: 'SUB', color: '#000', is_active: true };

const job = (id: string, order: string, status: string) => ({
  id,
  order_number: order,
  client: 'Cliente',
  product: 'Caneca',
  quantity: 10,
  estimated_duration: 60,
  technique_id: 't1',
  status,
  scheduled_date: '2026-09-24',
  start_time: '09:00',
  end_time: '10:00',
  machine_id: 'm1',
  actual_start_time: null,
  actual_end_time: null,
});

function renderTimeline(jobs: unknown[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <CalendarTimeline
          machines={[machine] as never}
          techniques={[technique] as never}
          jobsByMachine={{ m1: jobs } as never}
          conflictJobIds={new Set()}
          startHour={7}
          endHour={20}
          currentTimePosition={null}
          getTechniqueById={() => technique as never}
          onJobClick={vi.fn()}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

describe('ordem de desenho dos cartoes na linha do tempo (etapa 053)', () => {
  it('desenha a OS concluida por baixo da OS ativa que ocupa o mesmo horario', () => {
    renderTimeline([job('ativo', 'OS-ATIVA', 'scheduled'), job('concluida', 'OS-CONCLUIDA', 'finished')]);

    const orders = Array.from(document.querySelectorAll('[aria-label^="Job "]')).map(el =>
      el.getAttribute('aria-label') || ''
    );

    expect(orders).toHaveLength(2);
    expect(orders[0]).toContain('OS-CONCLUIDA');
    expect(orders[1]).toContain('OS-ATIVA');
  });

  it('nao eleva no hover a OS concluida, para ela nao roubar o clique da OS ativa', () => {
    renderTimeline([job('ativo', 'OS-ATIVA', 'scheduled'), job('concluida', 'OS-CONCLUIDA', 'finished')]);

    const concluida = document.querySelector('[aria-label*="OS-CONCLUIDA"]');
    const ativa = document.querySelector('[aria-label*="OS-ATIVA"]');

    expect(concluida).toBeTruthy();
    expect(ativa).toBeTruthy();
    // `hover:z-10` tira a OS concluida de baixo do bloco ativo assim que o
    // ponteiro passa pela parte exposta dela, e o clique seguinte cai nela.
    expect((concluida as HTMLElement).className).not.toContain('hover:z-10');
    expect((ativa as HTMLElement).className).toContain('hover:z-10');
  });
});