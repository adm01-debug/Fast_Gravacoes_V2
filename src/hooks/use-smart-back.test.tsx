import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { useSmartBack } from './use-smart-back';
import { recordLocation, resetNavHistory } from '@/lib/navHistory';

// Espelha o tracker montado em AnimatedRoutes — sem ele internalDepth()
// não conhece as entradas do MemoryRouter.
function HistoryTracker() {
  const location = useLocation();
  const navType = useNavigationType();
  useEffect(() => {
    recordLocation(navType, location.key);
  }, [navType, location.key]);
  return null;
}

function makeWrapper(initialEntries: string[], initialIndex = 0) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        <HistoryTracker />
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
  beforeEach(() => resetNavHistory());

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
    const { result } = renderHook(
      () => ({ back: useSmartBack(), navigate: useNavigate() }),
      { wrapper: makeWrapper(['/jobs']) }
    );
    // Navega de verdade para o tracker registrar a entrada interna
    act(() => result.current.navigate('/jobs/123'));
    expect(result.current.back.canGoBack).toBe(true);
    act(() => result.current.back.goBack());
    expect(currentPath).toBe('/jobs');
  });
});
