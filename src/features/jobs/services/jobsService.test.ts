import { vi, describe, it, expect, beforeEach } from 'vitest';
import { jobsService, ArchiveRefusedError } from './jobsService';
import { supabase } from '@/integrations/supabase/client';
import { JobInsert } from './jobsService';

// Mock Supabase
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: rpcMock,
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

  it('arquiva uma OS pela RPC archive_jobs', async () => {
    rpcMock.mockResolvedValue({ data: { archived: 1, skipped: 0 }, error: null });

    await expect(jobsService.archive('job-9')).resolves.toEqual({ archived: 1, skipped: 0 });
    expect(rpcMock).toHaveBeenCalledWith('archive_jobs', { p_job_id: 'job-9' });
  });

  it('falha quando a RPC não arquiva nada', async () => {
    rpcMock.mockResolvedValue({ data: { archived: 0, skipped: 1 }, error: null });

    await expect(jobsService.archive('job-9')).rejects.toThrow(/Nenhuma OS foi arquivada/);
  });

    it('preserva o motivo de negócio quando o arquivamento é recusado', async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { code: 'FG003', message: 'OS com remessa em andamento nao pode ser arquivada.' },
      });

      await expect(jobsService.archive('job-9')).rejects.toBeInstanceOf(ArchiveRefusedError);
      await expect(jobsService.archive('job-9')).rejects.toThrow(/remessa em andamento/);
    });

    it('não trata erro de infraestrutura como recusa de negócio', async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'permission denied' },
      });

      await expect(jobsService.archive('job-9')).rejects.not.toBeInstanceOf(ArchiveRefusedError);
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

      it('devolve a OS com a técnica textual e as relações da consulta', async () => {
        (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce({
          select: () => ({
            order: () => ({
              data: [{
                id: '66666666-6666-4666-8666-666666666666',
                order_number: 'PED-11', client: 'Cliente', product: 'Caneca', quantity: 10,
                technique_id: 'bordado', machine_id: null,
                priority: 'medium', status: 'queue', estimated_duration: 520,
                created_at: '2026-11-25T12:00:00.000Z',
                machines: { name: 'Bordado 1', code: 'BRD1' },
                techniques: { id: 'bordado', name: 'Bordado' },
              }],
              error: null,
            }),
          }),
        });

        const [job] = await jobsService.getAll();
        const linha = job as unknown as Record<string, unknown>;
        expect(linha.technique_id).toBe('bordado');
        expect(linha.machines).toEqual({ name: 'Bordado 1', code: 'BRD1' });
        expect(linha.techniques).toEqual({ id: 'bordado', name: 'Bordado' });
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
