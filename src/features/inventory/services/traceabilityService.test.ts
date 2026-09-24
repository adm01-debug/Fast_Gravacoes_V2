import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

import { TraceabilityService } from './traceabilityService';
import { supabase } from '@/integrations/supabase/client';

describe('TraceabilityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLots', () => {
    it('busca todos os lotes ordenados por data de criação quando nenhum jobId é informado', async () => {
      const order = vi.fn().mockResolvedValue({ data: [{ id: 'lot-1' }], error: null });
      const select = vi.fn(() => ({ order }));
      (supabase.from as unknown as Mock).mockReturnValue({ select });

      const result = await TraceabilityService.getLots();

      expect(supabase.from).toHaveBeenCalledWith('production_lots');
      expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual([{ id: 'lot-1' }]);
    });

    it('filtra lotes por job_id quando informado', async () => {
      const order = vi.fn().mockResolvedValue({ data: [], error: null });
      const eq = vi.fn(() => ({ order }));
      const select = vi.fn(() => ({ eq, order }));
      (supabase.from as unknown as Mock).mockReturnValue({ select });

      await TraceabilityService.getLots('job-42');

      expect(eq).toHaveBeenCalledWith('job_id', 'job-42');
    });

    it('lança o erro do Supabase', async () => {
      const order = vi.fn().mockResolvedValue({ data: null, error: new Error('erro de conexão') });
      const select = vi.fn(() => ({ order }));
      (supabase.from as unknown as Mock).mockReturnValue({ select });

      await expect(TraceabilityService.getLots()).rejects.toThrow('erro de conexão');
    });
  });

  describe('getLotComponents', () => {
    it('busca componentes de um lote pelo lot_id', async () => {
      const eq = vi.fn().mockResolvedValue({ data: [{ id: 'comp-1' }], error: null });
      const select = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ select });

      const result = await TraceabilityService.getLotComponents('lot-1');

      expect(supabase.from).toHaveBeenCalledWith('lot_components');
      expect(eq).toHaveBeenCalledWith('lot_id', 'lot-1');
      expect(result).toEqual([{ id: 'comp-1' }]);
    });

    it('retorna lista vazia quando o lote não tem nenhum componente (sem rastreabilidade)', async () => {
      const eq = vi.fn().mockResolvedValue({ data: [], error: null });
      const select = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ select });

      const result = await TraceabilityService.getLotComponents('lot-sem-componentes');

      expect(result).toEqual([]);
    });

    it('lança o erro do Supabase', async () => {
      const eq = vi.fn().mockResolvedValue({ data: null, error: new Error('lote não encontrado') });
      const select = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ select });

      await expect(TraceabilityService.getLotComponents('lot-404')).rejects.toThrow('lote não encontrado');
    });
  });

  describe('getLotMovements', () => {
    it('busca movimentações do lote, mais recentes primeiro', async () => {
      const order = vi.fn().mockResolvedValue({ data: [{ id: 'mv-1' }], error: null });
      const eq = vi.fn(() => ({ order }));
      const select = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ select });

      const result = await TraceabilityService.getLotMovements('lot-1');

      expect(supabase.from).toHaveBeenCalledWith('lot_movements');
      expect(eq).toHaveBeenCalledWith('lot_id', 'lot-1');
      expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual([{ id: 'mv-1' }]);
    });

    it('lança o erro do Supabase', async () => {
      const order = vi.fn().mockResolvedValue({ data: null, error: new Error('falha ao listar movimentações') });
      const eq = vi.fn(() => ({ order }));
      const select = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ select });

      await expect(TraceabilityService.getLotMovements('lot-1')).rejects.toThrow('falha ao listar movimentações');
    });
  });

  describe('getQualityInspections', () => {
    it('busca inspeções de qualidade do lote, mais recentes primeiro', async () => {
      const order = vi.fn().mockResolvedValue({ data: [{ id: 'insp-1' }], error: null });
      const eq = vi.fn(() => ({ order }));
      const select = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ select });

      const result = await TraceabilityService.getQualityInspections('lot-1');

      expect(supabase.from).toHaveBeenCalledWith('lot_quality_inspections');
      expect(eq).toHaveBeenCalledWith('lot_id', 'lot-1');
      expect(order).toHaveBeenCalledWith('inspected_at', { ascending: false });
      expect(result).toEqual([{ id: 'insp-1' }]);
    });

    it('lança o erro do Supabase', async () => {
      const order = vi.fn().mockResolvedValue({ data: null, error: new Error('falha ao listar inspeções') });
      const eq = vi.fn(() => ({ order }));
      const select = vi.fn(() => ({ eq }));
      (supabase.from as unknown as Mock).mockReturnValue({ select });

      await expect(TraceabilityService.getQualityInspections('lot-1')).rejects.toThrow('falha ao listar inspeções');
    });
  });
});
