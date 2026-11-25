import { vi, describe, it, expect, beforeEach } from 'vitest';
import { jobsService } from './jobsService';
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
});
