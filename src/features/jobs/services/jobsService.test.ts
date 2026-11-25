import { vi, describe, it, expect, beforeEach } from 'vitest';
import { jobsService } from './jobsService';
import { supabase } from '@/integrations/supabase/client';
import { JobInsert } from './jobsService';
import { DELETE_QUANTITY_FILTERS } from '../lib/pending-queue';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          })),
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        })),
        order: vi.fn(() => ({
          data: [],
          error: null
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: '123', status: 'pending' },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    }))
  }
}));

describe('jobsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve chamar select ao buscar todos os jobs', async () => {
    await jobsService.getAll();
    expect(supabase.from).toHaveBeenCalledWith('jobs');
  });

  it('deve criar um novo job com sucesso', async () => {
    const newJob: JobInsert = { 
      order_number: 'OS-001', 
      client: 'Cliente Teste',
      product: 'Camiseta',
      quantity: 100,
      technique_id: 'tech-1'
    };

    const result = await jobsService.create(newJob);
    expect(result).toEqual({ id: '123', status: 'pending' });
    expect(supabase.from).toHaveBeenCalledWith('jobs');
  });

  it('deve lidar com erros na busca de jobs', async () => {
    // Override mock for this test
    (supabase.from as unknown as { mockReturnValueOnce: (v: unknown) => void }).mockReturnValueOnce({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: null,
          error: new Error('Erro de conexão')
        }))
      }))
    });

    await expect(jobsService.getAll()).rejects.toThrow('Erro de conexão');
  });

      it('mantém produced_quantity e lost_pieces depois da validação do schema', async () => {
        (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
          select: () => ({
            order: () => ({
              data: [{
                id: '11111111-1111-4111-8111-111111111111',
                order_number: 'PED-9', client: 'Cliente', product: 'Caneca', quantity: 10,
                technique_id: '22222222-2222-4222-8222-222222222222',
                priority: 'medium', status: 'queue', estimated_duration: 60,
                produced_quantity: 40, lost_pieces: 2,
              }],
              error: null,
            }),
          }),
        });

        const [job] = await jobsService.getAll();
        expect(job.produced_quantity).toBe(40);
        expect(job.lost_pieces).toBe(2);
      });

      it('recusa a exclusao de OS com producao registrada no proprio servico', async () => {
        const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
        fromMock.mockReturnValueOnce({
          select: () => ({
            in: () => ({
              data: [{ id: '33333333-3333-4333-8333-333333333333', status: 'queue', produced_quantity: 12, lost_pieces: 0 }],
              error: null,
            }),
          }),
        });

        await expect(jobsService.delete('33333333-3333-4333-8333-333333333333')).rejects.toThrow(/nao pode ser excluida/);
      });

      it('exclui a OS sem producao e com status permitido', async () => {
        const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
        const id = '44444444-4444-4444-8444-444444444444';
        const chain = {
          in: vi.fn(),
          or: vi.fn(),
          select: vi.fn(() => ({ data: [{ id }], error: null })),
        };
        chain.in.mockReturnValue(chain);
        chain.or.mockReturnValue(chain);
        const deleteSpy = vi.fn(() => chain);

        fromMock.mockReturnValueOnce({
          select: () => ({
            in: () => ({
              data: [{ id, status: 'queue', produced_quantity: 0, lost_pieces: 0 }],
              error: null,
            }),
          }),
        });
        fromMock.mockReturnValueOnce({ delete: deleteSpy });

        await jobsService.delete(id);

        expect(deleteSpy).toHaveBeenCalled();
        expect(chain.in).toHaveBeenCalledWith('id', [id]);
        // Um unico `.or`: o PostgREST descarta o primeiro quando o request traz dois.
        expect(chain.or).toHaveBeenCalledTimes(1);
        expect(chain.or).toHaveBeenCalledWith(DELETE_QUANTITY_FILTERS);
      });

      it('nao anuncia exclusao quando o banco nao apaga nenhuma linha', async () => {
        // Operador sem permissao de exclusao: a policy filtra as linhas, o DELETE
        // termina sem erro e antes disso a tela contava como exclusao concluida.
        const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
        const id = '55555555-5555-4555-8555-555555555555';
        const chain = {
          in: vi.fn(),
          or: vi.fn(),
          select: vi.fn(() => ({ data: [], error: null })),
        };
        chain.in.mockReturnValue(chain);
        chain.or.mockReturnValue(chain);

        fromMock.mockReturnValueOnce({
          select: () => ({
            in: () => ({
              data: [{ id, status: 'queue', produced_quantity: 0, lost_pieces: 0 }],
              error: null,
            }),
          }),
        });
        fromMock.mockReturnValueOnce({ delete: () => chain });

        const result = await jobsService.deleteMany([id]);

        expect(result.deleted).toEqual([]);
        expect(result.refused).toEqual([
          { id, reason: 'a OS mudou de situação ou o usuário não tem permissão de exclusão' },
        ]);
      });
});
