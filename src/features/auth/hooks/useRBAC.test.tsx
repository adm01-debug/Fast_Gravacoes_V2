import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useRBAC } from './useRBAC';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

function mockSupabaseResult(data: Array<{ permission: string }> | string[] | null, error: unknown = null) {
  const chainMock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data, error }),
  };
  mockFrom.mockReturnValue(chainMock as never);
}

function mockUseAuth(overrides: Record<string, unknown> = {}) {
  return {
    role: 'operator' as const,
    isCoordinator: false,
    isManager: false,
    isOperator: true,
    isAdmin: false,
    isLoading: false,
    ...overrides,
  };
}

vi.mock('../index', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

import { useAuth } from '../index';

describe('useRBAC - permissoes do banco (F-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa permissoes do banco como fonte primaria', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth());
    // 'jobs:create' nao existe no mapa estatico do operator: prova que veio do banco.
    mockSupabaseResult([{ permission: 'jobs:create' }, { permission: 'inventory:read' }]);

    const { result } = renderHook(() => useRBAC());

    await waitFor(() => {
      expect(result.current.permissions).toContain('jobs:create');
    });
    expect(result.current.hasPermission('jobs:create')).toBe(true);
    expect(result.current.hasPermission('jobs:delete')).toBe(false);
  });

  it('faz fallback para o mapa estatico quando a consulta falha', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth());
    mockSupabaseResult(null, new Error('network'));

    const { result } = renderHook(() => useRBAC());

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalled();
    });
    // Operator tem jobs:read estatico; jobs:create e exclusivo do banco e deve sumir no fallback.
    expect(result.current.hasPermission('jobs:read')).toBe(true);
    expect(result.current.hasPermission('jobs:create')).toBe(false);
  });

  it('recurso:all cobre permissoes com dois-pontos e com ponto', async () => {
    // Operator NAO tem inventory:adjust no mapa estatico: prova que resource:all concede.
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth());
    mockSupabaseResult([{ permission: 'inventory:all' }]);

    const { result } = renderHook(() => useRBAC());

    await waitFor(() => {
      expect(result.current.permissions).toContain('inventory:all');
    });
    expect(result.current.hasPermission('inventory:adjust')).toBe(true);
    expect(result.current.hasPermission('inventory.adjust')).toBe(true);
  });

  it('admin tem acesso total independente do banco', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ ...mockUseAuth(), role: 'admin', isAdmin: true });
    mockSupabaseResult([]);

    const { result } = renderHook(() => useRBAC());

    await waitFor(() => {
      expect(result.current.hasPermission('anything:any')).toBe(true);
    });
  });
});