import { describe, it, expect } from 'vitest';
import { jobSchema } from './job.schema';

// Linha como o PostgREST devolve de public.jobs: technique_id textual
// (public.techniques.id) e as relações juntadas na consulta de jobsService.
const linhaDoBanco = {
  id: '11111111-1111-4111-8111-111111111111',
  order_number: 'ORD-1795640986154',
  client: 'Test Client',
  product: 'Test Product',
  quantity: 1000,
  technique_id: 'bordado',
  machine_id: null,
  priority: 'medium',
  status: 'queue',
  estimated_duration: 520,
  created_at: '2026-11-25T12:00:00.000Z',
  machines: { name: 'Bordado 1', code: 'BRD1' },
  techniques: { id: 'bordado', name: 'Bordado' },
};

describe('jobSchema', () => {
  it('valida a OS com a técnica textual usada no banco', () => {
    expect(jobSchema.safeParse(linhaDoBanco).success).toBe(true);
  });

  it('recusa OS sem técnica', () => {
    const resultado = jobSchema.safeParse({ ...linhaDoBanco, technique_id: '' });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0].message).toBe('Técnica é obrigatória');
  });

  it('preserva as relações e os timestamps que a consulta traz', () => {
    const job = jobSchema.parse(linhaDoBanco) as unknown as Record<string, unknown>;
    expect(job.machines).toEqual({ name: 'Bordado 1', code: 'BRD1' });
    expect(job.techniques).toEqual({ id: 'bordado', name: 'Bordado' });
    expect(job.created_at).toBe('2026-11-25T12:00:00.000Z');
  });

  it('aceita os ids fora do padrão RFC-4122 que o seed usa', () => {
    const resultado = jobSchema.safeParse({
      ...linhaDoBanco,
      id: 'a1111111-1111-1111-1111-000000000001',
      machine_id: '77777777-7777-7777-7777-777777777777',
    });
    expect(resultado.success).toBe(true);
  });
});