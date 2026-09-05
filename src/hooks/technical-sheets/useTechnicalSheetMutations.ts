import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createAppError } from '@/lib/errorHandling';
import { TechnicalSheet, TechnicalSheetStep } from './technicalSheetsTypes';

export const useTechnicalSheetMutations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createSheet = useMutation({
    mutationFn: async (sheet: Partial<TechnicalSheet> & { technique_id: string; title: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('technical_sheets')
        .insert([{
          technique_id: sheet.technique_id,
          title: sheet.title,
          description: sheet.description || null,
          product_category_id: sheet.product_category_id || null,
          material_id: sheet.material_id || null,
          estimated_time_minutes: sheet.estimated_time_minutes || null,
          recommended_machine_id: sheet.recommended_machine_id || null,
          machine_settings: sheet.machine_settings || {},
          settings_ranges: sheet.settings_ranges || {},
          ink_specifications: sheet.ink_specifications || null,
          tooling_specifications: sheet.tooling_specifications || null,
          gap_specifications: sheet.gap_specifications || null,
          challenges_notes: sheet.challenges_notes || null,
          failure_scenarios: sheet.failure_scenarios || null,
          quality_requirements: sheet.quality_requirements || null,
          version: 1,
          created_by: userData.user?.id,
          updated_by: userData.user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheets'] });
      toast({ title: 'Ficha técnica criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar ficha', description: createAppError(error).message, variant: 'destructive' });
    }
  });

  const updateSheet = useMutation({
    mutationFn: async ({ id, techniques, machines, product_categories, materials, ...sheet }: Partial<TechnicalSheet> & { id: string }) => {
      // Strip joined relations — not columns on `technical_sheets`.
      void techniques; void machines; void product_categories; void materials;
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('technical_sheets')
        .update({ ...sheet, updated_by: userData.user?.id })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['technical-sheet'] });
      toast({ title: 'Ficha técnica atualizada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: createAppError(error).message, variant: 'destructive' });
    }
  });

  const deleteSheet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('technical_sheets')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheets'] });
      toast({ title: 'Ficha técnica removida!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover', description: createAppError(error).message, variant: 'destructive' });
    }
  });

  const addStep = useMutation({
    mutationFn: async (step: { technical_sheet_id: string; step_number: number; title: string; description: string; tips?: string; warnings?: string }) => {
      const { data, error } = await supabase
        .from('technical_sheet_steps')
        .insert([{
          technical_sheet_id: step.technical_sheet_id,
          step_number: step.step_number,
          title: step.title,
          description: step.description,
          tips: step.tips || null,
          warnings: step.warnings || null
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-steps', variables.technical_sheet_id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar etapa', description: createAppError(error).message, variant: 'destructive' });
    }
  });

  const updateStep = useMutation({
    mutationFn: async ({ id, image_url, ...step }: Partial<TechnicalSheetStep> & { id: string }) => {
      // `image_url` is not a column on `technical_sheet_steps`.
      void image_url;
      const { error } = await supabase
        .from('technical_sheet_steps')
        .update(step)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-steps'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar etapa', description: createAppError(error).message, variant: 'destructive' });
    }
  });

  const deleteStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('technical_sheet_steps')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-steps'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover etapa', description: createAppError(error).message, variant: 'destructive' });
    }
  });

  const addMaterial = useMutation({
    mutationFn: async (material: { technical_sheet_id: string; name: string; specification?: string; quantity?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('technical_sheet_materials')
        .insert([{
          technical_sheet_id: material.technical_sheet_id,
          name: material.name,
          specification: material.specification || null,
          quantity: material.quantity || null,
          notes: material.notes || null
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-materials', variables.technical_sheet_id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar material', description: createAppError(error).message, variant: 'destructive' });
    }
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('technical_sheet_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-materials'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover material', description: createAppError(error).message, variant: 'destructive' });
    }
  });

  const addTip = useMutation({
    mutationFn: async (tip: { technical_sheet_id: string; tip_type: 'tip' | 'warning' | 'important'; content: string }) => {
      const { data, error } = await supabase
        .from('technical_sheet_tips')
        .insert([{
          technical_sheet_id: tip.technical_sheet_id,
          tip_type: tip.tip_type,
          content: tip.content
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-tips', variables.technical_sheet_id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar dica', description: createAppError(error).message, variant: 'destructive' });
    }
  });

  const deleteTip = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('technical_sheet_tips')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-tips'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover dica', description: createAppError(error).message, variant: 'destructive' });
    }
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ sheetId, isFavorite }: { sheetId: string; isFavorite: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      if (isFavorite) {
        const { error } = await supabase
          .from('technical_sheet_favorites')
          .delete()
          .eq('user_id', userData.user.id)
          .eq('technical_sheet_id', sheetId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('technical_sheet_favorites')
          .insert([{ user_id: userData.user.id, technical_sheet_id: sheetId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technical-sheet-favorites'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar favorito', description: createAppError(error).message, variant: 'destructive' });
    }
  });

  return {
    createSheet,
    updateSheet,
    deleteSheet,
    addStep,
    updateStep,
    deleteStep,
    addMaterial,
    deleteMaterial,
    addTip,
    deleteTip,
    toggleFavorite
  };
};
