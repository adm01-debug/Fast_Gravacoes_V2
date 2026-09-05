import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import InventoryPage from './InventoryPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';
import { useInventory } from '@/features/inventory';

// Total mock of dependencies
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-main-layout">{children}</div>,
}));

vi.mock('@/features/inventory', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useInventory: vi.fn(),
    useInventoryMovements: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  };
});

// Mock useRBAC
vi.mock('@/features/auth', () => ({
  useRBAC: () => ({ hasPermission: () => true }),
  PermissionGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock WarehouseMap to avoid complexity
vi.mock('@/components/inventory/WarehouseMap', () => ({
  WarehouseMap: () => <div data-testid="mock-warehouse-map">Map</div>,
}));

// Mock InventoryStats
vi.mock('@/components/inventory/InventoryStats', () => ({
  InventoryStats: () => <div data-testid="mock-inventory-stats">Stats</div>,
}));

// Mock useDebounce para retornar o valor imediatamente nos testes
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (val: any) => val,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
  },
});

describe('InventoryPage - Skeletons e Estabilidade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('deve exibir skeletons enquanto os itens do estoque estão carregando', async () => {
    const mockUseInventory = vi.mocked(useInventory);
    
    mockUseInventory.mockReturnValue({
      items: [],
      isLoading: true,
      recordMovement: vi.fn(),
      deleteMovement: vi.fn(),
      transferItems: vi.fn(),
      isTransferring: false,
      calculateAI: vi.fn(),
      isCalculatingAI: false,
      stats: { movementsCount24h: 0, inventoryValue: 0 },
    } as any);

    render(
      <HelmetProvider>
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <InventoryPage />
          </QueryClientProvider>
        </MemoryRouter>
      </HelmetProvider>
    );

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('deve manter o layout estável durante a transição de carregamento', async () => {
    const mockUseInventory = vi.mocked(useInventory);

    const mockItems = [
      {
        id: '1',
        name: 'Tinta Azul',
        category: 'ink',
        current_stock: 10,
        unit: 'L',
        min_stock_level: 5,
        location: 'A1',
        specification: 'Premium',
        price_per_unit: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];

    mockUseInventory.mockReturnValue({
      items: mockItems,
      isLoading: false,
      recordMovement: vi.fn(),
      deleteMovement: vi.fn(),
      transferItems: vi.fn(),
      isTransferring: false,
      calculateAI: vi.fn(),
      isCalculatingAI: false,
      stats: { movementsCount24h: 2, inventoryValue: 500 },
    } as any);

    render(
      <HelmetProvider>
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <InventoryPage />
          </QueryClientProvider>
        </MemoryRouter>
      </HelmetProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tinta Azul')).toBeDefined();
    });
    
    expect(screen.getByText('10')).toBeDefined();
  });

  it('deve filtrar itens corretamente', async () => {
    const mockUseInventory = vi.mocked(useInventory);
    const mockItems = [
      { id: '1', name: 'Tinta Azul', category: 'ink', current_stock: 10, unit: 'L', min_stock_level: 5 },
      { id: '2', name: 'Solvente X', category: 'solvent', current_stock: 5, unit: 'L', min_stock_level: 2 }
    ];

    mockUseInventory.mockReturnValue({
      items: mockItems,
      isLoading: false,
      stats: { movementsCount24h: 0, inventoryValue: 0 },
    } as any);

    render(
      <HelmetProvider>
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <InventoryPage />
          </QueryClientProvider>
        </MemoryRouter>
      </HelmetProvider>
    );

    const searchInput = screen.getByPlaceholderText(/Buscar material/i);
    fireEvent.change(searchInput, { target: { value: 'Solvente' } });

    await waitFor(() => {
      expect(screen.queryByText('Tinta Azul')).toBeNull();
      expect(screen.getByText('Solvente X')).toBeDefined();
    });
  });
});





