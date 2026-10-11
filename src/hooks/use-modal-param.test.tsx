import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { useModalParam } from './use-modal-param';

let currentSearch = '';
function SearchProbe() {
  const location = useLocation();
  useEffect(() => {
    currentSearch = location.search;
  }, [location.search]);
  return null;
}

function wrapper(initialEntries: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        {children}
        <SearchProbe />
      </MemoryRouter>
    );
  };
}

describe('useModalParam', () => {
  it('abre o modal quando a URL traz ?modal=<name>', () => {
    const { result } = renderHook(() => useModalParam('batch-qr'), {
      wrapper: wrapper(['/inventory?modal=batch-qr']),
    });
    expect(result.current[0]).toBe(true);
  });

  it('está fechado sem o param ou com outro nome', () => {
    const { result } = renderHook(() => useModalParam('batch-qr'), {
      wrapper: wrapper(['/inventory?modal=ai-prediction']),
    });
    expect(result.current[0]).toBe(false);
  });

  it('setOpen(true) escreve o param e setOpen(false) remove', () => {
    const { result } = renderHook(() => useModalParam('batch-qr'), {
      wrapper: wrapper(['/inventory']),
    });
    act(() => result.current[1](true));
    expect(currentSearch).toContain('modal=batch-qr');
    act(() => result.current[1](false));
    expect(currentSearch).not.toContain('modal=');
  });

  it('fechar pela UI consome a entrada criada ao abrir (sem Voltar "morto")', () => {
    const { result } = renderHook(
      () => ({ modal: useModalParam('batch-qr'), location: useLocation() }),
      { wrapper: wrapper(['/inventory']) }
    );
    const baseKey = result.current.location.key;
    act(() => result.current.modal[1](true));
    expect(result.current.location.key).not.toBe(baseKey);
    act(() => result.current.modal[1](false));
    expect(result.current.location.key).toBe(baseKey);
    expect(currentSearch).not.toContain('modal=');
  });

  it('deep-link é normalizado: entrada sem modal + entrada com modal', () => {
    const { result } = renderHook(
      () => ({ modal: useModalParam('batch-qr'), location: useLocation() }),
      { wrapper: wrapper(['/inventory?modal=batch-qr&items=a,b']) }
    );
    expect(result.current.modal[0]).toBe(true);
    act(() => result.current.modal[1](false));
    expect(result.current.modal[0]).toBe(false);
    expect(currentSearch).toContain('items=a%2Cb');
  });

  it('preserva outros params ao alternar', () => {
    const { result } = renderHook(() => useModalParam('batch-qr'), {
      wrapper: wrapper(['/inventory?q=tinta']),
    });
    act(() => result.current[1](true));
    expect(currentSearch).toContain('q=tinta');
    expect(currentSearch).toContain('modal=batch-qr');
    act(() => result.current[1](false));
    expect(currentSearch).toContain('q=tinta');
  });
});
