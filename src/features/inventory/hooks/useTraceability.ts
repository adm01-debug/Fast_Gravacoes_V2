import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';

export interface ProductionLot {
  id: string;
  lot_number: string;
  job_id: string | null;
  product_name: string;
  quantity: number;
  produced_quantity: number;
  status: string;
  production_date: string;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  job?: {
    order_number: string;
    client: string;
    product: string;
  };
}

export interface LotComponent {
  id: string;
  lot_id: string;
  component_lot_id: string | null;
  material_id: string | null;
  component_name: string;
  quantity_used: number;
  unit: string | null;
  supplier: string | null;
  batch_number: string | null;
  notes: string | null;
  created_at: string;
  component_lot?: ProductionLot | null;
}

export interface LotMovement {
  id: string;
  lot_id: string;
  movement_type: string;
  quantity: number;
  from_location: string | null;
  to_location: string | null;
  job_id: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  reason: string | null;
  created_at: string;
}

export interface LotQualityInspection {
  id: string;
  lot_id: string;
  inspection_type: string;
  result: string;
  inspector_id: string | null;
  inspector_name: string | null;
  sample_size: number | null;
  defects_found: number;
  notes: string | null;
  photos: string[];
  inspected_at: string;
  created_at: string;
}

export function useProductionLots() {
  return useQuery({
    queryKey: ['production-lots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('production_lots')
        .select(`
          *,
          job:jobs(order_number, client, product)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProductionLot[];
    }
  });
}

export function useProductionLot(lotId: string | null) {
  return useQuery({
    queryKey: ['production-lot', lotId],
    queryFn: async () => {
      if (!lotId) return null;
      const { data, error } = await supabase
        .from('production_lots')
        .select(`
          *,
          job:jobs(order_number, client, product)
        `)
        .eq('id', lotId)
        .maybeSingle();
      if (error) throw error;
      return data as ProductionLot | null;
    },
    enabled: !!lotId
  });
}

export function useLotComponents(lotId: string | null) {
  return useQuery({
    queryKey: ['lot-components', lotId],
    queryFn: async () => {
      if (!lotId) return [];
      const { data, error } = await supabase
        .from('lot_components')
        .select('*')
        .eq('lot_id', lotId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as LotComponent[];
    },
    enabled: !!lotId
  });
}

export function useLotMovements(lotId: string | null) {
  return useQuery({
    queryKey: ['lot-movements', lotId],
    queryFn: async () => {
      if (!lotId) return [];
      const { data, error } = await supabase
        .from('lot_movements')
        .select('*')
        .eq('lot_id', lotId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LotMovement[];
    },
    enabled: !!lotId
  });
}

export function useLotInspections(lotId: string | null) {
  return useQuery({
    queryKey: ['lot-inspections', lotId],
    queryFn: async () => {
      if (!lotId) return [];
      const { data, error } = await supabase
        .from('lot_quality_inspections')
        .select('*')
        .eq('lot_id', lotId)
        .order('inspected_at', { ascending: false });
      if (error) throw error;
      return data as LotQualityInspection[];
    },
    enabled: !!lotId
  });
}

export function useLotGenealogy(lotId: string | null) {
  return useQuery({
    queryKey: ['lot-genealogy', lotId],
    queryFn: async () => {
      if (!lotId) return { parents: [], children: [] };

      // Get components (parents)
      const { data: components, error: compError } = await supabase
        .from('lot_components')
        .select(`
          *,
          component_lot:production_lots!lot_components_component_lot_id_fkey(*)
        `)
        .eq('lot_id', lotId);

      if (compError) throw compError;

      // Get where this lot is used as component (children)
      const { data: usedIn, error: usedError } = await supabase
        .from('lot_components')
        .select(`
          *,
          lot:production_lots!lot_components_lot_id_fkey(*)
        `)
        .eq('component_lot_id', lotId);

      if (usedError) throw usedError;

      return {
        parents: components || [],
        children: usedIn || []
      };
    },
    enabled: !!lotId
  });
}

export function useTraceabilityMutations() {
  const queryClient = useQueryClient();

  const createLot = useMutation({
    mutationFn: async (data: {
      lot_number: string;
      product_name: string;
      quantity: number;
      job_id?: string;
      production_date?: string;
      expiration_date?: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('production_lots')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-lots'] });
      toast.success('Lote criado com sucesso');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao criar lote');
    }
  });

  const updateLot = useMutation({
    mutationFn: async ({ id, job, ...data }: Partial<ProductionLot> & { id: string }) => {
      // `job` is a joined relation, not a column on `production_lots`.
      void job;
      const { error } = await supabase
        .from('production_lots')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-lots'] });
      toast.success('Lote atualizado');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao atualizar lote');
    }
  });

  const addComponent = useMutation({
    mutationFn: async (data: {
      lot_id: string;
      component_name: string;
      quantity_used: number;
      unit?: string;
      component_lot_id?: string;
      material_id?: string;
      supplier?: string;
      batch_number?: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('lot_components')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lot-components', variables.lot_id] });
      queryClient.invalidateQueries({ queryKey: ['lot-genealogy'] });
      toast.success('Componente adicionado');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao adicionar componente');
    }
  });

  const addMovement = useMutation({
    mutationFn: async (data: {
      lot_id: string;
      movement_type: string;
      quantity: number;
      from_location?: string;
      to_location?: string;
      job_id?: string;
      performed_by_name?: string;
      reason?: string;
    }) => {
      const { error } = await supabase
        .from('lot_movements')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lot-movements', variables.lot_id] });
      toast.success('Movimentação registrada');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao registrar movimentação');
    }
  });

  const addInspection = useMutation({
    mutationFn: async (data: {
      lot_id: string;
      inspection_type: string;
      result: string;
      inspector_name?: string;
      sample_size?: number;
      defects_found?: number;
      notes?: string;
      photos?: string[];
    }) => {
      const { error } = await supabase
        .from('lot_quality_inspections')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lot-inspections', variables.lot_id] });
      toast.success('Inspeção registrada');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao registrar inspeção');
    }
  });

  return {
    createLot,
    updateLot,
    addComponent,
    addMovement,
    addInspection
  };
}

export function useSearchLots(searchTerm: string) {
  const term = searchTerm.trim();
  // Quote values with PostgREST structural chars (, ( ) ") to prevent filter injection
  // while preserving legitimate characters (e.g. lot numbers like "LT-001/A").
  const ilikePat = `%${term}%`;
  const needsQuote = /[,"().:]/.test(term);
  const quotedTerm = needsQuote ? `"${ilikePat.replace(/"/g, '""')}"` : ilikePat;

  return useQuery({
    queryKey: ['search-lots', term],
    queryFn: async () => {
      if (!term || term.length < 2) return [];
      const { data, error } = await supabase
        .from('production_lots')
        .select('id, lot_number, product_name, status')
        .or(`lot_number.ilike.${quotedTerm},product_name.ilike.${quotedTerm}`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: term.length >= 2
  });
}
