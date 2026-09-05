import { useCallback, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessConfig } from '@/features/admin';
import { toast } from 'sonner';

export interface BufferPromotionResult {
  techniqueId: string;
  techniqueName: string;
  promotedJobs: string[];
  promotedCount: number;
}

export function useAutoBufferPromotion(options?: { showToasts?: boolean }) {
  const { showToasts = true } = options || {};
  const queryClient = useQueryClient();
  const { getConfig } = useBusinessConfig();
  
  const bufferTarget = useMemo(() => {
    const val = getConfig('buffer_size', 3);
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }, [getConfig]);

  const promotionMutation = useMutation({
    mutationFn: async (techniqueId?: string) => {
      const { data, error } = await supabase.functions.invoke('auto-promote-jobs', {
        body: { techniqueId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.promoted?.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
        if (showToasts) {
          const totalPromoted = data.promoted.reduce((sum: number, r: { count: number }) => sum + r.count, 0);
          toast.success(`${totalPromoted} job(s) promovido(s) automaticamente`, {
            description: 'O buffer de produção foi reabastecido pelo servidor.',
          });
        }
      } else if (showToasts && data?.success) {
        toast.info('Buffer já está saudável', {
          description: 'Nenhum job precisou ser promovido neste momento.'
        });
      }
    },
    onError: () => {
      if (showToasts) {
        toast.error('Falha ao acionar promoção automática');
      }
    }
  });

  const triggerPromotion = useCallback(async () => {
    return promotionMutation.mutateAsync(undefined);
  }, [promotionMutation]);

  const promoteForTechnique = useCallback(async (techniqueId: string) => {
    return promotionMutation.mutateAsync(techniqueId);
  }, [promotionMutation]);

  return {
    triggerPromotion,
    promoteForTechnique,
    isPromoting: promotionMutation.isPending,
    bufferTarget,
  };
}
