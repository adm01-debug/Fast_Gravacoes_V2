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

  it('banco autoritativo: permissao presente no mapa estatico mas ausente no banco e negada (revogacao F-007)', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth());
    // operator tem 'jobs:read' e 'machines:read' no mapa estático, mas o banco
    // revogou (nao retorna). A uniao antiga reconcederia; o banco-autoritativo nega.
    mockSupabaseResult([{ permission: 'jobs:read' }]);

    const { result } = renderHook(() => useRBAC());

    await waitFor(() => {
      expect(result.current.permissions).toEqual(['jobs:read']);
    });
    expect(result.current.hasPermission('jobs:read')).toBe(true);
    expect(result.current.hasPermission('machines:read')).toBe(false);
    expect(result.current.hasPermission('quality:read')).toBe(false);
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

describe('useRBAC - fetch condicional (F-007 threads rodada 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enabled:false pula a consulta ao banco e usa o mapa estatico', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth());
    // Operator tem jobs:read no mapa estatico; sem a chamada ao banco, o
    // fallback estatico resolve na hora (isPermissionLoading=false e fechado).
    const { result } = renderHook(() => useRBAC({ enabled: false }));

    expect(result.current.hasPermission('jobs:read')).toBe(true);
    expect(result.current.hasPermission('jobs:create')).toBe(false);
    expect(result.current.isPermissionLoading).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('isPermissionLoading fica true enquanto o banco nao responde e false ao resolver', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockUseAuth());
    let resolveFetch: (v: unknown) => void = () => {};
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const chainMock = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue(pending),
    };
    (mockFrom as ReturnType<typeof vi.fn>).mockReturnValue(chainMock as never);

    const { result } = renderHook(() => useRBAC());

    await waitFor(() => {
      expect(result.current.isPermissionLoading).toBe(true);
    });
    resolveFetch({ data: [{ permission: 'jobs:read' }], error: null });
    await waitFor(() => {
      expect(result.current.isPermissionLoading).toBe(false);
    });
    expect(result.current.hasPermission('jobs:read')).toBe(true);
  });

  it('admin nao consulta o banco e isPermissionLoading fica false (bypass implicito)', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ ...mockUseAuth(), role: 'admin', isAdmin: true });

    const { result } = renderHook(() => useRBAC());

    await waitFor(() => {
      expect(result.current.isPermissionLoading).toBe(false);
    });
    expect(result.current.hasPermission('any:thing')).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});


describe('catalogo deriva do mapa real (fonte unica F-007)', () => {
  it('AVAILABLE_PERMISSIONS e a uniao exata de ROLE_PERMISSIONS (sem vocab divergente)', async () => {
    const { ROLE_PERMISSIONS, AVAILABLE_PERMISSIONS } = await import('../permissions');
    const expected = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));
    const actual = AVAILABLE_PERMISSIONS.map((p) => p.permission);
    // Mesmo conjunto, mesmo tamanho (nenhuma permissão órfã nem inventada).
    expect(actual.sort()).toEqual(expected.sort());
    // Vocabulário legado que divergia do runtime (view/edit/manage/register) não pode existir.
    expect(actual).not.toContain('jobs:view');
    expect(actual).not.toContain('jobs:edit');
    expect(actual).not.toContain('production:view');
    expect(actual).not.toContain('operators:manage');
    expect(actual).not.toContain('settings:manage');
  });
});