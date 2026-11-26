import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRegisterSheetView } from './useRegisterSheetView';
import { supabase } from '@/integrations/supabase/client';

const rpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a) },
}));

describe('useRegisterSheetView', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it('incrementa o contador da ficha aberta', async () => {
    renderHook(() => useRegisterSheetView('sheet-1'));

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc).toHaveBeenCalledWith('increment_sheet_view_count', { sheet_id: 'sheet-1' });
  });

  it('conta uma vez por ficha, mesmo com re-render', async () => {
    const { rerender } = renderHook(({ id }: { id: string }) => useRegisterSheetView(id), {
      initialProps: { id: 'sheet-1' },
    });

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    rerender({ id: 'sheet-1' });
    rerender({ id: 'sheet-1' });

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('conta de novo ao abrir outra ficha', async () => {
    const { rerender } = renderHook(({ id }: { id: string }) => useRegisterSheetView(id), {
      initialProps: { id: 'sheet-1' },
    });

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    rerender({ id: 'sheet-2' });

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
    expect(rpc).toHaveBeenLastCalledWith('increment_sheet_view_count', { sheet_id: 'sheet-2' });
  });

  it('não conta sem ficha selecionada', async () => {
    renderHook(() => useRegisterSheetView(null));

    await new Promise((r) => setTimeout(r, 10));
    expect(rpc).not.toHaveBeenCalled();
  });

  it('não quebra o fluxo quando a RPC falha', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });

    renderHook(() => useRegisterSheetView('sheet-1'));

    await waitFor(() => expect(warn).toHaveBeenCalled());
    warn.mockRestore();
  });
});