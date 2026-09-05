import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

export type Technique = Database['public']['Tables']['techniques']['Row'];
export type TechniqueInsert = Database['public']['Tables']['techniques']['Insert'];
export type TechniqueUpdate = Database['public']['Tables']['techniques']['Update'];

export const techniquesService = {
  async getAll(): Promise<Technique[]> {
    const { data, error } = await supabase
      .from('techniques')
      .select('*')
      .order('name');

    if (error) {
      // Throw instead of swallowing: a connectivity/RLS failure must not be
      // indistinguishable from "no techniques" (see jobsService.getAll).
      logger.error('Failed to fetch techniques', error, 'techniquesService');
      throw error;
    }
    return data || [];
  },

  async getById(id: string): Promise<Technique> {
    const { data, error } = await supabase
      .from('techniques')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(technique: TechniqueInsert): Promise<Technique> {
    const { data, error } = await supabase
      .from('techniques')
      .insert(technique)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: TechniqueUpdate): Promise<Technique> {
    const { data, error } = await supabase
      .from('techniques')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('techniques')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
