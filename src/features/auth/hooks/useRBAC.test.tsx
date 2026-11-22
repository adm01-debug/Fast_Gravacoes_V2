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

import { useAuth, ROLE_PERMISSIONS } from '../index';

describe('useRBAC - permissÃƒÆ’Ã‚Âµes do banco (F-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa permissÃƒÆ’Ã‚Âµes do banco como fonte primÃƒÆ’Ã‚Â¡ria de autorizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth());
    mockSupabaseResult([{ permission: 'jobs:create' }, { permission: 'inventory:read' }]);

    const { result } = renderHook(() => useRBAC());

    await waitFor(() => {
      expect(result.current.permissions).toContain('jobs:create');
    });
    expect(result.current.hasPermission('jobs:create')).toBe(true);
    expect(result.current.hasPermission('jobs:delete')).toBe(false);
  });

  it('faz fallback para o mapa estÃƒÆ’Ã‚Â¡tico quando a consulta falha', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth());
    mockSupabaseResult(null, new Error('network'));

    const { result } = renderHook(() => useRBAC());

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalled();
    });
    // operator tem 'jobs:read' no mapa estÃƒÆ’Ã‚Â¡tico
    expect(result.current.hasPermission('jobs:read')).toBe(true);
  });

  it('recurso:all cobre permissÃƒÆ’Ã‚Âµes com dois-pontos e com ponto', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ ...mockUseAuth(), role: 'manager' });
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