import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeChannel } from '@/lib/realtimeChannel';
import { createAppError } from '@/lib/errorHandling';
import { defaultQueryOptions, STALE_TIMES } from '@/lib/queryConfig';
import {
  TechnicalSheet,
  TechnicalSheetStep,
  TechnicalSheetMaterial,
  TechnicalSheetTip,
  ProductCategory,
  Material,
  SHEETS_ERROR_CONTEXT,
} from './technicalSheetsTypes';

export const useTechnicalSheets = () => {
  const queryClient = useQueryClient();

  const sheetsQuery = useQuery({
    queryKey: ['technical-sheets'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('technical_sheets')
          .select(`
            *,
            techniques (id, name, color, short_name),
            product_categories (id, name),
            materials (id, name),
            machines (id, name, code)
          `)
          .eq('is_active', true)
          .order('technique_id', { ascending: true });

        if (error) throw error;
        return data as unknown as TechnicalSheet[];
      } catch (error) {
        const appError = createAppError(error, SHEETS_ERROR_CONTEXT.sheets);
        throw appError;
      }
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  useRealtimeChannel('technical-sheets-changes', [{ table: 'technical_sheets' }], () => {
    queryClient.invalidateQueries({ queryKey: ['technical-sheets'] });
  });

  const categoriesQuery = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('product_categories')
          .select('*')
          .order('name');

        if (error) throw error;
        return data as ProductCategory[];
      } catch (error) {
        const appError = createAppError(error, SHEETS_ERROR_CONTEXT.categories);
        throw appError;
      }
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  const materialsQuery = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('materials')
          .select('*')
          .order('name');

        if (error) throw error;
        return data as Material[];
      } catch (error) {
        const appError = createAppError(error, SHEETS_ERROR_CONTEXT.materials);
        throw appError;
      }
    },
    staleTime: STALE_TIMES.STATIC,
    ...defaultQueryOptions,
  });

  return {
    sheets: sheetsQuery.data || [],
    isLoadingSheets: sheetsQuery.isLoading,
    categories: categoriesQuery.data || [],
    materials: materialsQuery.data || [],
    refetchSheets: sheetsQuery.refetch
  };
};

export const useTechnicalSheetDetails = (sheetId: string | null) => {
  const sheetQuery = useQuery({
    queryKey: ['technical-sheet', sheetId],
    queryFn: async () => {
      if (!sheetId) return null;
      try {
        const { data, error } = await supabase
          .from('technical_sheets')
          .select(`
            *,
            techniques (id, name, color, short_name),
            product_categories (id, name),
            materials (id, name),
            machines (id, name, code)
          `)
          .eq('id', sheetId)
          .maybeSingle();

        if (error) throw error;
        if (!data) return null;
        return data as unknown as TechnicalSheet;
      } catch (error) {
        const appError = createAppError(error, SHEETS_ERROR_CONTEXT.sheetDetails);
        throw appError;
      }
    },
    enabled: !!sheetId,
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  const stepsQuery = useQuery({
    queryKey: ['technical-sheet-steps', sheetId],
    queryFn: async () => {
      if (!sheetId) return [];
      try {
        const { data, error } = await supabase
          .from('technical_sheet_steps')
          .select('*')
          .eq('technical_sheet_id', sheetId)
          .order('step_number');

        if (error) throw error;
        return data as TechnicalSheetStep[];
      } catch (error) {
        const appError = createAppError(error, SHEETS_ERROR_CONTEXT.steps);
        throw appError;
      }
    },
    enabled: !!sheetId,
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  const materialsQuery = useQuery({
    queryKey: ['technical-sheet-materials', sheetId],
    queryFn: async () => {
      if (!sheetId) return [];
      try {
        const { data, error } = await supabase
          .from('technical_sheet_materials')
          .select('*')
          .eq('technical_sheet_id', sheetId);

        if (error) throw error;
        return data as TechnicalSheetMaterial[];
      } catch (error) {
        const appError = createAppError(error, { entity: 'technical_sheet_materials', operation: 'fetch' });
        throw appError;
      }
    },
    enabled: !!sheetId,
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  const tipsQuery = useQuery({
    queryKey: ['technical-sheet-tips', sheetId],
    queryFn: async () => {
      if (!sheetId) return [];
      try {
        const { data, error } = await supabase
          .from('technical_sheet_tips')
          .select('*')
          .eq('technical_sheet_id', sheetId);

        if (error) throw error;
        return data as TechnicalSheetTip[];
      } catch (error) {
        const appError = createAppError(error, SHEETS_ERROR_CONTEXT.tips);
        throw appError;
      }
    },
    enabled: !!sheetId,
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });

  return {
    sheet: sheetQuery.data,
    steps: stepsQuery.data || [],
    sheetMaterials: materialsQuery.data || [],
    tips: tipsQuery.data || [],
    isLoading: sheetQuery.isLoading || stepsQuery.isLoading
  };
};

export const useTechnicalSheetAudit = (sheetId: string | null) => {
  return useQuery({
    queryKey: ['technical-sheet-audit', sheetId],
    queryFn: async () => {
      if (!sheetId) return [];
      const { data, error } = await supabase
        .from('technical_sheet_audit')
        .select(`
          *,
          profiles:user_id (display_name, avatar_url)
        `)
        .eq('technical_sheet_id', sheetId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!sheetId,
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });
};

export const useTechnicalSheetFavorites = () => {
  return useQuery({
    queryKey: ['technical-sheet-favorites'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await supabase
        .from('technical_sheet_favorites')
        .select('technical_sheet_id')
        .eq('user_id', userData.user.id);

      if (error) throw error;
      return data.map(f => f.technical_sheet_id);
    },
    staleTime: STALE_TIMES.DYNAMIC,
    ...defaultQueryOptions,
  });
};
