import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';

export type SkillLevel = 'basic' | 'advanced' | 'expert';

export interface OperatorSkill {
  id: string;
  operator_id: string;
  technique_id: string;
  skill_level: SkillLevel;
  certified_at: string | null;
  expires_at: string | null;
}

export function useOperatorSkills(operatorId?: string) {
  const queryClient = useQueryClient();

  const { data: skills, isLoading } = useQuery({
    queryKey: ['operator-skills', operatorId],
    queryFn: async () => {
      let query = supabase.from('operator_skills').select('*');
      if (operatorId) {
        query = query.eq('operator_id', operatorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OperatorSkill[];
    },
  });

  const upsertSkillMutation = useMutation({
    mutationFn: async (skill: Omit<OperatorSkill, 'id'>) => {
      const { data, error } = await supabase
        .from('operator_skills')
        .upsert({
          operator_id: skill.operator_id,
          technique_id: skill.technique_id,
          skill_level: skill.skill_level,
          certified_at: skill.certified_at,
          expires_at: skill.expires_at,
        }, {
          onConflict: 'operator_id,technique_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-skills'] });
      toast.success('Competência atualizada com sucesso');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao atualizar competência');
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('operator_skills')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operator-skills'] });
      toast.success('Competência removida');
    },
    onError: (error: Error) => {
      showErrorToast(error, 'Erro ao remover competência');
    },
  });

  return {
    skills,
    isLoading,
    upsertSkill: upsertSkillMutation.mutate,
    isUpserting: upsertSkillMutation.isPending,
    deleteSkill: deleteSkillMutation.mutate,
    isDeleting: deleteSkillMutation.isPending,
  };
}
