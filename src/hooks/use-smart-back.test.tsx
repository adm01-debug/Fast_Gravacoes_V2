import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { useSmartBack } from './use-smart-back';

function makeWrapper(initialEntries: string[], initialIndex = 0) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        {children}
        <LocationProbe />
      </MemoryRouter>
    );
  };
}

let currentPath = '';
function LocationProbe() {
  const location = useLocation();
  useEffect(() => {
    currentPath = location.pathname;
  }, [location.pathname]);
  return null;
}

describe('useSmartBack', () => {
  it('reporta canGoBack=false em deep-link (primeira entrada "default")', () => {
    const { result } = renderHook(() => useSmartBack(), {
      wrapper: makeWrapper(['/jobs']),
    });
    expect(result.current.canGoBack).toBe(false);
  });

  it('vai para o fallback quando não há entrada interna', () => {
    const { result } = renderHook(() => useSmartBack(), {
      wrapper: makeWrapper(['/jobs']),
    });
    act(() => result.current.goBack());
    expect(currentPath).toBe('/');
  });

  it('usa fallbackTo customizado quando não há entrada interna', () => {
    const { result } = renderHook(() => useSmartBack('/kanban'), {
      wrapper: makeWrapper(['/jobs/123']),
    });
    act(() => result.current.goBack());
    expect(currentPath).toBe('/kanban');
  });

  it('volta uma entrada do histórico quando há entrada interna', () => {
    const { result } = renderHook(() => useSmartBack(), {
      wrapper: makeWrapper(['/jobs', '/jobs/123'], 1),
    });
    expect(result.current.canGoBack).toBe(true);
    act(() => result.current.goBack());
    expect(currentPath).toBe('/jobs');
  });
});
