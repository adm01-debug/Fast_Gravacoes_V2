/* eslint-disable react-hooks/exhaustive-deps --
   Dependências intencionalmente omitidas: incluí-las causaria loops
   infinitos, invalidação excessiva de cache ou recomputação em cada
   render. Callbacks/valores externos são estáveis por contrato. */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { subDays, isAfter, parseISO } from 'date-fns';
import { useMemo } from 'react';
import { useAuth } from '@/features/auth';

type DbInventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type DbInventoryMovement = Database['public']['Tables']['inventory_movements']['Row'];

export type InventoryCategory = 'ink' | 'screen' | 'solvent' | 'consumable' | 'other' | string;

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  current_stock: number;
  unit: string;
  min_stock_level: number;
  location: string | null;
  specification: string | null;
  price_per_unit: number;
  created_at: string;
  updated_at: string;
  daily_usage_avg?: number;
  days_of_supply?: number;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  user_id: string | null;
  type: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';
  quantity: number;
  reason: string | null;
  from_location: string | null;
  to_location: string | null;
  job_id: string | null;
  created_at: string;
}

export function useInventory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user?.id);

  const itemsQuery = useQuery({
    queryKey: ['inventory-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: isAuthenticated,
  });

  const calculateAIIntelligence = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-inventory-intelligence');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast.success('IA Recalibrada');
    },
    onError: (error: unknown) => {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao recalibrar IA');
    },
  });

  const movementsQuery = useInventoryMovements();
  const movements = movementsQuery.data || [];

  const stats = useMemo(() => {
    const now = new Date();
    const last24h = subDays(now, 1);
    const recentMovements = movements.filter(m => m.created_at && isAfter(parseISO(m.created_at), last24h));
    const totalValue = (itemsQuery.data || []).reduce((sum, item) => sum + (item.current_stock * (item.price_per_unit || 0)), 0);
    return { movementsCount24h: recentMovements.length, inventoryValue: totalValue };
  }, [movements, itemsQuery.data]);

  const createMovementMutation = useMutation({
    mutationFn: async (movement: Omit<InventoryMovement, 'id' | 'created_at' | 'user_id'>) => {
      // Validação de segurança: estoque insuficiente
      if (movement.type === 'OUT') {
        const { data: item, error: itemError } = await supabase
          .from('inventory_items')
          .select('current_stock, name')
          .eq('id', movement.item_id)
          .single();
        
        if (itemError) throw itemError;
        if (item.current_stock < movement.quantity) {
          throw new Error(`Estoque insuficiente de ${item.name} para realizar esta saída.`);
        }
      }

      if (!user?.id) throw new Error('Sessão expirada. Faça login novamente.');

      const { data, error } = await supabase
        .from('inventory_movements')
        .insert([{ ...movement, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Movimentação registrada');
    },
    onError: (error: unknown) => {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao registrar movimentação');
    },
  });

  const deleteMovementMutation = useMutation({
    mutationFn: async (movementId: string) => {
      const { error } = await supabase
        .from('inventory_movements')
        .delete()
        .eq('id', movementId);
      if (error) throw error;
      return movementId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Movimentação desfeita');
    },
    onError: (error: unknown) => {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao desfazer movimentação');
    },
  });

  const transferItemsMutation = useMutation({
    mutationFn: async ({ fromLocation, toLocation, itemIds }: { fromLocation: string, toLocation: string, itemIds: string[] }) => {
      if (!user?.id) throw new Error('Sessão expirada. Faça login novamente.');
      if (itemIds.length === 0) return [];

      // Bulk UPDATE: single query instead of N individual updates
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ location: toLocation })
        .in('id', itemIds);
      if (updateError) throw updateError;

      // Bulk INSERT: single query instead of N individual inserts
      const movements = itemIds.map(itemId => ({
        item_id: itemId,
        user_id: user.id,
        type: 'TRANSFER' as const,
        quantity: 0,
        from_location: fromLocation,
        to_location: toLocation,
        reason: `Transferência de ${fromLocation} para ${toLocation}`,
      }));
      const { error: movError } = await supabase.from('inventory_movements').insert(movements);
      if (movError) throw movError;

      return itemIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Transferência concluída');
    },
    onError: (error: unknown) => {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao transferir itens');
    },
  });

  return {
    items: itemsQuery.data || [],
    isLoading: itemsQuery.isLoading,
    recordMovement: createMovementMutation.mutateAsync,
    deleteMovement: deleteMovementMutation.mutateAsync,
    transferItems: transferItemsMutation.mutateAsync,
    isTransferring: transferItemsMutation.isPending,
    calculateAI: calculateAIIntelligence.mutate,
    isCalculatingAI: calculateAIIntelligence.isPending,
    stats,
  };
}

export function useInventoryMovements(itemId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['inventory-movements', itemId],
    queryFn: async () => {
      let query = supabase
        .from('inventory_movements')
        .select('*, profiles:user_id (full_name), inventory_items:item_id (name)')
        .order('created_at', { ascending: false });
      
      if (itemId) {
        query = query.eq('item_id', itemId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user?.id),
  });
}
