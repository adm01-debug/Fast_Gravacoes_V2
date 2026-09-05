import { describe, it, expect, vi } from 'vitest';
import { createRealtimeMock } from './realtimeMock';

type RealtimeChannel = {
  on: (event: string, filter: { event?: string; schema?: string; table?: string }, cb: (p: unknown) => void) => RealtimeChannel;
  subscribe: () => RealtimeChannel;
};

describe('createRealtimeMock — contrato de tabelas não assinadas', () => {
  it('emitFor lança quando a tabela não tem handler registrado', () => {
    const rt = createRealtimeMock();

    (rt.supabase.channel() as RealtimeChannel)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {})
      .subscribe();

    expect(() => rt.emitFor('machines', { eventType: 'INSERT' })).toThrow(
      /No Realtime handler registered for table "machines"/,
    );
  });

  it('não dispara callbacks de outras tabelas ao emitir para tabela não assinada', () => {
    const rt = createRealtimeMock();
    const jobsCb = vi.fn();

    (rt.supabase.channel() as RealtimeChannel)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, jobsCb)
      .subscribe();

    expect(() => rt.emitFor('techniques', { eventType: 'UPDATE' })).toThrow();
    expect(jobsCb).not.toHaveBeenCalled();
  });
});
